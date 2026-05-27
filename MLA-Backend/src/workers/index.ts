/**
 * BullMQ Distributed Workers Initialization
 */
import logger from '../shared/logger';
import { cleanupQueue, analyticsQueue } from '../queues';
import { JOB_NAMES } from '../shared/queues/queue.constants';
import './otp.worker';
import './notification.worker';
import './escalation.worker';
import './analytics.worker';
import './reports.worker';
import './uploads.worker';
import './cleanup.worker';

export const startWorkers = async () => {
  logger.info('[Workers] All BullMQ workers have been initialized and are ready to process distributed jobs.');

  // Setup repeatable jobs
  await cleanupQueue.add(
    JOB_NAMES.CLEANUP_STALE_DATA,
    { type: 'otp' },
    { repeat: { pattern: '0 3 * * *' } } // 3 AM every day
  );

  await analyticsQueue.add(
    JOB_NAMES.AGGREGATE_KPIS,
    { period: 'daily' },
    { repeat: { pattern: '0 0 * * *' } } // Midnight every day
  );

  logger.info('[Workers] Repeatable jobs registered.');
};
