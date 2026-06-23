import { pool } from '../../../src/infrastructure/db.js';

export async function resetDb(): Promise<void> {
  await pool.query('TRUNCATE TABLE user_preferences, user_quiet_hours');
}
