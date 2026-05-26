/**
 * Cache Service
 * Core caching operations with error handling and database fallback
 * Implements Cache-Aside pattern with graceful degradation
 */

import logger from '../logger';
import redisManager from './connection';
import { CacheResult, CacheOptions, CacheMonitoringEvent, CacheStats } from './types';
import Redis from 'ioredis';

export class CacheService {
  private static readonly DEFAULT_TTL = 3600; // 1 hour
  private client: Redis | null = null;
  private monitoringCallbacks: ((event: CacheMonitoringEvent) => void)[] = [];
  private performanceMetrics = {
    totalCacheOps: 0,
    cacheHits: 0,
    cacheMisses: 0,
    cacheErrors: 0,
    totalCacheTime: 0,
  };

  constructor() {
    this.initialize();
  }

  /**
   * Initialize cache service
   */
  private async initialize(): Promise<void> {
    this.client = await redisManager.connect();
    if (this.client) {
      logger.info('Cache Service initialized');
    } else {
      logger.warn('Cache Service running in degraded mode (Redis unavailable)');
    }
  }

  /**
   * Ensure Redis connection is ready, with exponential backoff
   */
  private async ensureConnected(): Promise<Redis | null> {
    if (this.client) {
      try {
        await this.client.ping();
        return this.client;
      } catch {
        // Connection might be stale
      }
    }

    this.client = await redisManager.connect();
    return this.client;
  }

