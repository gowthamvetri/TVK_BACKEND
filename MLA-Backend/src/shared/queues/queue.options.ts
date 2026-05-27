import { DefaultJobOptions } from 'bullmq';

export const defaultJobOptions: DefaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 5000,
  },
  removeOnComplete: 100, // Keep last 100 completed jobs
  removeOnFail: 500,     // Keep last 500 failed jobs
};
