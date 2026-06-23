import { beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { resetDb } from './helpers/dbHelper.js';

describe('GET /users/:userId/preferences', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    await resetDb();
    app = buildApp();
  });

  it('Сценарий 1: новый пользователь получает дефолтные настройки', async () => {
    const response = await app.inject({ method: 'GET', url: '/users/new-user-123/preferences' });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.userId).toBe('new-user-123');
    expect(body.preferences).toEqual(
      expect.arrayContaining([
        { notificationType: 'transactional_email', channel: 'email', enabled: true },
        { notificationType: 'marketing_email', channel: 'email', enabled: false },
      ]),
    );
    expect(body.quietHours).toBeNull();
  });

  it('returns 400 when userId is an empty path segment', async () => {
    const response = await app.inject({ method: 'GET', url: '/users//preferences' });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toBe('validation_error');
  });
});

describe('POST /users/:userId/preferences', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    await resetDb();
    app = buildApp();
  });

  it('Сценарий 2: пользователь отключает marketing_email, transactional_email не затронут', async () => {
    const update = await app.inject({
      method: 'POST',
      url: '/users/user-2/preferences',
      payload: { preferences: [{ notificationType: 'marketing_email', channel: 'email', enabled: false }] },
    });

    expect(update.statusCode).toBe(200);
    expect(update.json()).toEqual({ userId: 'user-2', updated: true });

    const view = await app.inject({ method: 'GET', url: '/users/user-2/preferences' });
    const preferences = view.json().preferences;

    expect(preferences).toEqual(
      expect.arrayContaining([
        { notificationType: 'marketing_email', channel: 'email', enabled: false },
        { notificationType: 'transactional_email', channel: 'email', enabled: true },
      ]),
    );
  });

  it('Сценарий 3: quiet hours блокируют marketing_push, но не transactional_push', async () => {
    const setQuietHours = await app.inject({
      method: 'POST',
      url: '/users/user-3/preferences',
      payload: {
        preferences: [{ notificationType: 'marketing_push', channel: 'push', enabled: true }],
        quietHours: { start: '22:00', end: '08:00', timezone: 'Europe/Moscow' },
      },
    });
    expect(setQuietHours.statusCode).toBe(200);

    const view = await app.inject({ method: 'GET', url: '/users/user-3/preferences' });
    expect(view.json().quietHours).toEqual({ start: '22:00', end: '08:00', timezone: 'Europe/Moscow' });

    const insideQuietHours = '2026-06-15T23:30:00+03:00';

    const marketingPush = await app.inject({
      method: 'POST',
      url: '/evaluate',
      payload: {
        userId: 'user-3',
        notificationType: 'marketing_push',
        channel: 'push',
        region: 'US',
        datetime: insideQuietHours,
      },
    });
    expect(marketingPush.json()).toEqual({ decision: 'deny', reason: 'quiet_hours' });

    const transactionalPush = await app.inject({
      method: 'POST',
      url: '/evaluate',
      payload: {
        userId: 'user-3',
        notificationType: 'transactional_push',
        channel: 'push',
        region: 'US',
        datetime: insideQuietHours,
      },
    });
    expect(transactionalPush.json()).toEqual({ decision: 'allow', reason: null });
  });

  it('Сценарий 5: идемпотентность — тройной одинаковый вызов не меняет состояние', async () => {
    const payload = {
      preferences: [{ notificationType: 'marketing_email', channel: 'email', enabled: false }],
    };

    for (let i = 0; i < 3; i += 1) {
      const response = await app.inject({ method: 'POST', url: '/users/user-5/preferences', payload });
      expect(response.statusCode).toBe(200);
    }

    const view = await app.inject({ method: 'GET', url: '/users/user-5/preferences' });
    const matches = view
      .json()
      .preferences.filter(
        (entry: { notificationType: string; channel: string }) =>
          entry.notificationType === 'marketing_email' && entry.channel === 'email',
      );

    expect(matches).toHaveLength(1);
    expect(matches[0]?.enabled).toBe(false);
  });

  it('returns 200 for valid quietHours update', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/users/user-1/preferences',
      payload: { quietHours: { start: '22:00', end: '08:00', timezone: 'Europe/Moscow' } },
    });

    expect(response.statusCode).toBe(200);
  });

  it('returns 400 for empty body', async () => {
    const response = await app.inject({ method: 'POST', url: '/users/user-1/preferences', payload: {} });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toBe('validation_error');
  });

  it('returns 400 for invalid notificationType', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/users/user-1/preferences',
      payload: { preferences: [{ notificationType: 'not_a_type', channel: 'email', enabled: true }] },
    });

    expect(response.statusCode).toBe(400);
  });

  it('returns 400 when a preference entry has a channel inconsistent with its type', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/users/user-1/preferences',
      payload: { preferences: [{ notificationType: 'marketing_email', channel: 'push', enabled: true }] },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toBe('validation_error');
  });

  it('returns 400 for malformed quietHours time format', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/users/user-1/preferences',
      payload: { quietHours: { start: '22:00', end: '8am', timezone: 'Europe/Moscow' } },
    });

    expect(response.statusCode).toBe(400);
  });

  it('returns 400 for unknown timezone', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/users/user-1/preferences',
      payload: { quietHours: { start: '22:00', end: '08:00', timezone: 'Europe/Moscov' } },
    });

    expect(response.statusCode).toBe(400);
  });
});
