import { Worker, Job } from 'bullmq';
import { defaultWorkerOptions } from '../shared/queues/queue.options';
import { redisConnection } from '../shared/redis/connection';
import { QUEUES, JOB_NAMES } from '../shared/queues/queue.constants';
import { ISendOTPJob } from '../jobs/otp';
import smsService from '../shared/services/sms.service';
import logger from '../shared/logger';

export const otpWorker = new Worker<ISendOTPJob>(
  QUEUES.OTP,
  async (job: Job<ISendOTPJob>) => {
    logger.info('[OTPWorker] Processing job', { jobId: job.id, name: job.name });

    if (job.name === JOB_NAMES.SEND_OTP || job.name === JOB_NAMES.RESEND_OTP) {
      const { phone, otp, purpose } = job.data;
      await smsService.sendOTP(phone, otp, purpose as any);
      logger.info('[OTPWorker] OTP sent successfully', { jobId: job.id, phone, purpose });
      return { success: true, phone, purpose };
    }

    throw new Error(`Unknown job name: ${job.name}`);
  },
  {
    connection: redisConnection,
    ...defaultWorkerOptions,
    concurrency: 5,
  }
);

otpWorker.on('failed', (job, err) => {
  logger.error('[OTPWorker] Job failed', {
    jobId: job?.id,
    name: job?.name,
    error: err.message,
    attempts: job?.attemptsMade,
  });
});
