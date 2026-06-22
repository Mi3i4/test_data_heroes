import 'dotenv/config';
import { buildApp } from './app.js';
import { migrate } from './infrastructure/migrate.js';

const PORT = Number(process.env.PORT ?? 3000);

async function main(): Promise<void> {
  await migrate();

  const app = buildApp();
  await app.listen({ port: PORT, host: '0.0.0.0' });
  app.log.info(`Server started on port ${PORT}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
