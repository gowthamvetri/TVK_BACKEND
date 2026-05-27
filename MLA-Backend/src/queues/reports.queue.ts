import { Queue } from 'bullmq';
import { redisConnection } from '../shared/redis/connection';
import { QUEUES } from '../shared/queues/queue.constants';
import { defaultJobOptions } from '../shared/queues/queue.options';
import { IGeneratePDFJob, IGenerateCSVJob } from '../jobs/reports';

type ReportsJob = IGeneratePDFJob | IGenerateCSVJob;

export const reportsQueue = new Queue<ReportsJob>(QUEUES.REPORTS, {
  connection: redisConnection,
  defaultJobOptions,
});
