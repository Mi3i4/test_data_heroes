import { pool } from '../db.js';
import { createTtlCache } from '../ttlCache.js';
import type { Channel, GlobalPolicy, NotificationType } from '../../domain/types.js';

interface GlobalPolicyRow {
  notification_type: NotificationType;
  channel: Channel;
  region: string;
}

const CACHE_TTL_MS = 30_000;

const loadPolicies = createTtlCache(CACHE_TTL_MS, async (): Promise<GlobalPolicy[]> => {
  const result = await pool.query<GlobalPolicyRow>('SELECT notification_type, channel, region FROM global_policies');

  return result.rows.map((row) => ({
    notificationType: row.notification_type,
    channel: row.channel,
    region: row.region,
  }));
});

export async function getAll(): Promise<GlobalPolicy[]> {
  return loadPolicies();
}

export async function getByRegion(region: string): Promise<GlobalPolicy[]> {
  const policies = await getAll();
  return policies.filter((policy) => policy.region === region);
}
