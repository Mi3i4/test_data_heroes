import { pool } from '../db.js';
import type { QuietHours } from '../../domain/types.js';

interface QuietHoursRow {
  start_time: string;
  end_time: string;
  timezone: string;
}

function toHHMM(value: string): string {
  return value.slice(0, 5);
}

export async function getByUserId(userId: string): Promise<QuietHours | null> {
  const result = await pool.query<QuietHoursRow>(
    'SELECT start_time, end_time, timezone FROM user_quiet_hours WHERE user_id = $1',
    [userId],
  );

  const row = result.rows[0];

  if (!row) {
    return null;
  }

  return { start: toHHMM(row.start_time), end: toHHMM(row.end_time), timezone: row.timezone };
}

export async function upsert(userId: string, start: string, end: string, timezone: string): Promise<void> {
  await pool.query(
    `INSERT INTO user_quiet_hours (user_id, start_time, end_time, timezone)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id)
     DO UPDATE SET start_time = excluded.start_time, end_time = excluded.end_time,
                   timezone = excluded.timezone, updated_at = now()`,
    [userId, start, end, timezone],
  );
}
