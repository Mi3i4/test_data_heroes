import type { FastifyInstance } from 'fastify';
import type { PreferencesService } from '../application/preferencesService.js';
import { makeEvaluateController } from './controllers/evaluateController.js';
import { makePreferencesController } from './controllers/preferencesController.js';
import { evaluateBodySchema, updatePreferencesBodySchema, userIdParamsSchema } from './validation.js';

export function registerRoutes(app: FastifyInstance, service: PreferencesService): void {
  const preferences = makePreferencesController(service);
  const evaluate = makeEvaluateController(service);

  app.get(
    '/users/:userId/preferences',
    { schema: { params: userIdParamsSchema } },
    preferences.getPreferences,
  );

  app.post(
    '/users/:userId/preferences',
    { schema: { params: userIdParamsSchema, body: updatePreferencesBodySchema } },
    preferences.updatePreferences,
  );

  app.post('/evaluate', { schema: { body: evaluateBodySchema } }, evaluate.evaluate);
}
