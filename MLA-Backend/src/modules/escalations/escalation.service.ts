/**
 * Escalation Service
 * Handles complaint escalation through the governance hierarchy.
 * 
 * Escalation Chain: Service Officer → Ward Councillor → MLA
 */
import mongoose, { FilterQuery } from 'mongoose';
import Escalation, { IEscalation } from './Escalation.model';
import complaintRepository from '../complaints/complaint.repository';
import userRepository from '../users/user.repository';
import { COMPLAINT_STATUS } from '../../shared/constants';
import eventBus from '../../shared/events/eventBus';
import EVENTS from '../../shared/events/eventNames';
import logger from '../../shared/logger';
import { NotFoundError } from '../../shared/utils/errors';
import { buildPaginationQuery, PaginationQuery } from '../../shared/utils/helpers';

/**
 * Escalate a complaint to the next level
 */
const escalateComplaint = async (complaintId: string, reason: string, notes: string = '', escalatedBy: string | null = null) => {
  const complaint = await complaintRepository.findById(complaintId);
  if (!complaint) throw new NotFoundError('Complaint not found');

  const currentLevel = complaint.escalationLevel || 0;
  const newLevel = currentLevel + 1;

  let fromLevel, toLevel, toUser;

  if (newLevel === 1) {
    // Escalate to Ward Councillor
    fromLevel = 'service_officer';
    toLevel = 'ward_councillor';
    toUser = await userRepository.findWardCouncillor(complaint.ward);
  } else if (newLevel === 2) {
    // Escalate to MLA
    fromLevel = 'ward_councillor';
    toLevel = 'mla';
    toUser = await userRepository.findMLA();
  } else {
    logger.warn(`[EscalationService] Complaint ${complaintId} already at highest escalation level`);
    return null;
  }

  // Create escalation record
  const complaintObjectId = new mongoose.Types.ObjectId(complaintId);
  const escalation = await Escalation.create({
    complaint: complaintObjectId,
    fromLevel,
    toLevel,
    fromUser: complaint.assignedOfficer?._id || complaint.assignedOfficer,
    toUser: toUser?._id,
    reason,
    notes,
  });

  // Update complaint
  await complaintRepository.update(complaintId, {
    escalationLevel: newLevel,
    isEscalated: true,
    status: COMPLAINT_STATUS.ESCALATED,
  });

  // Record status change
  await complaintRepository.addStatusHistory({
    complaint: complaintObjectId,
    fromStatus: complaint.status,
    toStatus: COMPLAINT_STATUS.ESCALATED,
    changedBy: escalatedBy ? new mongoose.Types.ObjectId(escalatedBy) : (complaint.assignedOfficer?._id || complaint.assignedOfficer),
    changedByRole: 'system',
    notes: `Escalated to ${toLevel}: ${reason}`,
  });

  // Emit escalation event
  eventBus.emit(EVENTS.ESCALATION_TRIGGERED, {
    complaintId,
    escalationId: escalation._id,
    fromLevel,
    toLevel,
    toUserId: toUser?._id,
    reason,
  });

  logger.info(`[EscalationService] Complaint ${complaintId} escalated from ${fromLevel} to ${toLevel}`);

  return escalation;
};

/**
 * Resolve an escalation
 */
const resolveEscalation = async (escalationId: string, resolvedById: string) => {
  const escalation = await Escalation.findByIdAndUpdate(
    escalationId,
    {
      isResolved: true,
      resolvedAt: new Date(),
      resolvedBy: new mongoose.Types.ObjectId(resolvedById),
    },
    { new: true }
  );

  if (escalation) {
    eventBus.emit(EVENTS.ESCALATION_RESOLVED, {
      escalationId,
      complaintId: escalation.complaint,
    });
  }

  return escalation;
};

export interface IEscalationQuery extends PaginationQuery {
  isResolved?: string;
  [key: string]: unknown;
}

export interface IEscalationAuthUser {
  id: string;
  role: string;
}

/**
 * Get escalations for a user (based on their role level)
 */
const getEscalations = async (query: IEscalationQuery, userContext: IEscalationAuthUser) => {
  const { page, limit, skip, sort } = buildPaginationQuery(query);
  const filter: FilterQuery<IEscalation> = {};

  if (userContext.role === 'ward_councillor') {
    filter.toLevel = 'ward_councillor';
    filter.toUser = userContext.id;
  } else if (userContext.role === 'mla') {
    // MLA sees all escalations
  }

  if (query.isResolved !== undefined) {
    filter.isResolved = query.isResolved === 'true';
  }

  const [data, total] = await Promise.all([
    Escalation.find(filter)
      .populate('complaint', 'trackingId title category priority status ward')
      .populate('fromUser', 'name role')
      .populate('toUser', 'name role')
      .sort(sort)
      .skip(skip)
      .limit(limit),
    Escalation.countDocuments(filter),
  ]);

  return { data, total, page, limit };
};

/**
 * Get escalation history for a complaint
 */
const getComplaintEscalations = async (complaintId: string) => {
  return Escalation.find({ complaint: complaintId })
    .populate('fromUser', 'name role')
    .populate('toUser', 'name role')
    .populate('resolvedBy', 'name role')
    .sort('createdAt');
};

const escalationService = {
  escalateComplaint,
  resolveEscalation,
  getEscalations,
  getComplaintEscalations,
};

export default escalationService;
