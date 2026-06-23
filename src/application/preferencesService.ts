import { CHANNEL_BY_TYPE, CHANNELS, NOTIFICATION_TYPES } from '../domain/types.js';
import type { Channel, EvaluationResult, NotificationType, QuietHours } from '../domain/types.js';

export { CHANNEL_BY_TYPE, CHANNELS, NOTIFICATION_TYPES };
export type { Channel, EvaluationResult, NotificationType, QuietHours };

export interface PreferenceEntry {
  notificationType: NotificationType;
  channel: Channel;
  enabled: boolean;
}

export interface PreferencesView {
  userId: string;
  preferences: PreferenceEntry[];
  quietHours: QuietHours | null;
}

export interface UpdatePreferencesInput {
  preferences?: PreferenceEntry[];
  quietHours?: QuietHours;
}

export interface EvaluateRequest {
  userId: string;
  notificationType: NotificationType;
  channel: Channel;
  region: string;
  datetime: string;
}

export interface PreferencesService {
  getPreferences(userId: string): Promise<PreferencesView>;
  updatePreferences(userId: string, input: UpdatePreferencesInput): Promise<void>;
  evaluate(input: EvaluateRequest): Promise<EvaluationResult>;
}
