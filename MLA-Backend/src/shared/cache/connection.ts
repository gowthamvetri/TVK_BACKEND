/**
 * Redis Connection Management
 * Handles connection pooling, retry logic, and graceful degradation
 * Ensures Redis failures don't crash the application
 */

import Redis, { Cluster, ClusterOptions, RedisOptions } from 'ioredis';
import logger from '../logger';
import config from '../../config';
import { CacheClient, CacheStats } from './types';

class RedisConnectionManager {
  private client: CacheClient | null = null;
  private isConnected = false;
  private isConnecting = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000; // Start with 1 second

  /**
   * Initialize Redis connection with retry logic
   */
  async connect(): Promise<CacheClient | null> {
    if (!config.redis.enabled) {
      logger.info('Redis caching disabled via configuration');
      return null;
    }

    if (this.isConnected && this.client) {
      return this.client;
    }

    if (this.isConnecting) {
      // Wait for ongoing connection attempt
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (this.isConnected && this.client) {
            clearInterval(checkInterval);
            resolve(this.client);
          }
        }, 100);

        // Timeout after 30 seconds
        setTimeout(() => {
          clearInterval(checkInterval);
          resolve(null);
        }, 30000);
      });
    }

    this.isConnecting = true;

    try {
      // Check if using URL format (e.g., for Upstash)
      const isUrlFormat = config.redis.url && /^rediss?:\/\//.test(config.redis.url);
      
      const commonOptions = {
        retryStrategy: this.retryStrategy.bind(this),
        enableReadyCheck: config.redis.enableReadyCheck,
        enableOfflineQueue: config.redis.enableOfflineQueue,
        connectTimeout: config.redis.connectTimeout,
        commandTimeout: config.redis.commandTimeout,
        maxRetriesPerRequest: config.redis.maxRetriesPerRequest,
        lazyConnect: false,
        keepAlive: 30000,
        reconnectOnError: (err: Error) => {
          const targetError = err.message;
          if (
            targetError.includes('READONLY') ||
            targetError.includes('CLUSTERDOWN') ||
            targetError.includes('LOADING')
          ) {
            return true;
          }
          return false;
        },
      };

      // Create Redis client with appropriate connection method
      if (isUrlFormat) {
        // For URL-based connections (Upstash, etc)
        const tlsOptions = config.redis.url.startsWith('rediss://') ? { tls: {} } : {};
        this.client = new Redis(config.redis.url, {
          ...commonOptions,
          ...tlsOptions,
        }) as CacheClient;
      } else {
        // For traditional host/port connections
        this.client = new Redis({
          host: config.redis.host,
          port: config.redis.port,
          password: config.redis.password,
          db: config.redis.db,
          family: 4,
          ...commonOptions,
        }) as CacheClient;
      }

      // Setup event handlers
      this.setupEventHandlers();

      // Wait for connection
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Redis connection timeout'));
        }, 10000);

        this.client!.on('connect', () => {
          clearTimeout(timeout);
          resolve();
        });

        this.client!.on('error', (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });

      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000;

      const connectionInfo = isUrlFormat
        ? { url: config.redis.url.replace(/:[^@]+@/, ':***@'), protocol: config.redis.url.startsWith('rediss://') ? 'rediss' : 'redis' }
        : { host: config.redis.host, port: config.redis.port };

      logger.info('✓ Redis connected successfully', connectionInfo);

      return this.client;
    } catch (error) {
      this.isConnecting = false;
      logger.warn('✗ Redis connection failed, falling back to database', {
        error: error instanceof Error ? error.message : String(error),
      });

      this.client = null;
      this.isConnected = false;
      return null;
    } finally {
      this.isConnecting = false;
    }
  }

  /**
   * Retry strategy with exponential backoff
   */
  private retryStrategy(times: number): number | null {
    const delay = Math.min(times * 50, 2000);

    if (times > this.maxReconnectAttempts) {
      logger.error('✗ Redis max reconnection attempts exceeded');
      return null; // Stop retrying
    }

    return delay;
  }

  /**
   * Setup Redis event handlers
   */
  private setupEventHandlers(): void {
    if (!this.client) return;

    this.client.on('connect', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      logger.info('Redis: Connected');
    });

    this.client.on('ready', () => {
      logger.info('Redis: Ready');
    });

    this.client.on('error', (err) => {
      logger.error('Redis error:', { error: err.message });
    });

    this.client.on('close', () => {
      this.isConnected = false;
      logger.warn('Redis: Connection closed');
    });

    this.client.on('reconnecting', () => {
      this.reconnectAttempts++;
      logger.info(`Redis: Attempting to reconnect (attempt ${this.reconnectAttempts})`);
    });

    this.client.on('end', () => {
      this.isConnected = false;
      logger.warn('Redis: Connection ended');
    });
  }

  /**
   * Get active Redis client
   */
  getClient(): CacheClient | null {
    return this.isConnected && this.client ? this.client : null;
  }

  /**
   * Check if Redis is healthy
   */
  async health(): Promise<boolean> {
    try {
      if (!this.client) return false;

      const pong = await this.client.ping();
      return pong === 'PONG';
    } catch (error) {
      logger.error('Redis health check failed:', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Get Redis connection status
   */
  getStatus(): {
    connected: boolean;
    connecting: boolean;
    reconnectAttempts: number;
  } {
    return {
      connected: this.isConnected,
      connecting: this.isConnecting,
      reconnectAttempts: this.reconnectAttempts,
    };
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats | null> {
    try {
      if (!this.client) return null;

      const info = await this.client.info('stats');
      const lines = info.split('\r\n');

      const stats: Record<string, any> = {};
      lines.forEach((line) => {
        const [key, value] = line.split(':');
        if (key && value) {
          stats[key] = isNaN(Number(value)) ? value : Number(value);
        }
      });

      return {
        hits: stats.keyspace_hits || 0,
        misses: stats.keyspace_misses || 0,
        errors: 0,
        avgResponseTime: 0,
        memoryUsage: stats.used_memory || 0,
        hitRate:
          stats.keyspace_hits && stats.keyspace_misses
            ? stats.keyspace_hits / (stats.keyspace_hits + stats.keyspace_misses)
            : 0,
      };
    } catch (error) {
      logger.error('Failed to get Redis stats:', {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Graceful shutdown
   */
  async disconnect(): Promise<void> {
    try {
      if (this.client) {
        await this.client.quit();
        this.client = null;
        this.isConnected = false;
        logger.info('Redis disconnected gracefully');
      }
    } catch (error) {
      logger.error('Error during Redis disconnect:', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Force reconnection
   */
  async reconnect(): Promise<CacheClient | null> {
    await this.disconnect();
    return this.connect();
  }

  /**
   * Flush all data (USE WITH CAUTION - development only)
   */
  async flushAll(): Promise<void> {
    try {
      if (this.client) {
        await this.client.flushall();
        logger.warn('Redis: All data flushed');
      }
    } catch (error) {
      logger.error('Error flushing Redis:', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get memory info
   */
  async getMemoryInfo(): Promise<any> {
    try {
      if (!this.client) return null;

      const info = await this.client.info('memory');
      const lines = info.split('\r\n');

      const memory: Record<string, any> = {};
      lines.forEach((line) => {
        const [key, value] = line.split(':');
        if (key && value) {
          memory[key] = value;
        }
      });

      return memory;
    } catch (error) {
      logger.error('Failed to get memory info:', {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }
}

// Singleton instance
const redisManager = new RedisConnectionManager();

export default redisManager;
