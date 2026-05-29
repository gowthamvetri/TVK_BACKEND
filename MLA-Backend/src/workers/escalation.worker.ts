import { Worker, Job } from 'bullmq';
import { defaultWorkerOptions } from '../shared/queues/queue.options';
import { redisConnection } from '../shared/redis/connection';
import { QUEUES, JOB_NAMES } from '../shared/queues/queue.constants';
import { ISLACheckJob, IAutoEscalateJob } from '../jobs/escalations';
import logger from '../shared/logger';
// import escalationService from '../modules/escalations/escalation.service'; // We will wire this up properly later, for now we log it.

type EscalationJob = ISLACheckJob | IAutoEscalateJob;

export const escalationWorker = new Worker<EscalationJob>(
  QUEUES.ESCALATIONS,
  async (job: Job<EscalationJob>) => {
    logger.info('[EscalationWorker] Processing job', { jobId: job.id, name: job.name });

    if (job.name === JOB_NAMES.SLA_CHECK) {
      const data = job.data as ISLACheckJob;
      // Trigger SLA check logic
      logger.info('[EscalationWorker] SLA Check triggered', { complaintId: data.complaintId });
      // await escalationService.checkAndEscalate(data.complaintId);
      return { success: true };
    }

    if (job.name === JOB_NAMES.AUTO_ESCALATE) {
      const data = job.data as IAutoEscalateJob;
      logger.info('[EscalationWorker] Auto escalate triggered', { complaintId: data.complaintId });
      return { success: true };
    }

    throw new Error(`Unknown job name: ${job.name}`);
  },
  {
    connection: redisConnection,
    ...defaultWorkerOptions,
    concurrency: 2, // Process fewer SLA checks concurrently to avoid DB locks
  }
);

escalationWorker.on('failed', (job, err) => {
  logger.error('[EscalationWorker] Job failed', {
    jobId: job?.id,
    name: job?.name,
    error: err.message,
    attempts: job?.attemptsMade,
  });
});
