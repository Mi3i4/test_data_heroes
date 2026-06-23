import { CHANNELS, NOTIFICATION_TYPES } from '../application/preferencesService.js';
import { ValidationError } from './errors.js';

const TIME_PATTERN = '^([01][0-9]|2[0-3]):[0-5][0-9]$';
const ISO_DATETIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

export function assertValidDatetime(value: string): void {
  const isWellFormed = ISO_DATETIME_PATTERN.test(value);
  const parsed = new Date(value);

  if (!isWellFormed || Number.isNaN(parsed.getTime())) {
    throw new ValidationError(`Invalid datetime: ${value}`);
  }
}

export function assertValidTimezone(value: string): void {
  try {
    new Intl.DateTimeFormat(undefined, { timeZone: value });
  } catch {
    throw new ValidationError(`Invalid timezone: ${value}`);
  }
}

export const userIdParamsSchema = {
  type: 'object',
  required: ['userId'],
  properties: {
    userId: { type: 'string', minLength: 1 },
  },
} as const;

const preferenceEntrySchema = {
  type: 'object',
  required: ['notificationType', 'channel', 'enabled'],
  additionalProperties: false,
  properties: {
    notificationType: { type: 'string', enum: NOTIFICATION_TYPES },
    channel: { type: 'string', enum: CHANNELS },
    enabled: { type: 'boolean' },
  },
} as const;

const quietHoursSchema = {
  type: 'object',
  required: ['start', 'end', 'timezone'],
  additionalProperties: false,
  properties: {
    start: { type: 'string', pattern: TIME_PATTERN },
    end: { type: 'string', pattern: TIME_PATTERN },
    timezone: { type: 'string', minLength: 1 },
  },
} as const;

export const updatePreferencesBodySchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    preferences: { type: 'array', items: preferenceEntrySchema, minItems: 1 },
    quietHours: quietHoursSchema,
  },
  anyOf: [{ required: ['preferences'] }, { required: ['quietHours'] }],
} as const;

export const evaluateBodySchema = {
  type: 'object',
  required: ['userId', 'notificationType', 'channel', 'region', 'datetime'],
  additionalProperties: false,
  properties: {
    userId: { type: 'string', minLength: 1 },
    notificationType: { type: 'string', enum: NOTIFICATION_TYPES },
    channel: { type: 'string', enum: CHANNELS },
    region: { type: 'string', minLength: 1 },
    datetime: { type: 'string', minLength: 1 },
  },
} as const;
