import { beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';

describe('POST /evaluate', () => {
  let app: FastifyInstance;

  beforeEach(() => {
    app = buildApp();
  });

  const validPayload = {
    userId: 'user-1',
    notificationType: 'marketing_email',
    channel: 'email',
    region: 'EU',
    datetime: '2026-05-21T21:30:00Z',
  };

  it('returns 200 with a decision/reason shape for a valid request', async () => {
    const response = await app.inject({ method: 'POST', url: '/evaluate', payload: validPayload });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(['allow', 'deny']).toContain(body.decision);
    expect(body).toHaveProperty('reason');
  });

  it('returns 400 when a required field is missing', async () => {
    const { region, ...withoutRegion } = validPayload;
    void region;

    const response = await app.inject({ method: 'POST', url: '/evaluate', payload: withoutRegion });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toBe('validation_error');
  });

  it('returns 400 for invalid notificationType', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/evaluate',
      payload: { ...validPayload, notificationType: 'not_a_type' },
    });

    expect(response.statusCode).toBe(400);
  });

  it('returns 400 for invalid channel', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/evaluate',
      payload: { ...validPayload, channel: 'carrier_pigeon' },
    });

    expect(response.statusCode).toBe(400);
  });

  it('returns 400 for a malformed datetime', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/evaluate',
      payload: { ...validPayload, datetime: 'not-a-date' },
    });

    expect(response.statusCode).toBe(400);
  });

  it('accepts a valid ISO datetime without seconds', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/evaluate',
      payload: { ...validPayload, datetime: '2026-05-21T21:30Z' },
    });

    expect(response.statusCode).toBe(200);
  });

  it('returns 400 for a datetime without timezone offset', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/evaluate',
      payload: { ...validPayload, datetime: '2026-05-21T21:30:00' },
    });

    expect(response.statusCode).toBe(400);
  });

  it('returns 400 for an empty region', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/evaluate',
      payload: { ...validPayload, region: '' },
    });

    expect(response.statusCode).toBe(400);
  });
});
