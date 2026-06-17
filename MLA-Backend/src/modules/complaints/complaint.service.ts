/**
 * Complaint Service
 * Core business logic for complaint lifecycle management.
 */
import mongoose, { FilterQuery, UpdateQuery } from 'mongoose';
import complaintRepository from './complaint.repository';
import { IComplaint } from './Complaint.model';
import { generateTrackingId, buildPaginationQuery, escapeRegex } from '../../shared/utils/helpers';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../shared/utils/errors';
import {
  COMPLAINT_STATUS,
  COMPLAINT_PRIORITY,
  COMPLAINT_PRIORITY_MAPPING,
  SLA_DEADLINES,
  ROLES,
} from '../../shared/constants';
import eventBus from '../../shared/events/eventBus';
import EVENTS from '../../shared/events/eventNames';
import logger from '../../shared/logger';
import { escalationQueue, notificationQueue } from '../../queues';
import { JOB_NAMES, PRIORITIES } from '../../shared/queues/queue.constants';

export interface ICreateComplaintDTO {
  title?: string;
  description?: string;
  category?: string;
  ward?: number;
  priority?: string;
  location?: {
    type?: string;
    coordinates?: number[];
  };
  address?: string;
  landmark?: string;
  images?: { url?: string; publicId?: string }[];
  department?: string;
  [key: string]: unknown;

}

export interface IAuthUser {
  id: string;
  role: string;
  ward?: number;
}

/**
 * SECURITY: Check if user has access to view/modify a complaint
 */
const _checkComplaintAccess = (complaint: IComplaint, userContext: Partial<IAuthUser>, action: string = 'view'): void => {
  const complaintCitizenId = String(complaint.citizen?._id || complaint.citizen);
  const userId = String(userContext.id);
  const userRole = userContext.role;

  // MLA has access to everything
  if (userRole === ROLES.MLA) {
    return;
  }

  // Citizens can access only their own complaints
  if (userRole === ROLES.CITIZEN) {
    if (complaintCitizenId !== userId) {
      throw new ForbiddenError(`Cannot ${action} complaint belonging to another citizen`);
    }
    return;
  }

  // Service officers can access only their assigned complaints
  if (userRole === ROLES.SERVICE_OFFICER) {
    const assignedOfficerId = String(complaint.assignedOfficer?._id || complaint.assignedOfficer || '');
    if (assignedOfficerId && assignedOfficerId !== userId) {
      throw new ForbiddenError(`Cannot ${action} complaint not assigned to you`);
    }
    return;
  }

  // Ward councillors can access only complaints in their ward
  if (userContext.role === ROLES.WARD_COUNCILLOR) {
    if (complaint.ward !== userContext.ward) {
      throw new ForbiddenError(`Cannot ${action} complaint outside your ward`);
    }
    return;
  }
};

/**
 * Create a new complaint
 */
