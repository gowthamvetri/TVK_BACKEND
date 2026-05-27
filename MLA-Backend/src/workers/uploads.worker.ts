import { Worker, Job } from 'bullmq';
import { redisConnection } from '../shared/redis/connection';
import { QUEUES, JOB_NAMES } from '../shared/queues/queue.constants';
import { IProcessImageJob } from '../jobs/uploads';
import logger from '../shared/logger';

export const uploadsWorker = new Worker<IProcessImageJob>(
  QUEUES.UPLOADS,
  async (job: Job<IProcessImageJob>) => {
    logger.info('[UploadsWorker] Processing job', { jobId: job.id, name: job.name });

    if (job.name === JOB_NAMES.PROCESS_IMAGE) {
      // Image compression and Cloudinary async upload logic
      return { success: true };
    }

    throw new Error(`Unknown job name: ${job.name}`);
  },
  {
    connection: redisConnection,
    concurrency: 5,
  }
);

uploadsWorker.on('failed', (job, err) => {
  logger.error('[UploadsWorker] Job failed', {
    jobId: job?.id,
    name: job?.name,
    error: err.message,
  });
});
