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
      const response = createEnvelopeWithPagination([]);

      expect(response.data).toEqual([]);
      expect(response.meta?.count).toBe(0);
    });
  });

  describe('GET /ambassadors/:address', () => {
    it('should return envelope with profile data', () => {
      const profile = {
        address: 'GXYZ...',
        tier: 'Gold',
        reputationScore: 0.95,
        contributionCount: 30,
        referrals: 10,
        rewardsEarned: 5000,
        awardedAt: '2026-01-01T00:00:00Z',
      };

      const response = createEnvelope(profile);

      expect(response.data).toEqual(profile);
      expect(response.errors).toBeUndefined();
    });

    it('should return 404 when not found', () => {
      const response = errorEnvelope('AMBASSADOR_NOT_FOUND', 'Ambassador not found');

      expect(response.data).toBeNull();
      expect(response.errors?.[0].code).toBe('AMBASSADOR_NOT_FOUND');
    });
  });

  describe('POST /ambassadors/evaluate', () => {
    it('should return envelope with evaluation result', () => {
      const evaluation = {
        eligible: true,
        tier: 'Silver',
        profile: {
          address: 'GXYZ...',
          tier: 'Silver',
          reputationScore: 0.85,
          contributionCount: 15,
          referrals: 3,
          rewardsEarned: 0,
          awardedAt: '2026-09-26T10:00:00Z',
        },
      };

      const response = createEnvelope(evaluation);

      expect(response.data?.eligible).toBe(true);
      expect(response.data?.tier).toBe('Silver');
      expect(response.errors).toBeUndefined();
    });

    it('should return envelope when not eligible', () => {
      const evaluation = {
        eligible: false,
        tier: null,
        profile: null,
      };

      const response = createEnvelope(evaluation);

      expect(response.data?.eligible).toBe(false);
      expect(response.data?.tier).toBeNull();
    });

    it('should return validation error envelope', () => {
      const response = errorEnvelope(
        'MISSING_FIELDS',
        'Missing required fields: address, reputationScore, contributions, referrals',
        { requiredFields: ['address', 'reputationScore', 'contributions', 'referrals'] }
      );

      expect(response.data).toBeNull();
      expect(response.errors?.[0].code).toBe('MISSING_FIELDS');
      expect(response.errors?.[0].details?.requiredFields).toHaveLength(4);
    });
  });

  describe('POST /ambassadors/:address/reward', () => {
    it('should return envelope with reward metadata', () => {
      const response = createEmptyEnvelope({ rewarded: true, amount: 1000 });

      expect(response.data).toBeNull();
      expect(response.meta?.rewarded).toBe(true);
      expect(response.meta?.amount).toBe(1000);
    });

    it('should return validation error for invalid amount', () => {
      const response = errorEnvelope('INVALID_AMOUNT', 'amount must be a positive number');

      expect(response.data).toBeNull();
      expect(response.errors?.[0].code).toBe('INVALID_AMOUNT');
    });

    it('should return not found error', () => {
      const response = errorEnvelope('AMBASSADOR_REWARD_FAILED', 'Ambassador not found');

      expect(response.data).toBeNull();
      expect(response.errors?.[0].code).toBe('AMBASSADOR_REWARD_FAILED');
    });
  });
});