const createComplaint = async (userContext: IAuthUser, complaintData: ICreateComplaintDTO) => {
  const trackingId = generateTrackingId();

  // Calculate SLA deadline based on category-driven priority
  const categoryPriority = complaintData.category
    ? COMPLAINT_PRIORITY_MAPPING[complaintData.category as keyof typeof COMPLAINT_PRIORITY_MAPPING]
    : undefined;
  const priority = categoryPriority || COMPLAINT_PRIORITY.MEDIUM;
  const slaHours = SLA_DEADLINES[priority as keyof typeof SLA_DEADLINES] || SLA_DEADLINES[COMPLAINT_PRIORITY.MEDIUM];
  const slaDeadline = new Date(Date.now() + slaHours * 60 * 60 * 1000);

  const creatorObjectId = new mongoose.Types.ObjectId(userContext.id);
  const { location, address, landmark, ...rest } = complaintData;
  const normalizedLocation = location
    ? {
        type: 'Point',
        coordinates: location.coordinates || [0, 0],
      }
    : undefined;

  const complaint = await complaintRepository.create({
    ...rest,
    ...(normalizedLocation ? { location: normalizedLocation } : {}),
    ...(address ? { address } : {}),
    ...(landmark ? { landmark } : {}),
    trackingId,
    citizen: creatorObjectId,
    status: COMPLAINT_STATUS.CREATED,
    priority,
    slaDeadline,
  });

  // Record initial status in history
  await complaintRepository.addStatusHistory({
    complaint: complaint._id,
    fromStatus: null,
    toStatus: COMPLAINT_STATUS.CREATED,
    changedBy: creatorObjectId,
    changedByRole: userContext.role,
    notes: 'Complaint created',
  });

  // Emit event for auto-assignment
  eventBus.emit(EVENTS.COMPLAINT_CREATED, {
    complaintId: complaint._id,
    category: complaint.category,
    ward: complaint.ward,
    priority: complaint.priority,
  });

  // Asynchronously Queue SLA Check
  if (complaint.slaDeadline) {
    const delayMs = complaint.slaDeadline.getTime() - Date.now();
    if (delayMs > 0) {
      await escalationQueue.add(
        JOB_NAMES.SLA_CHECK,
        { complaintId: complaint._id.toString() },
        { delay: delayMs, priority: PRIORITIES.HIGH }
      );
    }
  }

  logger.info(`[ComplaintService] Complaint created: ${trackingId}`);

  return complaint;
};

/**
 * Get complaint by ID
 * SECURITY: Enforce per-resource access control
 */
const getComplaintById = async (complaintId: string, userContext?: Partial<IAuthUser>) => {
  const complaint = await complaintRepository.findById(complaintId);
  if (!complaint) throw new NotFoundError('Complaint not found');
  
  if (userContext) {
    _checkComplaintAccess(complaint, userContext, 'view');
  }
  
  return complaint;
};

/**
 * Get complaint by tracking ID (public)
 */
const getComplaintByTrackingId = async (trackingId: string, userContext?: Partial<IAuthUser>) => {
  const complaint = await complaintRepository.findByTrackingId(trackingId);
  if (!complaint) throw new NotFoundError('Complaint not found');
  
  // SECURITY: Enforce per-resource access control if userContext provided
  if (userContext) {
    _checkComplaintAccess(complaint, userContext, 'view');
  }
  
  return complaint;
};

/**
 * Validate complaint status transitions
 */
const _validateStatusTransition = (currentStatus: string, newStatus: string, userRole: string) => {
  const transitions: Record<string, string[]> = {
    [COMPLAINT_STATUS.CREATED]: [COMPLAINT_STATUS.ASSIGNED],
    [COMPLAINT_STATUS.ASSIGNED]: [COMPLAINT_STATUS.IN_PROGRESS, COMPLAINT_STATUS.REJECTED, COMPLAINT_STATUS.ESCALATED],
    [COMPLAINT_STATUS.IN_PROGRESS]: [COMPLAINT_STATUS.RESOLVED,COMPLAINT_STATUS.REOPENED, COMPLAINT_STATUS.ESCALATED],
    [COMPLAINT_STATUS.RESOLVED]: [COMPLAINT_STATUS.VERIFIED, COMPLAINT_STATUS.REOPENED],
    [COMPLAINT_STATUS.VERIFIED]: [COMPLAINT_STATUS.CLOSED],
    [COMPLAINT_STATUS.ESCALATED]: [COMPLAINT_STATUS.ASSIGNED, COMPLAINT_STATUS.IN_PROGRESS],
    [COMPLAINT_STATUS.REOPENED]: [COMPLAINT_STATUS.IN_PROGRESS],
    [COMPLAINT_STATUS.REJECTED]: [],
    [COMPLAINT_STATUS.CLOSED]: [],
  };

  const allowed = transitions[currentStatus] || [];
  if (!allowed.includes(newStatus)) {
    throw new BadRequestError(
      `Cannot transition from '${currentStatus}' to '${newStatus}'`
    );
  }

  // Role-specific transition rules
  const roleTransitions: Record<string, string[]> = {
    [ROLES.SERVICE_OFFICER]: [COMPLAINT_STATUS.IN_PROGRESS, COMPLAINT_STATUS.RESOLVED],
    [ROLES.WARD_COUNCILLOR]: [COMPLAINT_STATUS.VERIFIED, COMPLAINT_STATUS.REOPENED, COMPLAINT_STATUS.ESCALATED],
    [ROLES.MLA]: Object.values(COMPLAINT_STATUS), // MLA can set any status
    [ROLES.CITIZEN]: [], // Citizens cannot change status
  };

  if (!roleTransitions[userRole]?.includes(newStatus)) {
    throw new ForbiddenError(`Role '${userRole}' cannot set status to '${newStatus}'`);
  }
};

