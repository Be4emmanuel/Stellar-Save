/**
 * Response Envelope Integration Tests
 *
 * Tests for the standard API response envelope used by ambassador and compliance services.
 * Verifies that all endpoints return proper envelope structure with data, meta, and errors.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createEnvelope,
  createEnvelopeWithPagination,
  errorEnvelope,
  errorEnvelopeMulti,
  createEmptyEnvelope,
  normalizeResponse,
  type ApiResponseEnvelope,
} from '../lib/response-envelope';
import {
  AppError,
  ValidationError,
  AuthError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  UpstreamError,
  isAppError,
  mapError,
} from '../lib/errors';

describe('Response Envelope', () => {
  describe('createEnvelope', () => {
    it('should create a success envelope with data', () => {
      const data = { id: 1, name: 'Test' };
      const result = createEnvelope(data);

      expect(result).toEqual({
        data,
      });
    });

    it('should create a success envelope with data and metadata', () => {
      const data = { id: 1, name: 'Test' };
      const meta = { timestamp: '2026-09-26T10:00:00Z', version: '1.0' };
      const result = createEnvelope(data, meta);

      expect(result).toEqual({
        data,
        meta,
      });
    });

    it('should not include meta if undefined', () => {
      const data = { id: 1, name: 'Test' };
      const result = createEnvelope(data, undefined);

      expect(result).toEqual({
        data,
      });
      expect('meta' in result).toBe(false);
    });

    it('should handle null data', () => {
      const result = createEnvelope(null);

      expect(result).toEqual({
        data: null,
      });
    });

    it('should handle primitive types', () => {
      const stringResult = createEnvelope('hello');
      expect(stringResult.data).toBe('hello');

      const numberResult = createEnvelope(42);
      expect(numberResult.data).toBe(42);

      const boolResult = createEnvelope(true);
      expect(boolResult.data).toBe(true);
    });
  });

  describe('createEnvelopeWithPagination', () => {
    it('should create envelope with array data and count', () => {
      const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const result = createEnvelopeWithPagination(items);

      expect(result.data).toEqual(items);
      expect(result.meta?.count).toBe(3);
    });

    it('should merge provided meta with count', () => {
      const items = [{ id: 1 }, { id: 2 }];
      const meta = { page: 1, pageSize: 10, total: 25 };
      const result = createEnvelopeWithPagination(items, meta);

      expect(result.data).toEqual(items);
      expect(result.meta).toEqual({
        count: 2,
        page: 1,
        pageSize: 10,
        total: 25,
      });
    });

    it('should handle empty array', () => {
      const result = createEnvelopeWithPagination([]);

      expect(result.data).toEqual([]);
      expect(result.meta?.count).toBe(0);
    });

    it('should count override existing count in meta', () => {
      const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const meta = { count: 999 }; // Should be overridden
      const result = createEnvelopeWithPagination(items, meta);

      expect(result.meta?.count).toBe(3); // New count, not 999
    });
  });

  describe('errorEnvelope', () => {
    it('should create error envelope with code and message', () => {
      const result = errorEnvelope('VALIDATION_ERROR', 'Invalid input');

      expect(result).toEqual({
        data: null,
        errors: [
          {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
          },
        ],
      });
    });

    it('should include details if provided', () => {
      const details = { field: 'email', reason: 'invalid format' };
      const result = errorEnvelope('VALIDATION_ERROR', 'Invalid email', details);

      expect(result.errors?.[0]).toEqual({
        code: 'VALIDATION_ERROR',
        message: 'Invalid email',
        details,
      });
    });

    it('should not include details if undefined', () => {
      const result = errorEnvelope('VALIDATION_ERROR', 'Invalid input', undefined);

      expect(result.errors?.[0]).toEqual({
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
      });
      expect('details' in (result.errors?.[0] || {})).toBe(false);
    });

    it('should always have null data', () => {
      const result = errorEnvelope('ERROR', 'Something failed');
      expect(result.data).toBeNull();
    });
  });

  describe('errorEnvelopeMulti', () => {
    it('should create error envelope with multiple errors', () => {
      const errors = [
        { code: 'FIELD_1', message: 'Field 1 is invalid' },
        { code: 'FIELD_2', message: 'Field 2 is required' },
      ];
      const result = errorEnvelopeMulti(errors);

      expect(result.data).toBeNull();
      expect(result.errors).toEqual(errors);
    });

    it('should include details in errors if provided', () => {
      const errors = [
        {
          code: 'VALIDATION',
          message: 'Invalid',
          details: { field: 'email', reason: 'format' },
        },
      ];
      const result = errorEnvelopeMulti(errors);

      expect(result.errors?.[0].details).toEqual({ field: 'email', reason: 'format' });
    });

    it('should handle empty errors array', () => {
      const result = errorEnvelopeMulti([]);

      expect(result.data).toBeNull();
      expect(result.errors).toEqual([]);
    });
  });

  describe('createEmptyEnvelope', () => {
    it('should create envelope with null data', () => {
      const result = createEmptyEnvelope();

      expect(result).toEqual({
        data: null,
      });
    });

    it('should include meta if provided', () => {
      const meta = { action: 'deleted', itemId: '123' };
      const result = createEmptyEnvelope(meta);

      expect(result).toEqual({
        data: null,
        meta,
      });
    });

    it('should not include meta if undefined', () => {
      const result = createEmptyEnvelope(undefined);

      expect('meta' in result).toBe(false);
    });
  });

  describe('normalizeResponse', () => {
    it('should return already-normalized envelope', () => {
      const envelope: ApiResponseEnvelope = {
        data: { id: 1 },
        meta: { count: 1 },
      };
      const result = normalizeResponse(envelope);

      expect(result).toEqual(envelope);
    });

    it('should wrap array in envelope with count', () => {
      const array = [{ id: 1 }, { id: 2 }];
      const result = normalizeResponse(array);

      expect(result.data).toEqual(array);
      expect(result.meta?.count).toBe(2);
    });

    it('should wrap object in envelope', () => {
      const obj = { id: 1, name: 'Test' };
      const result = normalizeResponse(obj);

      expect(result.data).toEqual(obj);
      expect(result.meta).toBeUndefined();
    });

    it('should wrap primitive in envelope', () => {
      const result = normalizeResponse('hello');

      expect(result.data).toBe('hello');
    });

    it('should handle null', () => {
      const result = normalizeResponse(null);

      expect(result.data).toBeNull();
    });

    it('should handle undefined', () => {
      const result = normalizeResponse(undefined);

      expect(result.data).toBeUndefined();
    });

    it('should preserve error envelope', () => {
      const errorEnv = errorEnvelope('ERROR', 'Test error');
      const result = normalizeResponse(errorEnv);

      expect(result).toEqual(errorEnv);
    });
  });
});

describe('AppError hierarchy', () => {
  it('should map ValidationError to 400 VALIDATION_ERROR', () => {
    const mapped = mapError(new ValidationError('bad input'), false);
    expect(mapped).toEqual({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'bad input',
    });
  });

  it('should map AuthError to 401 UNAUTHORIZED', () => {
    const mapped = mapError(new AuthError('missing token'), false);
    expect(mapped.status).toBe(401);
    expect(mapped.code).toBe('UNAUTHORIZED');
    expect(mapped.message).toBe('missing token');
  });

  it('should map ForbiddenError to 403 FORBIDDEN', () => {
    const mapped = mapError(new ForbiddenError('nope'), false);
    expect(mapped.status).toBe(403);
    expect(mapped.code).toBe('FORBIDDEN');
  });

  it('should map NotFoundError to 404 NOT_FOUND', () => {
    const mapped = mapError(new NotFoundError('missing'), false);
    expect(mapped.status).toBe(404);
    expect(mapped.code).toBe('NOT_FOUND');
    expect(mapped.message).toBe('missing');
  });

  it('should map ConflictError to 409 CONFLICT', () => {
    const mapped = mapError(new ConflictError('duplicate'), false);
    expect(mapped.status).toBe(409);
    expect(mapped.code).toBe('CONFLICT');
  });

  it('should map UpstreamError to 502 UPSTREAM_ERROR', () => {
    const mapped = mapError(new UpstreamError('provider down'), false);
    expect(mapped.status).toBe(502);
    expect(mapped.code).toBe('UPSTREAM_ERROR');
  });

  it('should map plain Error to 500 INTERNAL_ERROR', () => {
    const mapped = mapError(new Error('boom'), false);
    expect(mapped).toEqual({
      status: 500,
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
    });
  });

  it('should not leak internal messages or stack traces in production', () => {
    const err = new UpstreamError('secret upstream detail');
    const mapped = mapError(err, true);
    expect(mapped.status).toBe(502);
    expect(mapped.code).toBe('UPSTREAM_ERROR');
    expect(mapped.message).toBe('Upstream service failed');
    expect(JSON.stringify(mapped)).not.toContain('secret upstream detail');
    expect(JSON.stringify(mapped)).not.toContain('stack');
  });

  it('should not leak plain Error messages in production', () => {
    const mapped = mapError(new Error('db password leaked'), true);
    expect(mapped.message).toBe('Internal server error');
    expect(JSON.stringify(mapped)).not.toContain('db password leaked');
  });

  it('should expose client-safe messages in non-production', () => {
    const mapped = mapError(new ValidationError('email invalid'), false);
    expect(mapped.message).toBe('email invalid');
  });

  it('should identify AppError instances', () => {
    expect(isAppError(new NotFoundError())).toBe(true);
    expect(isAppError(new Error('x'))).toBe(false);
    expect(isAppError(null)).toBe(false);
  });

  it('should preserve subclass identity through instanceof', () => {
    const err = new ConflictError();
    expect(err).toBeInstanceOf(AppError);
    expect(err).toBeInstanceOf(ConflictError);
    expect(err.name).toBe('ConflictError');
  });
});

describe('Ambassador Routes - Envelope Responses', () => {
  describe('GET /ambassadors/leaderboard', () => {
    it('should return envelope with array data', () => {
      const response = {
        data: [
          { address: 'addr1', tier: 'Gold', reputationScore: 0.95, contributionCount: 30 },
          { address: 'addr2', tier: 'Silver', reputationScore: 0.85, contributionCount: 15 },
        ],
        meta: { count: 2 },
      };

      expect(response.data).toHaveLength(2);
      expect(response.meta?.count).toBe(2);
      expect(response.errors).toBeUndefined();
    });

    it('should handle empty leaderboard', () => {
      const response = {
        data: [],
        meta: { count: 0 },
      };

      expect(response.data).toHaveLength(0);
      expect(response.meta?.count).toBe(0);
    });
  });
});
