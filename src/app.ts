import Fastify, { type FastifyInstance } from 'fastify';
import type { PreferencesService } from './application/preferencesService.js';
import { createStubPreferencesService } from './application/stubPreferencesService.js';
import { registerErrorHandler } from './http/middleware/errorHandler.js';
import { registerRoutes } from './http/router.js';

export function buildApp(service: PreferencesService = createStubPreferencesService()): FastifyInstance {
  const app = Fastify({ logger: true });

  registerErrorHandler(app);
  app.get('/health', async () => ({ status: 'ok' }));
  registerRoutes(app, service);

  return app;
}
