import type { FastifyError, FastifyInstance } from 'fastify';
import { ValidationError } from '../errors.js';

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (error instanceof ValidationError || error.validation) {
      reply.code(400).send({ error: 'validation_error', message: error.message });
      return;
    }

    request.log.error({ err: error }, 'Unhandled error');
    reply.code(500).send({ error: 'internal_server_error', message: 'An unexpected error occurred' });
  });
}
