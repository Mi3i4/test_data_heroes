import { beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';

describe('GET /users/:userId/preferences', () => {
  let app: FastifyInstance;

  beforeEach(() => {
    app = buildApp();
  });

  it('returns 200 with preferences and quietHours shape', async () => {
    const response = await app.inject({ method: 'GET', url: '/users/user-1/preferences' });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.userId).toBe('user-1');
    expect(Array.isArray(body.preferences)).toBe(true);
    expect(body).toHaveProperty('quietHours');
  });

  it('returns 400 when userId is an empty path segment', async () => {
    const response = await app.inject({ method: 'GET', url: '/users//preferences' });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toBe('validation_error');
  });
});

describe('POST /users/:userId/preferences', () => {
  let app: FastifyInstance;

  beforeEach(() => {
    app = buildApp();
  });

  it('returns 200 with updated: true for valid preferences update', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/users/user-1/preferences',
      payload: {
        preferences: [{ notificationType: 'marketing_email', channel: 'email', enabled: false }],
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ userId: 'user-1', updated: true });
  });

  it('returns 200 for valid quietHours update', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/users/user-1/preferences',
      payload: { quietHours: { start: '22:00', end: '08:00', timezone: 'Europe/Moscow' } },
    });

    expect(response.statusCode).toBe(200);
  });

  it('returns 400 for empty body', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/users/user-1/preferences',
      payload: {},
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toBe('validation_error');
  });

  it('returns 400 for invalid notificationType', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/users/user-1/preferences',
      payload: { preferences: [{ notificationType: 'not_a_type', channel: 'email', enabled: true }] },
    });

    expect(response.statusCode).toBe(400);
  });

  it('returns 400 for malformed quietHours time format', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/users/user-1/preferences',
      payload: { quietHours: { start: '22:00', end: '8am', timezone: 'Europe/Moscow' } },
    });

    expect(response.statusCode).toBe(400);
  });

  it('returns 400 for unknown timezone', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/users/user-1/preferences',
      payload: { quietHours: { start: '22:00', end: '08:00', timezone: 'Europe/Moscov' } },
    });

    expect(response.statusCode).toBe(400);
  });
});