/**
 * Update complaint status with validation
 * SECURITY: Enforce per-resource access control
 */
const updateStatus = async (complaintId: string, newStatus: string, userId: string, userRole: string, notes: string = '', userContext?: Partial<IAuthUser>) => {
  const complaint = await complaintRepository.findById(complaintId);
  if (!complaint) throw new NotFoundError('Complaint not found');

  // Enforce per-resource access control
  if (userContext) {
    _checkComplaintAccess(complaint, userContext, 'update status for');
  }

  // Validate status transition
  _validateStatusTransition(complaint.status, newStatus, userRole);

  const updateData: UpdateQuery<IComplaint> = { status: newStatus };

  if (newStatus === COMPLAINT_STATUS.RESOLVED) {
    updateData.resolvedAt = new Date();
  } else if (newStatus === COMPLAINT_STATUS.VERIFIED) {
    updateData.verifiedAt = new Date();
    updateData.verifiedBy = new mongoose.Types.ObjectId(userId);
  } else if (newStatus === COMPLAINT_STATUS.CLOSED) {
    updateData.closedAt = new Date();
  } else if (newStatus === COMPLAINT_STATUS.REOPENED) {
    // 🚀 NEW: Clear old photos and set the rework instructions
    updateData.$unset = { resolutionProof: 1 }; 
    updateData.resolutionNotes = notes; // Saves "Rework requested by MLA: reason"
  }

  const updated = await complaintRepository.update(complaintId, updateData);

  // Record status change
  await complaintRepository.addStatusHistory({
    complaint: new mongoose.Types.ObjectId(complaintId),
    fromStatus: complaint.status,
    toStatus: newStatus,
    changedBy: new mongoose.Types.ObjectId(userId),
    changedByRole: userRole,
    notes,
  });

  // Emit status change event
  eventBus.emit(EVENTS.COMPLAINT_STATUS_CHANGED, {
    complaintId,
    fromStatus: complaint.status,
    toStatus: newStatus,
    citizenId: complaint.citizen?._id || complaint.citizen,
    officerId: complaint.assignedOfficer?._id || complaint.assignedOfficer,
  });

  if (newStatus === COMPLAINT_STATUS.RESOLVED) {
    eventBus.emit(EVENTS.COMPLAINT_RESOLVED, { complaintId, complaint: updated });
  }

  // Re-queue SLA Check if deadline changed and status is active
  if (updated && updated.slaDeadline && [COMPLAINT_STATUS.ASSIGNED as string, COMPLAINT_STATUS.IN_PROGRESS as string].includes(updated.status)) {
    const delayMs = updated.slaDeadline.getTime() - Date.now();
    if (delayMs > 0) {
      await escalationQueue.add(
        JOB_NAMES.SLA_CHECK,
        { complaintId: updated._id.toString() },
        { delay: delayMs, priority: PRIORITIES.HIGH }
      );
    }
  }

  return updated;
};

/**
 * Add resolution proof
 * SECURITY: Only assigned officer can add proof
 */
