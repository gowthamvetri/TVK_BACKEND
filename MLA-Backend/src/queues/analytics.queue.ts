import { Queue } from 'bullmq';
import { redisConnection } from '../shared/redis/connection';
import { QUEUES } from '../shared/queues/queue.constants';
import { defaultJobOptions } from '../shared/queues/queue.options';
import { IAggregateKPIsJob, IRefreshDashboardJob } from '../jobs/analytics';

type AnalyticsJob = IAggregateKPIsJob | IRefreshDashboardJob;

export const analyticsQueue = new Queue<AnalyticsJob>(QUEUES.ANALYTICS, {
  connection: redisConnection,
  defaultJobOptions,
});
