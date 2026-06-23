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
export type Category = 'marketing' | 'transactional';

export const CATEGORY_BY_TYPE: Record<NotificationType, Category> = {
  transactional_email: 'transactional',
  marketing_email: 'marketing',
  transactional_sms: 'transactional',
  marketing_sms: 'marketing',
  transactional_push: 'transactional',
  marketing_push: 'marketing',
};

export const CHANNEL_BY_TYPE: Record<NotificationType, Channel> = {
  transactional_email: 'email',
  marketing_email: 'email',
  transactional_sms: 'sms',
  marketing_sms: 'sms',
  transactional_push: 'push',
  marketing_push: 'push',
};

export type Decision = 'allow' | 'deny';
export type DenyReason = 'blocked_by_global_policy' | 'disabled_by_user' | 'quiet_hours';

export interface UserPreference {
  userId: string;
  notificationType: NotificationType;
  channel: Channel;
  enabled: boolean;
}

export interface DefaultPreference {
  notificationType: NotificationType;
  channel: Channel;
  enabled: boolean;
}

export interface QuietHours {
  start: string;
  end: string;
  timezone: string;
}

export interface GlobalPolicy {
  notificationType: NotificationType;
  channel: Channel;
  region: string;
}

export interface EvaluationInput {
  userId: string;
  notificationType: NotificationType;
  channel: Channel;
  region: string;
  datetime: Date;
}

export interface EvaluationContext {
  userPreferences: UserPreference[];
  quietHours: QuietHours | null;
  globalPolicies: GlobalPolicy[];
  defaults: DefaultPreference[];
}

export interface EvaluationResult {
  decision: Decision;
  reason: DenyReason | null;
}
