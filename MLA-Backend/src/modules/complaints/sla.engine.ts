/**
 * SLA Engine
 * Monitors complaint deadlines and triggers escalations on SLA breaches.
 *
 * Uses node-cron for lightweight scheduling (free-tier friendly).
 * FUTURE UPGRADE: Replace with BullMQ scheduled jobs or distributed cron.
 */
import cron from 'node-cron';
import { FilterQuery } from 'mongoose';
import complaintRepository from '../complaints/complaint.repository';
import Complaint, { IComplaint } from './Complaint.model';
import eventBus from '../../shared/events/eventBus';
import EVENTS from '../../shared/events/eventNames';
import logger from '../../shared/logger';

let isRunning = false;

/**
 * Start the SLA monitoring cron job
 * Runs every 30 minutes - lightweight for free-tier
 */
export const start = () => {
  if (isRunning) return;

  // Check SLA every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    await checkSLABreaches();
  });

  // Check for inactive complaints every hour
  cron.schedule('0 * * * *', async () => {
    await checkInactiveComplaints();
  });

  isRunning = true;
  logger.info('[SLAEngine] SLA monitoring started');
};

/**
 * Check for SLA breaches
 */
export const checkSLABreaches = async () => {
  try {
    const breachedComplaints = await complaintRepository.findSLABreached();

    for (const complaint of breachedComplaints) {
      // Mark as SLA breached
      await complaintRepository.update(complaint._id, { slaBreached: true });

      // Emit SLA breach event
      eventBus.emit(EVENTS.SLA_BREACHED, {
        complaintId: complaint._id,
        trackingId: complaint.trackingId,
        officerId: complaint.assignedOfficer,
        ward: complaint.ward,
        priority: complaint.priority,
        slaDeadline: complaint.slaDeadline,
      });

      logger.warn(`[SLAEngine] SLA breached for complaint ${complaint.trackingId}`);
    }

    if (breachedComplaints.length > 0) {
      logger.info(`[SLAEngine] ${breachedComplaints.length} SLA breaches detected`);
    }
  } catch (error) {
    logger.error('[SLAEngine] SLA check failed:', error);
  }
};

/**
 * Check for complaints with no activity
 */
export const checkInactiveComplaints = async () => {
  try {
    const inactiveComplaints = await complaintRepository.findInactive(48);

    for (const complaint of inactiveComplaints) {
      eventBus.emit(EVENTS.SLA_WARNING, {
        complaintId: complaint._id,
        trackingId: complaint.trackingId,
        officerId: complaint.assignedOfficer,
        ward: complaint.ward,
        hoursInactive: Math.round(
          (Date.now() - complaint.updatedAt.getTime()) / (1000 * 60 * 60)
        ),
      });
    }

    if (inactiveComplaints.length > 0) {
      logger.info(`[SLAEngine] ${inactiveComplaints.length} inactive complaints detected`);
    }
  } catch (error) {
    logger.error('[SLAEngine] Inactivity check failed:', error);
  }
};

/**
 * Calculate SLA metrics for analytics
 */
export const calculateSLAMetrics = async (filter: FilterQuery<IComplaint> = {}) => {
  const [total, breached, compliant] = await Promise.all([
    Complaint.countDocuments({ ...filter, slaDeadline: { $exists: true } }),
    Complaint.countDocuments({ ...filter, slaBreached: true }),
    Complaint.countDocuments({ ...filter, slaBreached: false, slaDeadline: { $exists: true } }),
  ]);

  const complianceRate = total > 0 ? ((compliant / total) * 100).toFixed(2) : "0";

  // Average resolution time for resolved complaints
  const avgResolutionPipeline = await Complaint.aggregate([
    {
      $match: {
        ...filter,
        resolvedAt: { $exists: true },
      },
    },
    {
      $project: {
        resolutionHours: {
          $divide: [{ $subtract: ['$resolvedAt', '$createdAt'] }, 3600000],
        },
      },
    },
    {
      $group: {
        _id: null,
        avgHours: { $avg: '$resolutionHours' },
      },
    },
  ]);

  return {
    total,
    breached,
    compliant,
    complianceRate: parseFloat(complianceRate as string),
    avgResolutionHours: avgResolutionPipeline[0]?.avgHours?.toFixed(2) || 0,
  };
};

export default { start, checkSLABreaches, checkInactiveComplaints, calculateSLAMetrics };
