import { Worker, Job } from 'bullmq';
import { redisConnection } from '../shared/redis/connection';
import { QUEUES, JOB_NAMES } from '../shared/queues/queue.constants';
import { IGeneratePDFJob, IGenerateCSVJob } from '../jobs/reports';
import logger from '../shared/logger';

type ReportsJob = IGeneratePDFJob | IGenerateCSVJob;

export const reportsWorker = new Worker<ReportsJob>(
  QUEUES.REPORTS,
  async (job: Job<ReportsJob>) => {
    logger.info('[ReportsWorker] Processing job', { jobId: job.id, name: job.name });

    if (job.name === JOB_NAMES.GENERATE_PDF) {
      // PDF logic
      return { success: true };
    }

    if (job.name === JOB_NAMES.GENERATE_CSV) {
      // CSV logic
      return { success: true };
    }

    throw new Error(`Unknown job name: ${job.name}`);
  },
  {
    connection: redisConnection,
    concurrency: 2,
  }
);

reportsWorker.on('failed', (job, err) => {
  logger.error('[ReportsWorker] Job failed', {
    jobId: job?.id,
    name: job?.name,
    error: err.message,
  });
});
