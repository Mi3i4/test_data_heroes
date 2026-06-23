import Fastify, { type FastifyInstance } from 'fastify';
import { createPreferencesService } from './application/createPreferencesService.js';
import type { PreferencesService } from './application/preferencesService.js';
import { registerErrorHandler } from './http/middleware/errorHandler.js';
import { registerRoutes } from './http/router.js';

export function buildApp(service: PreferencesService = createPreferencesService()): FastifyInstance {
  const app = Fastify({ logger: true });

  registerErrorHandler(app);
  app.get('/health', async () => ({ status: 'ok' }));
  registerRoutes(app, service);

  return app;
}
