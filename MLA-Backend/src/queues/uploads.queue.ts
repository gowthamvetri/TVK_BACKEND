import { Queue } from 'bullmq';
import { redisConnection } from '../shared/redis/connection';
import { QUEUES } from '../shared/queues/queue.constants';
import { defaultJobOptions } from '../shared/queues/queue.options';
import { IProcessImageJob } from '../jobs/uploads';

export const uploadsQueue = new Queue<IProcessImageJob>(QUEUES.UPLOADS, {
  connection: redisConnection,
  defaultJobOptions,
});
