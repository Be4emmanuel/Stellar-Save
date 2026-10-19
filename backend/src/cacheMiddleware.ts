/**
 * Cache middleware for Express applications.
 *
 * Provides HTTP response caching middleware and utilities.
 * Core cache operations are delegated to the shared redis module.
 */

export { get, set, del, delPattern, recordHit, recordMiss, getCacheStats } from './redis';
