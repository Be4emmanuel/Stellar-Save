import { describe, expect, it } from 'vitest';

import {
  formatCurrency,
  formatDate,
  formatNumber,
  formatPercent,
  formatRelativeTime,
  truncateAddress,
} from './formatting';

describe('shared formatting helpers', () => {
  describe('truncateAddress', () => {
    it('returns the full address when it is short', () => {
      expect(truncateAddress('GAB')).toBe('GAB');
    });

    it('returns the full address when length equals prefix + suffix + 3', () => {
      expect(truncateAddress('GABCDEF', 4, 4)).toBe('GABCDEF');
    });

    it('truncates a long address with default lengths', () => {
      const long = 'G' + 'A'.repeat(50) + 'XYZW';
      expect(truncateAddress(long)).toBe('GAAA...XYZW');
    });

    it('truncates with custom prefix and suffix lengths', () => {
      const long = 'G' + 'B'.repeat(50) + 'XYZW';
      expect(truncateAddress(long, 2, 2)).toBe('GB...ZW');
    });

    it('handles an empty string', () => {
      expect(truncateAddress('')).toBe('');
    });
  });

  describe('formatDate', () => {
    it('formats a Date object', () => {
      const date = new Date('2025-01-15T00:00:00Z');
      const result = formatDate(date);
      expect(result).toContain('Jan');
      expect(result).toContain('15');
      expect(result).toContain('2025');
    });

    it('formats an ISO string', () => {
      const result = formatDate('2025-06-01T12:00:00Z');
      expect(result).toContain('Jun');
      expect(result).toContain('1');
    });

    it('formats a Unix timestamp (number)', () => {
      const result = formatDate(1700000000000);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('applies custom locale', () => {
      const date = new Date('2025-01-15T00:00:00Z');
      const result = formatDate(date, undefined, 'de-DE');
      expect(result).toContain('Jan');
    });

    it('applies custom Intl.DateTimeFormatOptions', () => {
      const date = new Date('2025-01-15T00:00:00Z');
      const result = formatDate(date, { year: 'numeric', month: 'long', day: 'numeric' });
      expect(result).toContain('January');
      expect(result).toContain('15');
      expect(result).toContain('2025');
    });

    it('overrides default options with provided options', () => {
      const date = new Date('2025-01-15T00:00:00Z');
      const result = formatDate(date, { year: '2-digit' });
      expect(result).toContain('25');
    });
  });

  describe('formatRelativeTime', () => {
    it('returns "now" for the current moment', () => {
      const result = formatRelativeTime(Date.now());
      expect(result).toBe('now');
    });

    it('returns "a few seconds ago" for a recent past date', () => {
      const result = formatRelativeTime(Date.now() - 30000);
      expect(result).toBe('30 seconds ago');
    });

    it('returns "in X seconds" for a future date within a minute', () => {
      const result = formatRelativeTime(Date.now() + 45000);
      expect(result).toBe('in 45 seconds');
    });

    it('returns minutes ago for past dates in the minute range', () => {
      const result = formatRelativeTime(Date.now() - 120000);
      expect(result).toBe('2 minutes ago');
    });

    it('returns hours ago for past dates in the hour range', () => {
      const result = formatRelativeTime(Date.now() - 7200000);
      expect(result).toBe('2 hours ago');
    });

    it('returns days ago for past dates in the day range', () => {
      const result = formatRelativeTime(Date.now() - 172800000);
      expect(result).toBe('2 days ago');
    });

    it('returns "in X days" for future dates in the day range', () => {
      const result = formatRelativeTime(Date.now() + 86400000);
      expect(result).toBe('in 1 day');
    });

    it('handles a Date object', () => {
      const result = formatRelativeTime(new Date(Date.now() - 3600000));
      expect(result).toBe('1 hour ago');
    });

    it('handles an ISO string', () => {
      const result = formatRelativeTime(new Date(Date.now() - 3600000).toISOString());
      expect(result).toBe('1 hour ago');
    });

    it('uses a custom locale', () => {
      const result = formatRelativeTime(Date.now() - 3600000, 'de-DE');
      expect(result).toBe('1 Stunde vor');
    });
  });

  describe('formatCurrency', () => {
    it('formats a number as USD by default', () => {
      const result = formatCurrency(1234.56);
      expect(result).toBe('$1,234.56');
    });

    it('formats a string amount', () => {
      const result = formatCurrency('99.99');
      expect(result).toBe('$99.99');
    });

    it('formats with a custom currency', () => {
      const result = formatCurrency(1234.56, 'EUR');
      expect(result).toBe('€1,234.56');
    });

    it('formats with a custom locale', () => {
      const result = formatCurrency(1234.56, 'USD', 'de-DE');
      expect(result).toBe('1.234,56 $');
    });

    it('always shows exactly 2 decimal places', () => {
      expect(formatCurrency(5)).toBe('$5.00');
      expect(formatCurrency(5.1)).toBe('$5.10');
    });
  });

  describe('formatNumber', () => {
    it('formats an integer with thousands separators', () => {
      expect(formatNumber(1234567)).toBe('1,234,567');
    });

    it('formats a string value', () => {
      expect(formatNumber('1234567')).toBe('1,234,567');
    });

    it('limits decimals to the specified count', () => {
      expect(formatNumber(1234.5678, 2)).toBe('1,234.57');
      expect(formatNumber(1234.5678, 0)).toBe('1,235');
    });

    it('defaults to 2 decimal places', () => {
      expect(formatNumber(1234.5678)).toBe('1,234.57');
    });

    it('uses a custom locale', () => {
      expect(formatNumber(1234567, 2, 'de-DE')).toBe('1.234.567,00');
    });
  });

  describe('formatPercent', () => {
    it('formats a positive value with a + prefix', () => {
      expect(formatPercent(12.34)).toBe('+12.34%');
    });

    it('formats a negative value without a + prefix', () => {
      expect(formatPercent(-5.67)).toBe('-5.67%');
    });

    it('formats zero as positive', () => {
      expect(formatPercent(0)).toBe('+0.00%');
    });

    it('limits decimals to the specified count', () => {
      expect(formatPercent(12.3456, 3)).toBe('+12.346%');
      expect(formatPercent(12.3456, 0)).toBe('+12%');
    });

    it('defaults to 2 decimal places', () => {
      expect(formatPercent(3.1)).toBe('+3.10%');
    });
  });
});
