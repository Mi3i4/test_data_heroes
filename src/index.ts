import 'dotenv/config';
import { buildApp } from './app.js';
import { pool } from './infrastructure/db.js';
import { migrate } from './infrastructure/migrate.js';

const PORT = Number(process.env.PORT ?? 3000);

async function main(): Promise<void> {
  await migrate();

  const app = buildApp();
  await app.listen({ port: PORT, host: '0.0.0.0' });
  app.log.info(`Server started on port ${PORT}`);

  const shutdown = async (signal: string): Promise<void> => {
    app.log.info(`Received ${signal}, shutting down gracefully`);
    await app.close();
    await pool.end();
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
