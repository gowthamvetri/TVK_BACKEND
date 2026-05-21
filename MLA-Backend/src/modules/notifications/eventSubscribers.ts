/**
 * Event Subscribers
 * Connects internal events to notification delivery.
 * This is the glue between domain events and side effects.
 */
import eventBus from '../../shared/events/eventBus';
import EVENTS from '../../shared/events/eventNames';
import notificationService from './notification.service';
import assignmentService from '../assignments/assignment.service';
import escalationService from '../escalations/escalation.service';
import userRepository from '../users/user.repository';
import logger from '../../shared/logger';
import mongoose from 'mongoose';

interface ComplaintCreatedPayload {
  complaintId: string;
  category: string;
  ward: number;
  priority: string;
}

interface AssignmentCreatedPayload {
  complaintId: string;
  officerId: string | mongoose.Types.ObjectId;
  officerName: string;
}

interface ComplaintStatusChangedPayload {
  complaintId: string;
  fromStatus: string;
  toStatus: string;
  citizenId: string | mongoose.Types.ObjectId;
  officerId?: string | mongoose.Types.ObjectId;
}

interface ComplaintResolvedPayload {
  complaintId: string;
  complaint: {
    citizen?: { _id?: string | mongoose.Types.ObjectId } | string | mongoose.Types.ObjectId;
    ward: number;
  };
}

interface SlaBreachedPayload {
  complaintId: string;
  officerId?: string | mongoose.Types.ObjectId;
  ward: number;
  trackingId: string;
}

interface EscalationTriggeredPayload {
  complaintId: string;
  toUserId?: string | mongoose.Types.ObjectId;
  toLevel: string;
  reason: string;
}
const toRecipientId = (value?: string | mongoose.Types.ObjectId) => (value ? value.toString() : undefined);

const resolveCitizenId = (citizen: ComplaintResolvedPayload['complaint']['citizen']) => {
  if (!citizen) return undefined;
  if (typeof citizen === 'string') return citizen;
  if (citizen instanceof mongoose.Types.ObjectId) return citizen.toString();
  if (typeof citizen === 'object' && '_id' in citizen && citizen._id) {
    return citizen._id.toString();
  }
  return undefined;
};

interface AnnouncementCreatedPayload {
  announcement: { title: string };
}

const registerEventSubscribers = () => {
  // === Complaint Created -> Auto-assign ===
  eventBus.on(EVENTS.COMPLAINT_CREATED, async (payload) => {
    const { complaintId, category, ward, priority } = payload as ComplaintCreatedPayload;
    try {
      await assignmentService.autoAssign(complaintId, category, ward);
    } catch (error) {
      logger.error('[EventSubscriber] Auto-assignment failed:', error);
    }
  });

  // === Complaint Assigned -> Notify officer ===
  eventBus.on(EVENTS.ASSIGNMENT_CREATED, async (payload) => {
    const { complaintId, officerId } = payload as AssignmentCreatedPayload;
    const recipientId = toRecipientId(officerId);
    if (!recipientId) return;
    await notificationService.sendNotification({
      recipientId,
      title: 'New Complaint Assigned',
      body: 'A new complaint has been assigned to you.',
      type: 'complaint_assigned',
      data: { complaintId },
      channels: ['in_app'],
    });
  });

  // === Status Changed -> Notify citizen ===
  eventBus.on(EVENTS.COMPLAINT_STATUS_CHANGED, async (payload) => {
    const { complaintId, fromStatus, toStatus, citizenId } = payload as ComplaintStatusChangedPayload;
    const recipientId = toRecipientId(citizenId);
    if (!recipientId) return;
    await notificationService.sendNotification({
      recipientId,
      title: 'Complaint Status Updated',
      body: `Your complaint status changed from "${fromStatus}" to "${toStatus}".`,
      type: 'complaint_status_changed',
      data: { complaintId, fromStatus, toStatus },
      channels: ['in_app'],
    });
  });

  // === Complaint Resolved -> Notify citizen + ward councillor ===
  eventBus.on(EVENTS.COMPLAINT_RESOLVED, async (payload) => {
    const { complaintId, complaint } = payload as ComplaintResolvedPayload;
    const citizenId = resolveCitizenId(complaint.citizen);
    const ward = complaint.ward;
    if (!citizenId) return;
    await notificationService.sendNotification({
      recipientId: citizenId,
      title: 'Complaint Resolved',
      body: 'Your complaint has been resolved. Please verify the resolution.',
      type: 'complaint_resolved',
      data: { complaintId },
      channels: ['in_app'],
    });

    const wardCouncillor = await userRepository.findWardCouncillor(ward);
    if (wardCouncillor) {
      await notificationService.sendNotification({
        recipientId: wardCouncillor._id.toString(),
        title: 'Complaint Resolved - Verification Needed',
        body: 'A complaint in your ward has been resolved and needs verification.',
        type: 'complaint_resolved_verification',
        data: { complaintId, ward },
        channels: ['in_app'],
      });
    }
  });

  // === SLA Breached -> Escalate + notify ===
  eventBus.on(EVENTS.SLA_BREACHED, async (payload) => {
    const { complaintId, officerId, trackingId } = payload as SlaBreachedPayload;
    try {
      // Auto-escalate on SLA breach
      await escalationService.escalateComplaint(complaintId, 'sla_breach', `SLA deadline exceeded for ${trackingId}`);

      // Notify officer
      const recipientId = toRecipientId(officerId);
      if (recipientId) {
        await notificationService.sendNotification({
          recipientId,
          title: 'SLA Breach Alert',
          body: `Complaint ${trackingId} has breached its SLA deadline.`,
          type: 'sla_breached',
          data: { complaintId },
          channels: ['in_app'],
        });
      }
    } catch (error) {
      logger.error('[EventSubscriber] SLA breach handling failed:', error);
    }
  });

  // === Escalation Triggered -> Notify target user ===
  eventBus.on(EVENTS.ESCALATION_TRIGGERED, async (payload) => {
    const { complaintId, toUserId, toLevel, reason } = payload as EscalationTriggeredPayload;
    const recipientId = toRecipientId(toUserId);
    if (recipientId) {
      await notificationService.sendNotification({
        recipientId,
        title: 'Complaint Escalated to You',
        body: `A complaint has been escalated to you (${toLevel}). Reason: ${reason}`,
        type: 'complaint_escalated',
        data: { complaintId, reason },
        channels: ['in_app'],
      });
    }
  });

  // === Announcement Created -> Notify citizens ===
  eventBus.on(EVENTS.ANNOUNCEMENT_CREATED, async (payload) => {
    const { announcement } = payload as AnnouncementCreatedPayload;
    // This would broadcast to all citizens or ward-specific citizens
    // For now, emit via Socket.IO broadcast
    logger.info(`[EventSubscriber] Announcement broadcast: ${announcement.title}`);
  });

  logger.info('[EventSubscribers] All event subscribers registered');
};

export default registerEventSubscribers;
