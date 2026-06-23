import type { FastifyReply, FastifyRequest } from 'fastify';
import type { PreferencesService, UpdatePreferencesInput } from '../../application/preferencesService.js';
import { assertConsistentTypeChannel, assertValidTimezone } from '../validation.js';

interface UserIdParams {
  userId: string;
}

export function makePreferencesController(service: PreferencesService) {
  return {
    async getPreferences(
      request: FastifyRequest<{ Params: UserIdParams }>,
      reply: FastifyReply,
    ): Promise<void> {
      const view = await service.getPreferences(request.params.userId);
      reply.code(200).send(view);
    },

    async updatePreferences(
      request: FastifyRequest<{ Params: UserIdParams; Body: UpdatePreferencesInput }>,
      reply: FastifyReply,
    ): Promise<void> {
      for (const entry of request.body.preferences ?? []) {
        assertConsistentTypeChannel(entry.notificationType, entry.channel);
      }

      if (request.body.quietHours) {
        assertValidTimezone(request.body.quietHours.timezone);
      }

      await service.updatePreferences(request.params.userId, request.body);
      reply.code(200).send({ userId: request.params.userId, updated: true });
    },
  };
}
