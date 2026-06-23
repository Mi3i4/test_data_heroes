import type { FastifyReply, FastifyRequest } from 'fastify';
import type { EvaluateRequest, PreferencesService } from '../../application/preferencesService.js';
import { assertConsistentTypeChannel, assertValidDatetime } from '../validation.js';

export function makeEvaluateController(service: PreferencesService) {
  return {
    async evaluate(
      request: FastifyRequest<{ Body: EvaluateRequest }>,
      reply: FastifyReply,
    ): Promise<void> {
      assertValidDatetime(request.body.datetime);
      assertConsistentTypeChannel(request.body.notificationType, request.body.channel);

      const result = await service.evaluate(request.body);
      reply.code(200).send(result);
    },
  };
}
