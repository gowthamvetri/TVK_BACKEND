import { Worker, Job } from 'bullmq';
import { defaultWorkerOptions } from '../shared/queues/queue.options';
import { redisConnection } from '../shared/redis/connection';
import { QUEUES, JOB_NAMES } from '../shared/queues/queue.constants';
import { ISendSMSJob, IWebsocketBroadcastJob } from '../jobs/notifications';
import logger from '../shared/logger';
import smsService from '../shared/services/sms.service';
import { getIO } from '../websocket'; // Assuming getIO is exported

type NotificationJob = ISendSMSJob | IWebsocketBroadcastJob;

export const notificationWorker = new Worker<NotificationJob>(
  QUEUES.NOTIFICATIONS,
  async (job: Job<NotificationJob>) => {
    logger.info('[NotificationWorker] Processing job', { jobId: job.id, name: job.name });

    if (job.name === JOB_NAMES.SEND_SMS) {
      const data = job.data as ISendSMSJob;
      logger.info(`[NotificationWorker] Pretending to send SMS to ${data.phone}: ${data.message}`);
      return { success: true };
    }

    if (job.name === JOB_NAMES.WEBSOCKET_BROADCAST) {
      const data = job.data as IWebsocketBroadcastJob;
      const io = getIO();
      if (!io) {
        throw new Error('Socket.IO is not initialized yet');
      }
      
      if (data.room) {
        io.to(data.room).emit(data.event, data.payload);
      } else {
        io.emit(data.event, data.payload);
      }
      return { success: true };
    }

    throw new Error(`Unknown job name: ${job.name}`);
  },
  {
    connection: redisConnection,
    ...defaultWorkerOptions,
    concurrency: 10, // Notifications can be highly concurrent
  }
);

notificationWorker.on('failed', (job, err) => {
  logger.error('[NotificationWorker] Job failed', {
    jobId: job?.id,
    name: job?.name,
    error: err.message,
    attempts: job?.attemptsMade,
  });
});
