import { describe, expect, it } from 'vitest';
import { evaluate } from '../../src/domain/evaluationEngine.js';
import type {
  DefaultPreference,
  EvaluationContext,
  EvaluationInput,
  GlobalPolicy,
  QuietHours,
  UserPreference,
} from '../../src/domain/types.js';

function moscow(hhmm: string, day = '2026-06-15'): Date {
  return new Date(`${day}T${hhmm}:00+03:00`);
}

function baseContext(overrides: Partial<EvaluationContext> = {}): EvaluationContext {
  return {
    userPreferences: [],
    quietHours: null,
    globalPolicies: [],
    defaults: [],
    ...overrides,
  };
}

function baseInput(overrides: Partial<EvaluationInput> = {}): EvaluationInput {
  return {
    userId: 'user-1',
    notificationType: 'transactional_email',
    channel: 'email',
    region: 'US',
    datetime: moscow('12:00'),
    ...overrides,
  };
}

describe('evaluationEngine: глобальные политики', () => {
  it('Тест 1: политика для (marketing_sms, sms, EU) совпадает с входом -> deny blocked_by_global_policy', () => {
    const policies: GlobalPolicy[] = [{ notificationType: 'marketing_sms', channel: 'sms', region: 'EU' }];
    const input = baseInput({ notificationType: 'marketing_sms', channel: 'sms', region: 'EU' });

    const result = evaluate(input, baseContext({ globalPolicies: policies }));

    expect(result).toEqual({ decision: 'deny', reason: 'blocked_by_global_policy' });
  });

  it('Тест 2: политика для EU, запрос с регионом US -> allow', () => {
    const policies: GlobalPolicy[] = [{ notificationType: 'marketing_sms', channel: 'sms', region: 'EU' }];
    const input = baseInput({ notificationType: 'marketing_sms', channel: 'sms', region: 'US' });

    const result = evaluate(input, baseContext({ globalPolicies: policies, defaults: [], userPreferences: [] }));

    expect(result).toEqual({ decision: 'allow', reason: null });
  });

  it('Тест 3: политика для другого типа уведомления -> allow', () => {
    const policies: GlobalPolicy[] = [{ notificationType: 'marketing_sms', channel: 'sms', region: 'EU' }];
    const input = baseInput({ notificationType: 'marketing_email', channel: 'email', region: 'EU' });

    const result = evaluate(input, baseContext({ globalPolicies: policies }));

    expect(result).toEqual({ decision: 'allow', reason: null });
  });
});

describe('evaluationEngine: индивидуальные настройки пользователя', () => {
  it('Тест 4: пользователь отключил (marketing_email, email) -> deny disabled_by_user', () => {
    const userPreferences: UserPreference[] = [
      { userId: 'user-1', notificationType: 'marketing_email', channel: 'email', enabled: false },
    ];
    const input = baseInput({ notificationType: 'marketing_email', channel: 'email' });

    const result = evaluate(input, baseContext({ userPreferences }));

    expect(result).toEqual({ decision: 'deny', reason: 'disabled_by_user' });
  });

  it('Тест 5: пользователь включил (transactional_email, email) -> allow', () => {
    const userPreferences: UserPreference[] = [
      { userId: 'user-1', notificationType: 'transactional_email', channel: 'email', enabled: true },
    ];
    const input = baseInput({ notificationType: 'transactional_email', channel: 'email' });

    const result = evaluate(input, baseContext({ userPreferences }));

    expect(result).toEqual({ decision: 'allow', reason: null });
  });

  it('Тест 6: нет индивидуальной настройки, дефолт = false -> deny disabled_by_user', () => {
    const defaults: DefaultPreference[] = [{ notificationType: 'marketing_push', channel: 'push', enabled: false }];
    const input = baseInput({ notificationType: 'marketing_push', channel: 'push' });

    const result = evaluate(input, baseContext({ defaults }));

    expect(result).toEqual({ decision: 'deny', reason: 'disabled_by_user' });
  });

  it('Тест 7: нет индивидуальной настройки, дефолт = true -> allow', () => {
    const defaults: DefaultPreference[] = [
      { notificationType: 'transactional_push', channel: 'push', enabled: true },
    ];
    const input = baseInput({ notificationType: 'transactional_push', channel: 'push' });

    const result = evaluate(input, baseContext({ defaults }));

    expect(result).toEqual({ decision: 'allow', reason: null });
  });
});

