import { beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { resetDb } from './helpers/dbHelper.js';

describe('POST /evaluate', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    await resetDb();
    app = buildApp();
  });

  const validPayload = {
    userId: 'user-1',
    notificationType: 'marketing_email',
    channel: 'email',
    region: 'EU',
    datetime: '2026-05-21T21:30:00Z',
  };

  it('returns allow for a transactional type with no overrides, no policy, no quiet hours', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/evaluate',
      payload: { ...validPayload, notificationType: 'transactional_email', region: 'US' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ decision: 'allow', reason: null });
  });

  it('Сценарий 4.1: глобальная политика запрещает marketing_sms/sms в EU', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/evaluate',
      payload: { ...validPayload, notificationType: 'marketing_sms', channel: 'sms', region: 'EU' },
    });

    expect(response.json()).toEqual({ decision: 'deny', reason: 'blocked_by_global_policy' });
  });

  it('Сценарий 4.2: та же пара в регионе US не блокируется политикой EU', async () => {
    await app.inject({
      method: 'POST',
      url: '/users/user-1/preferences',
      payload: { preferences: [{ notificationType: 'marketing_sms', channel: 'sms', enabled: true }] },
    });

    const response = await app.inject({
      method: 'POST',
      url: '/evaluate',
      payload: { ...validPayload, notificationType: 'marketing_sms', channel: 'sms', region: 'US' },
    });

    expect(response.json()).toEqual({ decision: 'allow', reason: null });
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

  it('returns 400 when channel is inconsistent with the notification type', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/evaluate',
      payload: { ...validPayload, notificationType: 'marketing_email', channel: 'push' },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toBe('validation_error');
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
      payload: { ...validPayload, notificationType: 'transactional_email', datetime: '2026-05-21T21:30Z' },
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