  /**
   * Get value from cache with error handling
   * Returns null if cache miss or Redis unavailable
   */
  async get<T = any>(key: string): Promise<CacheResult<T>> {
    const startTime = Date.now();

    try {
      const client = await this.ensureConnected();

      if (!client) {
        // Redis unavailable - will fetch from database
        return {
          data: null,
          hit: false,
          source: 'database',
          timestamp: Date.now(),
        };
      }

      const value = await client.getBuffer(key);
      const duration = Date.now() - startTime;

      if (value) {
        try {
          const data = JSON.parse(value.toString());
          const ttl = await client.ttl(key);

          this.performanceMetrics.cacheHits++;
          this.performanceMetrics.totalCacheTime += duration;
          this.emit('get', key, true, duration, value.length);

          logger.debug('Cache hit', { key, duration, ttl });

          return {
            data,
            hit: true,
            source: 'cache',
            timestamp: Date.now(),
            ttl: ttl > 0 ? ttl : undefined,
          };
        } catch (parseError) {
          logger.warn('Failed to parse cached value', { key, error: parseError });
          // If parse fails, treat as miss and delete corrupt data
          try {
            await client.del(key);
          } catch {
            // Ignore delete errors
          }

          return {
            data: null,
            hit: false,
            source: 'database',
            timestamp: Date.now(),
          };
        }
      }

      this.performanceMetrics.cacheMisses++;
      this.performanceMetrics.totalCacheTime += duration;
      this.emit('get', key, false, duration);

      logger.debug('Cache miss', { key, duration });

      return {
        data: null,
        hit: false,
        source: 'database',
        timestamp: Date.now(),
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.performanceMetrics.cacheErrors++;
      this.performanceMetrics.totalCacheTime += duration;
      this.emit('get', key, false, duration, undefined, error);

      logger.error('Cache get error', {
        key,
        error: error instanceof Error ? error.message : String(error),
      });

      // Graceful degradation - return miss indicator to fetch from DB
      return {
        data: null,
        hit: false,
        source: 'database',
        timestamp: Date.now(),
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Set value in cache with TTL
   */
  async set<T = any>(
    key: string,
    value: T,
    options?: CacheOptions
  ): Promise<boolean> {
    const startTime = Date.now();

    try {
      const client = await this.ensureConnected();

      if (!client) {
        logger.debug('Cache set skipped - Redis unavailable', { key });
        return false;
      }

      const ttl = options?.ttl || CacheService.DEFAULT_TTL;
      const serialized = JSON.stringify(value);

      await client.setex(key, ttl, serialized);

      const duration = Date.now() - startTime;
      this.emit('set', key, true, duration, serialized.length);

      logger.debug('Cache set', { key, ttl, duration });

      return true;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.emit('set', key, false, duration, undefined, error);

      logger.error('Cache set error', {
        key,
        error: error instanceof Error ? error.message : String(error),
      });

      return false;
    }
  }

  /**
   * Get-or-set pattern (cache-aside): Try cache, fallback to fetcher function
   * Prevents cache stampede with optional locking
   */
  async getOrSet<T = any>(
    key: string,
    fetcher: () => Promise<T>,
    options?: CacheOptions & { useLock?: boolean }
  ): Promise<T> {
    // Try cache first
    const cached = await this.get<T>(key);
    if (cached.hit && cached.data !== null) {
      return cached.data;
    }

    // Use lock to prevent cache stampede
    if (options?.useLock) {
      const lockKey = `${key}:lock`;
      const lockValue = Date.now().toString();
      const lockTTL = 5; // 5 seconds

      try {
        const lockSet = await this.setIfNotExists(lockKey, lockValue, lockTTL);

        if (!lockSet) {
          // Another request is fetching, wait and retry from cache
          await this.wait(200);
          const retryCache = await this.get<T>(key);
          if (retryCache.hit && retryCache.data !== null) {
            return retryCache.data;
          }
        }

        // We have the lock, fetch from source
        const data = await fetcher();

        // Store in cache
        await this.set(key, data, options);

        // Release lock
        await this.delete(lockKey);

        return data;
      } catch (error) {
        logger.error('Cache get-or-set with lock failed', {
          key,
          error: error instanceof Error ? error.message : String(error),
        });

        // Fall back to direct fetch without lock
        const data = await fetcher();
        await this.set(key, data, options);
        return data;
      }
    }

    // Standard get-or-set without lock
    const data = await fetcher();
    await this.set(key, data, options);
    return data;
  }

  /**
   * Delete cache key
   */
  async delete(key: string): Promise<boolean> {
    try {
      const client = await this.ensureConnected();

      if (!client) {
        logger.debug('Cache delete skipped - Redis unavailable', { key });
        return false;
      }

      const result = await client.del(key);
      this.emit('del', key, true, 0);

      logger.debug('Cache delete', { key, result });

      return result > 0;
    } catch (error) {
      this.emit('del', key, false, 0, undefined, error);

      logger.error('Cache delete error', {
        key,
        error: error instanceof Error ? error.message : String(error),
      });

      return false;
    }
  }

  /**
   * Delete multiple keys matching a pattern
   */
  async deletePattern(pattern: string): Promise<number> {
    try {
      const client = await this.ensureConnected();

      if (!client) {
        logger.debug('Cache delete pattern skipped - Redis unavailable', { pattern });
        return 0;
      }

      const keys = await client.keys(pattern);

      if (keys.length === 0) {
        return 0;
      }

      const result = await client.del(...keys);

      logger.debug('Cache pattern delete', { pattern, keysDeleted: result });

      return result;
    } catch (error) {
      logger.error('Cache delete pattern error', {
        pattern,
        error: error instanceof Error ? error.message : String(error),
      });

      return 0;
    }
  }

  /**
   * Clear all cache (use with caution)
   */
  async clear(): Promise<void> {
    try {
      const client = await this.ensureConnected();

      if (!client) {
        logger.warn('Cache clear skipped - Redis unavailable');
        return;
      }

      await client.flushdb();
      logger.warn('Cache cleared completely');
    } catch (error) {
      logger.error('Cache clear error', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get multiple values
   */
  async mget<T = any>(keys: string[]): Promise<Map<string, CacheResult<T>>> {
    try {
      const client = await this.ensureConnected();
      const results = new Map<string, CacheResult<T>>();

      if (!client) {
        keys.forEach((key) => {
          results.set(key, {
            data: null,
            hit: false,
            source: 'database',
            timestamp: Date.now(),
          });
        });
        return results;
      }

      const values = await client.mget(...keys);

      keys.forEach((key, index) => {
        const value = values[index];

        if (value) {
          try {
            const data = JSON.parse(value);
            results.set(key, {
              data,
              hit: true,
              source: 'cache',
              timestamp: Date.now(),
            });
          } catch {
            results.set(key, {
              data: null,
              hit: false,
              source: 'database',
              timestamp: Date.now(),
            });
          }
        } else {
          results.set(key, {
            data: null,
            hit: false,
            source: 'database',
            timestamp: Date.now(),
          });
        }
      });

      return results;
    } catch (error) {
      logger.error('Cache mget error', {
        error: error instanceof Error ? error.message : String(error),
      });

      const results = new Map<string, CacheResult<T>>();
      keys.forEach((key) => {
        results.set(key, {
          data: null,
          hit: false,
          source: 'database',
          timestamp: Date.now(),
        });
      });

      return results;
    }
  }

  /**
   * Set multiple values atomically
   */
  async mset(
    pairs: Array<{ key: string; value: any; ttl?: number }>
  ): Promise<boolean> {
    try {
      const client = await this.ensureConnected();

      if (!client) {
        logger.debug('Cache mset skipped - Redis unavailable');
        return false;
      }

      // Use pipeline for atomic operations
      const pipeline = client.pipeline();

      pairs.forEach(({ key, value, ttl }) => {
        const serialized = JSON.stringify(value);
        if (ttl) {
          pipeline.setex(key, ttl, serialized);
        } else {
          pipeline.set(key, serialized);
        }
      });

      await pipeline.exec();

      logger.debug('Cache mset', { count: pairs.length });

      return true;
    } catch (error) {
      logger.error('Cache mset error', {
        error: error instanceof Error ? error.message : String(error),
      });

      return false;
    }
  }

  /**
   * Increment a counter
   */
  async increment(key: string, amount: number = 1): Promise<number> {
    try {
      const client = await this.ensureConnected();

      if (!client) {
        return 0;
      }

      const result = await client.incrby(key, amount);

      return result;
    } catch (error) {
      logger.error('Cache increment error', {
        key,
        error: error instanceof Error ? error.message : String(error),
      });

      return 0;
    }
  }

  /**
   * Set if not exists (NX operation)
   */
  async setIfNotExists(key: string, value: any, ttl?: number): Promise<boolean> {
    try {
      const client = await this.ensureConnected();

      if (!client) {
        return false;
      }

      const serialized = JSON.stringify(value);
      const result = await client.set(key, serialized, 'EX', ttl || 3600, 'NX');

      return result === 'OK';
    } catch (error) {
      logger.error('Cache setIfNotExists error', {
        key,
        error: error instanceof Error ? error.message : String(error),
      });

      return false;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const client = await this.ensureConnected();

      if (!client) {
        return false;
      }

      const result = await client.exists(key);

      return result > 0;
    } catch (error) {
      logger.error('Cache exists error', {
        key,
        error: error instanceof Error ? error.message : String(error),
      });

      return false;
    }
  }

  /**
   * Get remaining TTL of a key
   */
  async getTTL(key: string): Promise<number | null> {
    try {
      const client = await this.ensureConnected();

      if (!client) {
        return null;
      }

      const ttl = await client.ttl(key);

      // -1: key exists but no TTL, -2: key doesn't exist
      return ttl > 0 ? ttl : null;
    } catch (error) {
      logger.error('Cache getTTL error', {
        key,
        error: error instanceof Error ? error.message : String(error),
      });

      return null;
    }
  }

  /**
   * Set TTL for existing key
   */
  async setTTL(key: string, ttl: number): Promise<boolean> {
    try {
      const client = await this.ensureConnected();

      if (!client) {
        return false;
      }

      const result = await client.expire(key, ttl);

      return result > 0;
    } catch (error) {
      logger.error('Cache setTTL error', {
        key,
        error: error instanceof Error ? error.message : String(error),
      });

      return false;
    }
  }

  /**
   * Register monitoring callback for cache operations
   */
  onMonitor(callback: (event: CacheMonitoringEvent) => void): void {
    this.monitoringCallbacks.push(callback);
  }

  /**
   * Emit monitoring event
   */
  private emit(
    operation: 'get' | 'set' | 'del' | 'invalidate',
    key: string,
    success: boolean,
    duration: number,
    size?: number,
    error?: any
  ): void {
    this.performanceMetrics.totalCacheOps++;

    const event: CacheMonitoringEvent = {
      operation,
      key,
      success,
      duration,
      size,
      error: error ? (error instanceof Error ? error.message : String(error)) : undefined,
      timestamp: Date.now(),
    };

    this.monitoringCallbacks.forEach((callback) => {
      try {
        callback(event);
      } catch (err) {
        logger.error('Error in monitoring callback', { error: err });
      }
    });
  }

  /**
   * Get performance metrics
   */
  getMetrics() {
    const hitRate =
      this.performanceMetrics.totalCacheOps > 0
        ? (this.performanceMetrics.cacheHits / this.performanceMetrics.totalCacheOps) * 100
        : 0;

    return {
      ...this.performanceMetrics,
      hitRate: hitRate.toFixed(2) + '%',
      avgTimePerOp:
        this.performanceMetrics.totalCacheOps > 0
          ? (this.performanceMetrics.totalCacheTime /
              this.performanceMetrics.totalCacheOps).toFixed(2) + 'ms'
          : '0ms',
    };
  }

  /**
   * Get health status
   */
  async health(): Promise<{ status: string; message?: string }> {
    const isHealthy = await redisManager.health();

    if (isHealthy) {
      return { status: 'healthy' };
    }

    return { status: 'degraded', message: 'Redis unavailable - falling back to database' };
  }

  /**
   * Utility: Wait for a given duration
   */
  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Singleton instance
export const cacheService = new CacheService();

export default cacheService;
