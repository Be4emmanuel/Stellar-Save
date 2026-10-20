/**
 * Centralized cache configuration and constants.
 *
 * Consolidates TTL values and cache key prefixes across the application
 * to ensure consistency and make maintenance easier.
 */

/**
 * Cache TTL (Time-To-Live) values in seconds, organized by domain/use case.
 */
export const CACHE_TTL_SECONDS = {
  // ── Default ────────────────────────────────────────────────────────────────
  DEFAULT: 3600, // 1 hour

  // ── Analytics ──────────────────────────────────────────────────────────────
  ANALYTICS_HTTP_RESPONSE: 3600, // 1 hour - HTTP response caching for analytics endpoints
  ANALYTICS_PLATFORM_STATS: 3600, // 1 hour - platform-wide statistics
  ANALYTICS_USER_STATS: 3600, // 1 hour - user-specific statistics

  // ── Group State ────────────────────────────────────────────────────────────
  GROUP_STATE: 10, // 10 seconds - short-lived group state cache

  // ── IPFS Metadata ──────────────────────────────────────────────────────────
  IPFS_GROUP_METADATA: 300, // 5 minutes - IPFS group metadata cache

  // ── Cache Warming ──────────────────────────────────────────────────────────
  CACHE_WARMING_DEFAULT: 3600, // 1 hour - default for cache warming jobs
} as const;

/**
 * Cache key prefixes, organized by domain/use case.
 * Ensures consistent, namespaced key construction across modules.
 */
export const CACHE_KEY_PREFIXES = {
  // ── HTTP/Analytics ────────────────────────────────────────────────────────
  HTTP_CACHE: 'http_cache',
  ANALYTICS: 'analytics',

  // ── Group State ────────────────────────────────────────────────────────────
  GROUP_STATE: 'group_state',

  // ── IPFS ───────────────────────────────────────────────────────────────────
  IPFS_GROUP_CID: 'ipfs:group:cid',
  IPFS_GROUP_METADATA: 'ipfs:group:cache',

  // ── Cache Warming ──────────────────────────────────────────────────────────
  CACHE_WARMING: 'cache',
} as const;

/**
 * Separator used in multi-part cache keys.
 */
export const CACHE_KEY_SEPARATOR = ':' as const;
