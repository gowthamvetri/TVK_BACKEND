/**
 * Workers - Cron Jobs & Background Tasks
 *
 * Lightweight scheduled tasks for free-tier deployment.
 * FUTURE UPGRADE: Replace with BullMQ workers.
 */
import cron from 'node-cron';
import analyticsService from '../modules/analytics/analytics.service';
import logger from '../shared/logger';
import fs from 'fs';
import path from 'path';

const startWorkers = () => {
  // === Daily Analytics Precomputation ===
  // Runs at midnight every day
  cron.schedule('0 0 * * *', async () => {
    logger.info('[Worker] Running daily analytics precomputation...');
    await analyticsService.precomputeDailyAnalytics();
  });

  // === Cleanup expired uploads (temp files) ===
  // Runs at 3 AM every day
  cron.schedule('0 3 * * *', async () => {
    const uploadsDir = path.join(__dirname, '../../uploads');

    try {
      if (fs.existsSync(uploadsDir)) {
        const files = fs.readdirSync(uploadsDir);
        const now = Date.now();
        let cleaned = 0;

        files.forEach((file) => {
          const filePath = path.join(uploadsDir, file);
          const stat = fs.statSync(filePath);
          const ageHours = (now - stat.mtimeMs) / (1000 * 60 * 60);

          if (ageHours > 24) {
            fs.unlinkSync(filePath);
            cleaned += 1;
          }
        });

        if (cleaned > 0) {
          logger.info(`[Worker] Cleaned ${cleaned} expired temp upload files`);
        }
      }
    } catch (error) {
      logger.error('[Worker] Upload cleanup failed:', error);
    }
  });

  logger.info('[Workers] Background workers started');
};

export default startWorkers;
