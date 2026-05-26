/**
 * Cache Layer - Type Definitions
 * All TypeScript interfaces and types for cache operations
 */

import Redis from 'ioredis';

/**
 * Cache operation result with metadata
 */
export interface CacheResult<T = any> {
  data: T | null;
  hit: boolean;
  source: 'cache' | 'database' | 'error';
  timestamp: number;
  ttl?: number;
  error?: Error;
}

/**
 * Cache operation options
 */
export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  tag?: string; // For grouping related cache entries
  compressed?: boolean; // Enable compression for large data
  serialize?: boolean; // Custom serialization
}

/**
 * Cache key metadata
 */
export interface CacheKeyMetadata {
  namespace: string;
  entity: string;
  id?: string | number;
  filter?: string;
  version?: number;
}

/**
 * Cache invalidation event
 */
export interface CacheInvalidationEvent {
  keys: string[];
  reason: string;
  entity: string;
  action: 'create' | 'update' | 'delete' | 'bulk';
  timestamp: number;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  hits: number;
  misses: number;
  errors: number;
  avgResponseTime: number;
  memoryUsage: number;
  hitRate: number;
}

/**
 * Cache monitoring event
 */
export interface CacheMonitoringEvent {
  operation: 'get' | 'set' | 'del' | 'invalidate';
  key: string;
  success: boolean;
  duration: number;
  size?: number;
  error?: string;
  timestamp: number;
}

/**
 * Sentinel Redis configuration (for high availability)
 */
export interface SentinelConfig {
  sentinels: Array<{
    host: string;
    port: number;
  }>;
  name: string;
  password?: string;
  sentinelPassword?: string;
}

/**
 * Cluster Redis configuration
 */
export interface ClusterConfig {
  nodes: Array<{
    host: string;
    port: number;
  }>;
  password?: string;
}

/**
 * Connection pool configuration
 */
export interface ConnectionPoolConfig {
  minIdle: number;
  maxActive: number;
  maxIdle: number;
  validationInterval: number;
}

/**
 * Redis client extended type
 */
export interface CacheClient extends Redis {
  health?: () => Promise<boolean>;
  stats?: () => Promise<CacheStats>;
}

/**
 * Cache decorator options
 */
export interface CacheDecoratorOptions {
  ttl?: number;
  key?: string;
  condition?: (args: any[]) => boolean;
  invalidateOn?: string[];
}

/**
 * Batch cache operations
 */
export interface BatchCacheOperation {
  key: string;
  value?: any;
  ttl?: number;
  operation: 'set' | 'get' | 'del';
}

/**
 * Cache performance metrics
 */
export interface CacheMetrics {
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  avgHitTime: number;
  avgMissTime: number;
  errorCount: number;
  lastReset: Date;
}

/**
 * Cache warm-up configuration
 */
export interface CacheWarmupConfig {
  enabled: boolean;
  entities: string[];
  schedules?: string[]; // Cron patterns
  batchSize?: number;
}

/**
 * Cache strategy enum
 */
export enum CacheStrategy {
  CACHE_ASIDE = 'cache-aside',
  READ_THROUGH = 'read-through',
  WRITE_THROUGH = 'write-through',
  WRITE_BEHIND = 'write-behind',
}

/**
 * Cache invalidation strategy
 */
export enum InvalidationStrategy {
  IMMEDIATE = 'immediate',
  LAZY = 'lazy',
  TTL_BASED = 'ttl-based',
  SCHEDULED = 'scheduled',
}