const addResolutionProof = async (complaintId: string, proofImages: any[], notes: string, officerId: string, userContext?: Partial<IAuthUser>) => {
  const complaint = await complaintRepository.findById(complaintId);
  if (!complaint) throw new NotFoundError('Complaint not found');

  // Enforce resource access
  if (userContext) {
    _checkComplaintAccess(complaint, userContext, 'add resolution proof to');
  }

  if (String(complaint.assignedOfficer?._id || complaint.assignedOfficer) !== String(officerId)) {
    throw new ForbiddenError('Only the assigned officer can add resolution proof');
  }

  return complaintRepository.update(complaintId, {
    resolutionProof: proofImages,
    resolutionNotes: notes,
  });
};

export interface IComplaintQuery {
  page?: string;
  limit?: string;
  sort?: string;
  status?: string;
  category?: string;
  priority?: string;
  ward?: string;
  department?: string;
  slaBreached?: string;
  isEscalated?: string;
  search?: string;
  fromDate?: string;
  toDate?: string;
  createdbyMe?: string;
}

export interface IAuthUser {
  id: string;
  role: string;
  ward?: number;
}

/**
 * List complaints with advanced filtering
 */
const listComplaints = async (query: IComplaintQuery, userContext: Partial<IAuthUser> = {}) => {
  let { page, limit, skip, sort } = buildPaginationQuery(query);
  if (!query.sort) sort = '-upvoteCount -createdAt';
  const filter: FilterQuery<IComplaint> = {};

  // SECURITY: Apply role-based filtering first and enforce restrictions (cannot be overridden by query params)
  
   if (query.createdbyMe === 'true') {
    filter.citizen = userContext.id;
  } else if (userContext.role === ROLES.CITIZEN) {
    filter.citizen = userContext.id;
  } else if (userContext.role === ROLES.SERVICE_OFFICER) {
    filter.assignedOfficer = userContext.id;
  } else if (userContext.role === ROLES.WARD_COUNCILLOR) {
    filter.ward = userContext.ward;
  }
  // MLA sees all — no restriction on base filter

  // Apply optional query filters (only for fields that don't override role-based restrictions)
  if (query.status) filter.status = query.status;
  if (query.category) filter.category = query.category;
  if (query.priority) filter.priority = query.priority;
  // SECURITY: Only allow ward filter override for MLA (no role restriction on this field)
  // Citizens/Officers/Councillors already have their base filter set and cannot expand it via query params
  if (query.ward && userContext.role === ROLES.MLA) {
    filter.ward = parseInt(query.ward, 10);
  }
  if (query.department) filter.department = query.department;
  if (query.slaBreached === 'true') filter.slaBreached = true;
  if (query.isEscalated === 'true') filter.isEscalated = true;
  if (query.fromDate || query.toDate) {
    filter.createdAt = {};
    if (query.fromDate) filter.createdAt.$gte = new Date(query.fromDate);
    if (query.toDate) filter.createdAt.$lte = new Date(query.toDate);
  }

  // Advanced Search: N-Gram Regex
  if (query.search) {
    const escapedSearch = escapeRegex(query.search);
    const searchWords = escapedSearch.split(/\s+/).filter((w) => w.length > 0);

    const regexOrConditions = searchWords.map((word) => ({
      $or: [
        { title: { $regex: word, $options: 'i' } },
        { description: { $regex: word, $options: 'i' } },
        { address: { $regex: word, $options: 'i' } },
        { landmark: { $regex: word, $options: 'i' } },
        { trackingId: { $regex: word, $options: 'i' } },
      ],
    }));

    if (regexOrConditions.length > 0) {
      filter.$and = filter.$and || [];
      filter.$and.push(...regexOrConditions);
    }
  }

  const { data, total } = await complaintRepository.findAll(filter, { skip, limit, sort });
  return { data, total, page, limit };
};

/**
 * List all complaints for a specific ward (Public feed for upvoting/tracking)
 * Does not restrict by citizen ID so citizens can see ward issues
 */
