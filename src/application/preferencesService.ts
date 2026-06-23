export const NOTIFICATION_TYPES = [
  'transactional_email',
  'marketing_email',
  'transactional_sms',
  'marketing_sms',
  'transactional_push',
  'marketing_push',
] as const;

export const CHANNELS = ['email', 'sms', 'push'] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
export type Channel = (typeof CHANNELS)[number];

export type Decision = 'allow' | 'deny';
export type DenyReason = 'blocked_by_global_policy' | 'disabled_by_user' | 'quiet_hours';

export interface PreferenceEntry {
  notificationType: NotificationType;
  channel: Channel;
  enabled: boolean;
}

export interface QuietHours {
  start: string;
  end: string;
  timezone: string;
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

export interface EvaluationInput {
  userId: string;
  notificationType: NotificationType;
  channel: Channel;
  region: string;
  datetime: string;
}

export interface EvaluationResult {
  decision: Decision;
  reason: DenyReason | null;
}

export interface PreferencesService {
  getPreferences(userId: string): Promise<PreferencesView>;
  updatePreferences(userId: string, input: UpdatePreferencesInput): Promise<void>;
  evaluate(input: EvaluationInput): Promise<EvaluationResult>;
}
