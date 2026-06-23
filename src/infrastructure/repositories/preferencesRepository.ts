import { pool } from '../db.js';
import type { Channel, NotificationType, UserPreference } from '../../domain/types.js';

interface UserPreferenceRow {
  user_id: string;
  notification_type: NotificationType;
  channel: Channel;
  enabled: boolean;
}

export async function getByUserId(userId: string): Promise<UserPreference[]> {
  const result = await pool.query<UserPreferenceRow>(
    'SELECT user_id, notification_type, channel, enabled FROM user_preferences WHERE user_id = $1',
    [userId],
  );

  return result.rows.map((row) => ({
    userId: row.user_id,
    notificationType: row.notification_type,
    channel: row.channel,
    enabled: row.enabled,
  }));
}

export async function upsert(
  userId: string,
  notificationType: NotificationType,
  channel: Channel,
  enabled: boolean,
): Promise<void> {
  await pool.query(
    `INSERT INTO user_preferences (user_id, notification_type, channel, enabled)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, notification_type, channel)
     DO UPDATE SET enabled = excluded.enabled, updated_at = now()`,
    [userId, notificationType, channel, enabled],
  );
}
