import { pool } from '../db.js';
import { createTtlCache } from '../ttlCache.js';
import type { Channel, DefaultPreference, NotificationType } from '../../domain/types.js';

interface DefaultPreferenceRow {
  notification_type: NotificationType;
  channel: Channel;
  enabled: boolean;
}

const CACHE_TTL_MS = 30_000;

const loadDefaults = createTtlCache(CACHE_TTL_MS, async (): Promise<DefaultPreference[]> => {
  const result = await pool.query<DefaultPreferenceRow>(
    'SELECT notification_type, channel, enabled FROM default_preferences',
  );

  return result.rows.map((row) => ({
    notificationType: row.notification_type,
    channel: row.channel,
    enabled: row.enabled,
  }));
});

export async function getAll(): Promise<DefaultPreference[]> {
  return loadDefaults();
}
