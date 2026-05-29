import { Worker, Job } from 'bullmq';
import { defaultWorkerOptions } from '../shared/queues/queue.options';
import { redisConnection } from '../shared/redis/connection';
import { QUEUES, JOB_NAMES } from '../shared/queues/queue.constants';
import { IAggregateKPIsJob, IRefreshDashboardJob } from '../jobs/analytics';
import logger from '../shared/logger';

type AnalyticsJob = IAggregateKPIsJob | IRefreshDashboardJob;

export const analyticsWorker = new Worker<AnalyticsJob>(
  QUEUES.ANALYTICS,
  async (job: Job<AnalyticsJob>) => {
    logger.info('[AnalyticsWorker] Processing job', { jobId: job.id, name: job.name });

    if (job.name === JOB_NAMES.AGGREGATE_KPIS) {
      const data = job.data as IAggregateKPIsJob;
      // TODO: Wire up actual aggregate service logic
      logger.info('[AnalyticsWorker] Aggregating KPIs', data);
      return { success: true };
    }

    if (job.name === JOB_NAMES.REFRESH_DASHBOARD) {
      // TODO: Call dashboard refresh service
      logger.info('[AnalyticsWorker] Refreshing Dashboard');
      return { success: true };
    }

    throw new Error(`Unknown job name: ${job.name}`);
  },
  {
    connection: redisConnection,
    ...defaultWorkerOptions,
    concurrency: 1, // Heavy DB aggregation, limit concurrency
  }
);

analyticsWorker.on('failed', (job, err) => {
  logger.error('[AnalyticsWorker] Job failed', {
    jobId: job?.id,
    name: job?.name,
    error: err.message,
  });
});
