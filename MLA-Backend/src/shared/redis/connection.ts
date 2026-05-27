import IORedis from 'ioredis';
import config from '../../config';
import logger from '../logger';

// Centralized Redis connection for all queues and workers
export const redisConnection = new IORedis(config.redis.url || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

redisConnection.on('error', (err) => {
  logger.error('[RedisQueueConnection] Connection error', { error: err.message });
});

redisConnection.on('ready', () => {
  logger.info('[RedisQueueConnection] Connected and ready');
});
