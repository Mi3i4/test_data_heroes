import type {
  EvaluationInput,
  EvaluationResult,
  PreferencesService,
  PreferencesView,
  UpdatePreferencesInput,
} from './preferencesService.js';

export function createStubPreferencesService(): PreferencesService {
  return {
    async getPreferences(userId: string): Promise<PreferencesView> {
      return {
        userId,
        preferences: [
          { notificationType: 'transactional_email', channel: 'email', enabled: true },
          { notificationType: 'marketing_email', channel: 'email', enabled: false },
        ],
        quietHours: null,
      };
    },

    async updatePreferences(_userId: string, _input: UpdatePreferencesInput): Promise<void> {
      // contract-only stub for Step 2: no persistence, real logic arrives in Step 3
    },

    async evaluate(_input: EvaluationInput): Promise<EvaluationResult> {
      return { decision: 'allow', reason: null };
    },
  };
}
