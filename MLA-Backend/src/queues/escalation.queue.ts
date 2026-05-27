import { Queue } from 'bullmq';
import { redisConnection } from '../shared/redis/connection';
import { QUEUES } from '../shared/queues/queue.constants';
import { defaultJobOptions } from '../shared/queues/queue.options';
import { ISLACheckJob, IAutoEscalateJob } from '../jobs/escalations';

type EscalationJob = ISLACheckJob | IAutoEscalateJob;

export const escalationQueue = new Queue<EscalationJob>(QUEUES.ESCALATIONS, {
  connection: redisConnection,
  defaultJobOptions,
});
