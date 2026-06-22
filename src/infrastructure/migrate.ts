import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pool } from './db.js';

async function runSqlDirectory(dir: string): Promise<void> {
  const files = readdirSync(dir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = readFileSync(join(dir, file), 'utf-8');
    await pool.query(sql);
  }
}

export async function migrate(): Promise<void> {
  await runSqlDirectory(join(process.cwd(), 'migrations'));
  await runSqlDirectory(join(process.cwd(), 'seeds'));
}
