import type { FastifyReply, FastifyRequest } from 'fastify';
import type { EvaluationInput, PreferencesService } from '../../application/preferencesService.js';
import { assertValidDatetime } from '../validation.js';

export function makeEvaluateController(service: PreferencesService) {
  return {
    async evaluate(
      request: FastifyRequest<{ Body: EvaluationInput }>,
      reply: FastifyReply,
    ): Promise<void> {
      assertValidDatetime(request.body.datetime);

      const result = await service.evaluate(request.body);
      reply.code(200).send(result);
    },
  };
}
