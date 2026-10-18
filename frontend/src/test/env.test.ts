/**
 * env.test.ts
 *
 * Unit tests for the centralised environment-variable config module.
 * Uses vitest's vi.stubEnv / vi.unstubAllEnvs to isolate each case.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';

// Helper: re-import the module with a fresh module registry so validation
// logic re-runs under each stub scenario.
async function loadEnv() {
  // Clear the module cache so buildEnvConfig() runs again
  vi.resetModules();
  const mod = await import('../config/env');
  return mod.env;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('env config', () => {
  it('returns testnet defaults when no VITE_ vars are set', async () => {
    vi.stubEnv('VITE_STELLAR_NETWORK', '');
    vi.stubEnv('VITE_STELLAR_RPC_URL', '');
    vi.stubEnv('VITE_STELLAR_SAVE_CONTRACT_ID', '');
    vi.stubEnv('VITE_ENABLE_ERROR_REPORTING', '');
    vi.stubEnv('VITE_SENTRY_DSN', '');

    const cfg = await loadEnv();
    expect(cfg.VITE_STELLAR_NETWORK).toBe('testnet');
    expect(cfg.VITE_STELLAR_RPC_URL).toBe('https://soroban-testnet.stellar.org');
    expect(cfg.VITE_STELLAR_SAVE_CONTRACT_ID).toBe('');
    expect(cfg.VITE_ENABLE_ERROR_REPORTING).toBe(false);
    expect(cfg.VITE_SENTRY_DSN).toBe('');
  });

  it('reads VITE_STELLAR_NETWORK=mainnet correctly', async () => {
    vi.stubEnv('VITE_STELLAR_NETWORK', 'mainnet');

    const cfg = await loadEnv();
    expect(cfg.VITE_STELLAR_NETWORK).toBe('mainnet');
  });

  it('reads VITE_STELLAR_RPC_URL from env', async () => {
    vi.stubEnv('VITE_STELLAR_RPC_URL', 'https://custom-rpc.example.com');

    const cfg = await loadEnv();
    expect(cfg.VITE_STELLAR_RPC_URL).toBe('https://custom-rpc.example.com');
  });

  it('reads VITE_STELLAR_SAVE_CONTRACT_ID from env', async () => {
    vi.stubEnv('VITE_STELLAR_SAVE_CONTRACT_ID', 'CAAAA...CONTRACTID');

    const cfg = await loadEnv();
    expect(cfg.VITE_STELLAR_SAVE_CONTRACT_ID).toBe('CAAAA...CONTRACTID');
  });

  it('parses VITE_ENABLE_ERROR_REPORTING=true as boolean true', async () => {
    vi.stubEnv('VITE_ENABLE_ERROR_REPORTING', 'true');

    const cfg = await loadEnv();
    expect(cfg.VITE_ENABLE_ERROR_REPORTING).toBe(true);
  });

  it('parses VITE_ENABLE_ERROR_REPORTING=false as boolean false', async () => {
    vi.stubEnv('VITE_ENABLE_ERROR_REPORTING', 'false');

    const cfg = await loadEnv();
    expect(cfg.VITE_ENABLE_ERROR_REPORTING).toBe(false);
  });

  it('reads VITE_SENTRY_DSN from env', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://abc123@sentry.io/42');

    const cfg = await loadEnv();
    expect(cfg.VITE_SENTRY_DSN).toBe('https://abc123@sentry.io/42');
  });

  it('throws for an invalid VITE_STELLAR_NETWORK value', async () => {
    vi.stubEnv('VITE_STELLAR_NETWORK', 'stagenet');

    await expect(loadEnv()).rejects.toThrow(
      'VITE_STELLAR_NETWORK must be "mainnet" or "testnet"',
    );
  });

  it('returns a frozen object (immutable config)', async () => {
    const cfg = await loadEnv();
    expect(Object.isFrozen(cfg)).toBe(true);
  });
});
