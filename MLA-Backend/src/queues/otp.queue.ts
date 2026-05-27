import { Queue } from 'bullmq';
import { redisConnection } from '../shared/redis/connection';
import { QUEUES } from '../shared/queues/queue.constants';
import { defaultJobOptions } from '../shared/queues/queue.options';
import { ISendOTPJob } from '../jobs/otp';

export const otpQueue = new Queue<ISendOTPJob>(QUEUES.OTP, {
  connection: redisConnection,
  defaultJobOptions,
});