const listComplaintsByWard = async (ward: number, query: IComplaintQuery) => {
  let { page, limit, skip, sort } = buildPaginationQuery(query);
  if (!query.sort) sort = '-upvoteCount -createdAt';
  const filter: FilterQuery<IComplaint> = { ward };

  if (query.status) filter.status = query.status;
  if (query.category) filter.category = query.category;
  if (query.priority) filter.priority = query.priority;
  if (query.department) filter.department = query.department;
  if (query.slaBreached === 'true') filter.slaBreached = true;
  if (query.isEscalated === 'true') filter.isEscalated = true;
  // Advanced Search: N-Gram Regex
  if (query.search) {
    const escapedSearch = escapeRegex(query.search);
    const searchWords = escapedSearch.split(/\s+/).filter((w) => w.length > 0);

    const regexOrConditions = searchWords.map((word) => ({
      $or: [
        { title: { $regex: word, $options: 'i' } },
        { description: { $regex: word, $options: 'i' } },
        { address: { $regex: word, $options: 'i' } },
        { landmark: { $regex: word, $options: 'i' } },
        { trackingId: { $regex: word, $options: 'i' } },
      ],
    }));

    if (regexOrConditions.length > 0) {
      filter.$and = filter.$and || [];
      filter.$and.push(...regexOrConditions);
    }
  }

  const { data, total } = await complaintRepository.findAll(filter, { skip, limit, sort });
  return { data, total, page, limit };
};

/**
 * Get complaint timeline (status history)
 * SECURITY: Enforce per-resource access control
 */
const getComplaintTimeline = async (complaintId: string, userContext?: Partial<IAuthUser>) => {
  const complaint = await complaintRepository.findById(complaintId);
  if (!complaint) throw new NotFoundError('Complaint not found');
  
  if (userContext) {
    _checkComplaintAccess(complaint, userContext, 'view timeline for');
  }
  
  return complaintRepository.getStatusHistory(complaintId);
};

/**
 * Upvote a complaint
 * SECURITY: Enforce resource access control
 */
const upvoteComplaint = async (complaintId: string, citizenId: string, userContext?: Partial<IAuthUser>) => {
  const complaint = await complaintRepository.findById(complaintId);
  if (!complaint) throw new NotFoundError('Complaint not found');

  if (userContext) {
    _checkComplaintAccess(complaint, userContext, 'upvote');
  }

  const alreadyUpvoted = await complaintRepository.hasUpvoted(complaintId, citizenId);
  if (alreadyUpvoted) {
    throw new BadRequestError('Already upvoted this complaint');
  }

  await complaintRepository.addUpvote(complaintId, citizenId);
  const updated = await complaintRepository.update(complaintId, {
    $inc: { upvoteCount: 1 },
  });

  eventBus.emit(EVENTS.COMPLAINT_UPVOTED, { complaintId, citizenId });

  return updated;
};

/**
 * Remove upvote
 * SECURITY: Only the user who upvoted can remove
 */
const removeUpvote = async (complaintId: string, citizenId: string, userContext?: Partial<IAuthUser>) => {
  const complaint = await complaintRepository.findById(complaintId);
  if (!complaint) throw new NotFoundError('Complaint not found');

  if (userContext) {
    _checkComplaintAccess(complaint, userContext, 'remove upvote from');
  }

  const hasUpvoted = await complaintRepository.hasUpvoted(complaintId, citizenId);
  if (!hasUpvoted) {
    throw new BadRequestError('You have not upvoted this complaint');
  }

  await complaintRepository.removeUpvote(complaintId, citizenId);
  return complaintRepository.update(complaintId, {
    $inc: { upvoteCount: -1 },
  });
};

/**
 * Get nearby complaints (for duplicate detection)
 */
const getNearbyComplaints = async (longitude: number, latitude: number, maxDistance: number = 500) => {
  return complaintRepository.findNearby(longitude, latitude, maxDistance);
};

const complaintService = {
  createComplaint,
  getComplaintById,
  getComplaintByTrackingId,
  listComplaints,
  listComplaintsByWard,
  updateStatus,
  addResolutionProof,
  getComplaintTimeline,
  upvoteComplaint,
  removeUpvote,
  getNearbyComplaints,
};

export default complaintService;