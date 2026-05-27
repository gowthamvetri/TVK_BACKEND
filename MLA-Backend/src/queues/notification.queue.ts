import { Queue } from 'bullmq';
import { redisConnection } from '../shared/redis/connection';
import { QUEUES } from '../shared/queues/queue.constants';
import { defaultJobOptions } from '../shared/queues/queue.options';
import { ISendSMSJob, IWebsocketBroadcastJob } from '../jobs/notifications';

type NotificationJob = ISendSMSJob | IWebsocketBroadcastJob;

export const notificationQueue = new Queue<NotificationJob>(QUEUES.NOTIFICATIONS, {
  connection: redisConnection,
  defaultJobOptions,
});