describe('Compliance Routes - Envelope Responses', () => {
  describe('POST /compliance/screen', () => {
    it('should return envelope with AML check result', () => {
      const result = {
        flagged: true,
        riskLevel: 'HIGH',
        reasons: ['high_value', 'rapid_succession'],
      };

      const response = createEnvelope(result);

      expect(response.data?.flagged).toBe(true);
      expect(response.data?.riskLevel).toBe('HIGH');
      expect(response.data?.reasons).toHaveLength(2);
      expect(response.errors).toBeUndefined();
    });

    it('should return envelope for clean transaction', () => {
      const result = {
        flagged: false,
        riskLevel: 'LOW',
        reasons: [],
      };

      const response = createEnvelope(result);

      expect(response.data?.flagged).toBe(false);
      expect(response.errors).toBeUndefined();
    });

    it('should return validation error envelope', () => {
      const response = errorEnvelope(
        'MISSING_FIELDS',
        'address, txHash, and amount are required'
      );

      expect(response.data).toBeNull();
      expect(response.errors?.[0].code).toBe('MISSING_FIELDS');
    });
  });

  describe('GET /compliance/queue', () => {
    it('should return envelope with flagged transactions array', () => {
      const flags = [
        {
          id: 'flag-1',
          address: 'GXYZ...',
          txHash: 'txhash1',
          riskLevel: 'HIGH',
          reasons: ['high_value'],
          timestamp: '2026-09-26T10:00:00Z',
          reviewed: false,
        },
      ];

      const response = createEnvelopeWithPagination(flags);

      expect(response.data).toHaveLength(1);
      expect(response.meta?.count).toBe(1);
      expect(response.errors).toBeUndefined();
    });

    it('should return empty array when no flags', () => {
      const response = createEnvelopeWithPagination([]);

      expect(response.data).toEqual([]);
      expect(response.meta?.count).toBe(0);
    });
  });

  describe('POST /compliance/flags/:id/review', () => {
    it('should return envelope with review metadata', () => {
      const response = createEmptyEnvelope({ reviewed: true });

      expect(response.data).toBeNull();
      expect(response.meta?.reviewed).toBe(true);
    });

    it('should return validation error for invalid decision', () => {
      const response = errorEnvelope(
        'INVALID_DECISION',
        'decision must be "approved" or "rejected"'
      );

      expect(response.data).toBeNull();
      expect(response.errors?.[0].code).toBe('INVALID_DECISION');
    });

    it('should return not found error', () => {
      const response = errorEnvelope('FLAG_REVIEW_FAILED', 'Flag not found');

      expect(response.data).toBeNull();
      expect(response.errors?.[0].code).toBe('FLAG_REVIEW_FAILED');
    });
  });

  describe('GET /compliance/audit-log', () => {
    it('should return envelope with audit log array', () => {
      const logs = [
        {
          id: 'flag-1',
          address: 'GXYZ...',
          txHash: 'txhash1',
          riskLevel: 'HIGH',
          reasons: ['high_value'],
          timestamp: '2026-09-26T10:00:00Z',
          reviewed: true,
          reviewedBy: 'admin@example.com',
          decision: 'approved',
          notes: 'Legitimate transaction',
        },
      ];

      const response = createEnvelopeWithPagination(logs);

      expect(response.data).toHaveLength(1);
      expect(response.meta?.count).toBe(1);
      expect(response.data?.[0].reviewed).toBe(true);
      expect(response.errors).toBeUndefined();
    });

    it('should return empty audit log', () => {
      const response = createEnvelopeWithPagination([]);

      expect(response.data).toEqual([]);
      expect(response.meta?.count).toBe(0);
    });
  });
});

describe('Error Handling', () => {
  it('should handle authentication errors', () => {
    const response = errorEnvelope('UNAUTHORIZED', 'Authentication required');

    expect(response.data).toBeNull();
    expect(response.errors?.[0].code).toBe('UNAUTHORIZED');
  });

  it('should handle authorization errors', () => {
    const response = errorEnvelope('FORBIDDEN', 'Admin access required');

    expect(response.data).toBeNull();
    expect(response.errors?.[0].code).toBe('FORBIDDEN');
  });

  it('should handle multiple validation errors', () => {
    const errors = [
      { code: 'INVALID_ADDRESS', message: 'Invalid Stellar address format' },
      { code: 'INVALID_AMOUNT', message: 'Amount must be positive' },
      { code: 'INVALID_TXHASH', message: 'Invalid transaction hash format' },
    ];

    const response = errorEnvelopeMulti(errors);

    expect(response.errors).toHaveLength(3);
    expect(response.data).toBeNull();
  });
});
