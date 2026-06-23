import { CATEGORY_BY_TYPE } from './types.js';
import type { EvaluationContext, EvaluationInput, EvaluationResult } from './types.js';

function toLocalTime(date: Date, timezone: string): string {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });

  return formatter.format(date);
}

function isWithinQuietHours(time: string, start: string, end: string): boolean {
  if (start <= end) {
    return time >= start && time <= end;
  }

  return time >= start || time <= end;
}

export function evaluate(input: EvaluationInput, context: EvaluationContext): EvaluationResult {
  const blockedByGlobalPolicy = context.globalPolicies.some(
    (policy) =>
      policy.notificationType === input.notificationType &&
      policy.channel === input.channel &&
      policy.region === input.region,
  );

  if (blockedByGlobalPolicy) {
    return { decision: 'deny', reason: 'blocked_by_global_policy' };
  }

  const userPreference = context.userPreferences.find(
    (preference) =>
      preference.userId === input.userId &&
      preference.notificationType === input.notificationType &&
      preference.channel === input.channel,
  );

  if (userPreference) {
    if (!userPreference.enabled) {
      return { decision: 'deny', reason: 'disabled_by_user' };
    }
  } else {
    const defaultPreference = context.defaults.find(
      (preference) =>
        preference.notificationType === input.notificationType && preference.channel === input.channel,
    );

    if (defaultPreference && !defaultPreference.enabled) {
      return { decision: 'deny', reason: 'disabled_by_user' };
    }
  }

  const isMarketing = CATEGORY_BY_TYPE[input.notificationType] === 'marketing';

  if (isMarketing && context.quietHours) {
    const localTime = toLocalTime(input.datetime, context.quietHours.timezone);

    if (isWithinQuietHours(localTime, context.quietHours.start, context.quietHours.end)) {
      return { decision: 'deny', reason: 'quiet_hours' };
    }
  }

  return { decision: 'allow', reason: null };
}