describe('evaluationEngine: quiet hours', () => {
  const wrappingQuietHours: QuietHours = { start: '22:00', end: '08:00', timezone: 'Europe/Moscow' };

  it('Тест 8: 23:30 Europe/Moscow попадает в 22:00-08:00, marketing_push -> deny quiet_hours', () => {
    const input = baseInput({ notificationType: 'marketing_push', channel: 'push', datetime: moscow('23:30') });

    const result = evaluate(input, baseContext({ quietHours: wrappingQuietHours }));

    expect(result).toEqual({ decision: 'deny', reason: 'quiet_hours' });
  });

  it('Тест 9: тот же момент, но transactional_push -> allow (транзакционные не блокируются)', () => {
    const input = baseInput({
      notificationType: 'transactional_push',
      channel: 'push',
      datetime: moscow('23:30'),
    });

    const result = evaluate(input, baseContext({ quietHours: wrappingQuietHours }));

    expect(result).toEqual({ decision: 'allow', reason: null });
  });

  it('Тест 10: 12:00 Europe/Moscow вне диапазона 22:00-08:00 -> allow', () => {
    const input = baseInput({ notificationType: 'marketing_push', channel: 'push', datetime: moscow('12:00') });

    const result = evaluate(input, baseContext({ quietHours: wrappingQuietHours }));

    expect(result).toEqual({ decision: 'allow', reason: null });
  });

  it('Тест 10b: 03:00 Europe/Moscow (после полуночи) попадает в 22:00-08:00, marketing_push -> deny', () => {
    const input = baseInput({ notificationType: 'marketing_push', channel: 'push', datetime: moscow('03:00') });

    const result = evaluate(input, baseContext({ quietHours: wrappingQuietHours }));

    expect(result).toEqual({ decision: 'deny', reason: 'quiet_hours' });
  });

  it('Тест 10c: ровно 22:00 (нижняя граница окна, включительно) -> deny', () => {
    const input = baseInput({ notificationType: 'marketing_push', channel: 'push', datetime: moscow('22:00') });

    const result = evaluate(input, baseContext({ quietHours: wrappingQuietHours }));

    expect(result).toEqual({ decision: 'deny', reason: 'quiet_hours' });
  });

  it('Тест 10d: ровно 08:00 (верхняя граница окна, включительно) -> deny', () => {
    const input = baseInput({ notificationType: 'marketing_push', channel: 'push', datetime: moscow('08:00') });

    const result = evaluate(input, baseContext({ quietHours: wrappingQuietHours }));

    expect(result).toEqual({ decision: 'deny', reason: 'quiet_hours' });
  });

  it('Тест 11: диапазон без перехода через полночь (13:00-15:00), datetime=14:00 -> deny', () => {
    const quietHours: QuietHours = { start: '13:00', end: '15:00', timezone: 'Europe/Moscow' };
    const input = baseInput({ notificationType: 'marketing_push', channel: 'push', datetime: moscow('14:00') });

    const result = evaluate(input, baseContext({ quietHours }));

    expect(result).toEqual({ decision: 'deny', reason: 'quiet_hours' });
  });

  it('Тест 12: quiet hours не заданы (null), marketing -> allow', () => {
    const input = baseInput({ notificationType: 'marketing_push', channel: 'push' });

    const result = evaluate(input, baseContext({ quietHours: null }));

    expect(result).toEqual({ decision: 'allow', reason: null });
  });
});

describe('evaluationEngine: приоритет правил', () => {
  it('Тест 13: глобальная политика запрещает, пользователь включил -> deny (политика побеждает)', () => {
    const policies: GlobalPolicy[] = [{ notificationType: 'marketing_sms', channel: 'sms', region: 'EU' }];
    const userPreferences: UserPreference[] = [
      { userId: 'user-1', notificationType: 'marketing_sms', channel: 'sms', enabled: true },
    ];
    const input = baseInput({ notificationType: 'marketing_sms', channel: 'sms', region: 'EU' });

    const result = evaluate(input, baseContext({ globalPolicies: policies, userPreferences }));

    expect(result).toEqual({ decision: 'deny', reason: 'blocked_by_global_policy' });
  });

  it('Тест 14: нет политики, пользователь отключил, quiet hours не в диапазоне -> deny disabled_by_user', () => {
    const userPreferences: UserPreference[] = [
      { userId: 'user-1', notificationType: 'marketing_push', channel: 'push', enabled: false },
    ];
    const quietHours: QuietHours = { start: '22:00', end: '08:00', timezone: 'Europe/Moscow' };
    const input = baseInput({
      notificationType: 'marketing_push',
      channel: 'push',
      datetime: moscow('12:00'),
    });

    const result = evaluate(input, baseContext({ userPreferences, quietHours }));

    expect(result).toEqual({ decision: 'deny', reason: 'disabled_by_user' });
  });
});
