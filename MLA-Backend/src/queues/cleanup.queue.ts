import { Queue } from 'bullmq';
import { redisConnection } from '../shared/redis/connection';
import { QUEUES } from '../shared/queues/queue.constants';
import { defaultJobOptions } from '../shared/queues/queue.options';
import { ICleanupStaleDataJob } from '../jobs/cleanup';

export const cleanupQueue = new Queue<ICleanupStaleDataJob>(QUEUES.CLEANUP, {
  connection: redisConnection,
  defaultJobOptions,
});
