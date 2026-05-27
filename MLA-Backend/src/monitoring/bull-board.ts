import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import * as queues from '../queues';
import logger from '../shared/logger';

// Setup Express Adapter
export const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

// Setup Bull Board
const bullBoard = createBullBoard({
  queues: [
    new BullMQAdapter(queues.otpQueue),
    new BullMQAdapter(queues.notificationQueue),
    new BullMQAdapter(queues.escalationQueue),
    new BullMQAdapter(queues.analyticsQueue),
    new BullMQAdapter(queues.reportsQueue),
    new BullMQAdapter(queues.uploadsQueue),
    new BullMQAdapter(queues.cleanupQueue),
  ],
  serverAdapter: serverAdapter,
});

logger.info('[BullBoard] Monitoring dashboard initialized');

export default serverAdapter;
