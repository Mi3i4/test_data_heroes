import { evaluate as evaluateNotification } from '../domain/evaluationEngine.js';
import type { EvaluationResult } from '../domain/types.js';
import { logger } from '../infrastructure/logger.js';
import * as defaultsRepository from '../infrastructure/repositories/defaultsRepository.js';
import * as policiesRepository from '../infrastructure/repositories/policiesRepository.js';
import * as preferencesRepository from '../infrastructure/repositories/preferencesRepository.js';
import * as quietHoursRepository from '../infrastructure/repositories/quietHoursRepository.js';
import type {
  EvaluateRequest,
  PreferencesService,
  PreferencesView,
  UpdatePreferencesInput,
} from './preferencesService.js';

export function createPreferencesService(): PreferencesService {
  return {
    async getPreferences(userId: string): Promise<PreferencesView> {
      const [userPreferences, quietHours, defaults] = await Promise.all([
        preferencesRepository.getByUserId(userId),
        quietHoursRepository.getByUserId(userId),
        defaultsRepository.getAll(),
      ]);

      const overrides = new Map(
        userPreferences.map((preference) => [
          `${preference.notificationType}:${preference.channel}`,
          preference.enabled,
        ]),
      );

      const preferences = defaults.map(({ notificationType, channel, enabled }) => ({
        notificationType,
        channel,
        enabled: overrides.get(`${notificationType}:${channel}`) ?? enabled,
      }));

      return { userId, preferences, quietHours };
    },

    async updatePreferences(userId: string, input: UpdatePreferencesInput): Promise<void> {
      const changes = input.preferences ?? [];

      for (const change of changes) {
        await preferencesRepository.upsert(userId, change.notificationType, change.channel, change.enabled);
      }

      if (input.quietHours) {
        await quietHoursRepository.upsert(
          userId,
          input.quietHours.start,
          input.quietHours.end,
          input.quietHours.timezone,
        );
      }

      logger.info('User preferences updated', {
        userId,
        changes,
        ...(input.quietHours ? { quietHours: input.quietHours } : {}),
      });
    },

    async evaluate(request: EvaluateRequest): Promise<EvaluationResult> {
      const [userPreferences, quietHours, globalPolicies, defaults] = await Promise.all([
        preferencesRepository.getByUserId(request.userId),
        quietHoursRepository.getByUserId(request.userId),
        policiesRepository.getAll(),
        defaultsRepository.getAll(),
      ]);

      const result = evaluateNotification(
        {
          userId: request.userId,
          notificationType: request.notificationType,
          channel: request.channel,
          region: request.region,
          datetime: new Date(request.datetime),
        },
        { userPreferences, quietHours, globalPolicies, defaults },
      );

      logger.info('Notification evaluation completed', {
        userId: request.userId,
        notificationType: request.notificationType,
        channel: request.channel,
        region: request.region,
        decision: result.decision,
        reason: result.reason,
      });

      return result;
    },
  };
}
