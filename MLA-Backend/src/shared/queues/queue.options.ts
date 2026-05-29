import { DefaultJobOptions, WorkerOptions } from 'bullmq';

export const defaultJobOptions: DefaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 5000,
  },
  removeOnComplete: 10, // Reduced from 100 to save memory on free tier
  removeOnFail: 50,     // Reduced from 500 to save memory on free tier
};

// Aggressively throttle Redis polling for Upstash Free Tier
export const defaultWorkerOptions: Partial<WorkerOptions> = {
  skipStalledCheck: true,
  drainDelay: 15000,
  metrics: {
    maxDataPoints: 0,
  },
};
