import IORedis from 'ioredis';
import config from '../../config';
import logger from '../logger';

// Centralized Redis connection for all queues and workers
export const redisConnection = new IORedis(config.redis.url || 'redis://localhost:6379', {
  maxRetriesPerRequest: config.redis.enabled ? null : 0,
  enableReadyCheck: false,
  retryStrategy: config.redis.enabled ? undefined : () => null,
});

redisConnection.on('error', (err) => {
  logger.error('[RedisQueueConnection] Connection error', { error: err.message });
});

redisConnection.on('ready', () => {
  logger.info('[RedisQueueConnection] Connected and ready');
});
