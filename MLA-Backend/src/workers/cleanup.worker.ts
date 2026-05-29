import { Worker, Job } from 'bullmq';
import { defaultWorkerOptions } from '../shared/queues/queue.options';
import { redisConnection } from '../shared/redis/connection';
import { QUEUES, JOB_NAMES } from '../shared/queues/queue.constants';
import { ICleanupStaleDataJob } from '../jobs/cleanup';
import logger from '../shared/logger';
import authRepository from '../modules/auth/auth.repository'; // Example

export const cleanupWorker = new Worker<ICleanupStaleDataJob>(
  QUEUES.CLEANUP,
  async (job: Job<ICleanupStaleDataJob>) => {
    logger.info('[CleanupWorker] Processing job', { jobId: job.id, name: job.name });

    if (job.name === JOB_NAMES.CLEANUP_STALE_DATA) {
      if (job.data.type === 'otp') {
        // Mongoose TTL index normally handles this
        logger.info('[CleanupWorker] OTP cleanup skipped due to Mongo TTL indices');
      }
      return { success: true };
    }

    throw new Error(`Unknown job name: ${job.name}`);
  },
  {
    connection: redisConnection,
    ...defaultWorkerOptions,
    concurrency: 1,
  }
);

cleanupWorker.on('failed', (job, err) => {
  logger.error('[CleanupWorker] Job failed', {
    jobId: job?.id,
    name: job?.name,
    error: err.message,
  });
});
