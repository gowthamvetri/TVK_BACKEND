/**
 * Complaint Service
 * Core business logic for complaint lifecycle management.
 */
import mongoose, { FilterQuery, UpdateQuery } from 'mongoose';
import complaintRepository from './complaint.repository';
import { IComplaint } from './Complaint.model';
import { generateTrackingId, buildPaginationQuery } from '../../shared/utils/helpers';
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

export interface ICreateComplaintDTO {
  title?: string;
  description?: string;
  category?: string;
  ward?: number;
  priority?: string;
  location?: {
    type?: string;
    address?: string;
    landmark?: string;
    coordinates?: number[];
  };
  images?: { url?: string; publicId?: string }[];
  department?: string;
  [key: string]: unknown;
}

/**
 * Create a new complaint
 */
const createComplaint = async (citizenId: string, complaintData: ICreateComplaintDTO) => {
  const trackingId = generateTrackingId();

  // Calculate SLA deadline based on category-driven priority
  const categoryPriority = complaintData.category
    ? COMPLAINT_PRIORITY_MAPPING[complaintData.category as keyof typeof COMPLAINT_PRIORITY_MAPPING]
    : undefined;
  const priority = categoryPriority || COMPLAINT_PRIORITY.MEDIUM;
  const slaHours = SLA_DEADLINES[priority as keyof typeof SLA_DEADLINES] || SLA_DEADLINES[COMPLAINT_PRIORITY.MEDIUM];
  const slaDeadline = new Date(Date.now() + slaHours * 60 * 60 * 1000);

  const citizenObjectId = new mongoose.Types.ObjectId(citizenId);
  const { location, ...rest } = complaintData;
  const normalizedLocation = location
    ? {
        type: 'Point',
        coordinates: location.coordinates || [0, 0],
        address: location.address,
        landmark: location.landmark,
      }
    : undefined;

  const complaint = await complaintRepository.create({
    ...rest,
    ...(normalizedLocation ? { location: normalizedLocation } : {}),
    trackingId,
    citizen: citizenObjectId,
    status: COMPLAINT_STATUS.CREATED,
    priority,
    slaDeadline,
  });

  // Record initial status in history
  await complaintRepository.addStatusHistory({
    complaint: complaint._id,
    fromStatus: null,
    toStatus: COMPLAINT_STATUS.CREATED,
    changedBy: citizenObjectId,
    changedByRole: ROLES.CITIZEN,
    notes: 'Complaint created',
  });

  // Emit event for auto-assignment
  eventBus.emit(EVENTS.COMPLAINT_CREATED, {
    complaintId: complaint._id,
    category: complaint.category,
    ward: complaint.ward,
    priority: complaint.priority,
  });

  logger.info(`[ComplaintService] Complaint created: ${trackingId}`);

  return complaint;
};

/**
 * Get complaint by ID
 */
const getComplaintById = async (complaintId: string) => {
  const complaint = await complaintRepository.findById(complaintId);
  if (!complaint) throw new NotFoundError('Complaint not found');
  return complaint;
};

/**
 * Get complaint by tracking ID (public)
 */
const getComplaintByTrackingId = async (trackingId: string) => {
  const complaint = await complaintRepository.findByTrackingId(trackingId);
  if (!complaint) throw new NotFoundError('Complaint not found');
  return complaint;
};

/**
 * Validate complaint status transitions
 */
const _validateStatusTransition = (currentStatus: string, newStatus: string, userRole: string) => {
  const transitions: Record<string, string[]> = {
    [COMPLAINT_STATUS.CREATED]: [COMPLAINT_STATUS.ASSIGNED],
    [COMPLAINT_STATUS.ASSIGNED]: [COMPLAINT_STATUS.IN_PROGRESS, COMPLAINT_STATUS.REJECTED, COMPLAINT_STATUS.ESCALATED],
    [COMPLAINT_STATUS.IN_PROGRESS]: [COMPLAINT_STATUS.RESOLVED, COMPLAINT_STATUS.ESCALATED],
    [COMPLAINT_STATUS.RESOLVED]: [COMPLAINT_STATUS.VERIFIED, COMPLAINT_STATUS.REOPENED],
    [COMPLAINT_STATUS.VERIFIED]: [COMPLAINT_STATUS.CLOSED, COMPLAINT_STATUS.REOPENED],
    [COMPLAINT_STATUS.ESCALATED]: [COMPLAINT_STATUS.ASSIGNED, COMPLAINT_STATUS.IN_PROGRESS],
    [COMPLAINT_STATUS.REOPENED]: [COMPLAINT_STATUS.ASSIGNED, COMPLAINT_STATUS.IN_PROGRESS],
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
 */
const updateStatus = async (complaintId: string, newStatus: string, userId: string, userRole: string, notes: string = '') => {
  const complaint = await complaintRepository.findById(complaintId);
  if (!complaint) throw new NotFoundError('Complaint not found');

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

  return updated;
};

/**
 * Add resolution proof
 */
const addResolutionProof = async (complaintId: string, proofImages: string[], notes: string, officerId: string) => {
  const complaint = await complaintRepository.findById(complaintId);
  if (!complaint) throw new NotFoundError('Complaint not found');

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
  const { page, limit, skip, sort } = buildPaginationQuery(query);
  const filter: FilterQuery<IComplaint> = {};

  // Role-based filtering
  if (userContext.role === ROLES.CITIZEN) {
    filter.citizen = userContext.id;
  } else if (userContext.role === ROLES.SERVICE_OFFICER) {
    filter.assignedOfficer = userContext.id;
  } else if (userContext.role === ROLES.WARD_COUNCILLOR) {
    filter.ward = userContext.ward;
  }
  // MLA sees all — no filter needed

  // Apply query filters
  if (query.status) filter.status = query.status;
  if (query.category) filter.category = query.category;
  if (query.priority) filter.priority = query.priority;
  if (query.ward) filter.ward = parseInt(query.ward, 10);
  if (query.department) filter.department = query.department;
  if (query.slaBreached === 'true') filter.slaBreached = true;
  if (query.isEscalated === 'true') filter.isEscalated = true;
  if (query.search) {
    filter.$or = [
      { title: { $regex: query.search, $options: 'i' } },
      { trackingId: { $regex: query.search, $options: 'i' } },
      { description: { $regex: query.search, $options: 'i' } },
      { 'location.address': { $regex: query.search, $options: 'i' } },
      { 'location.landmark': { $regex: query.search, $options: 'i' } },
    ];
  }
  if (query.fromDate || query.toDate) {
    filter.createdAt = {};
    if (query.fromDate) filter.createdAt.$gte = new Date(query.fromDate);
    if (query.toDate) filter.createdAt.$lte = new Date(query.toDate);
  }

  const { data, total } = await complaintRepository.findAll(filter, { skip, limit, sort });
  return { data, total, page, limit };
};

/**
 * Get complaint timeline (status history)
 */
const getComplaintTimeline = async (complaintId: string) => {
  const complaint = await complaintRepository.findById(complaintId);
  if (!complaint) throw new NotFoundError('Complaint not found');
  return complaintRepository.getStatusHistory(complaintId);
};

/**
 * Upvote a complaint
 */
const upvoteComplaint = async (complaintId: string, citizenId: string) => {
  const complaint = await complaintRepository.findById(complaintId);
  if (!complaint) throw new NotFoundError('Complaint not found');

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
 */
const removeUpvote = async (complaintId: string, citizenId: string) => {
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
  updateStatus,
  addResolutionProof,
  listComplaints,
  getComplaintTimeline,
  upvoteComplaint,
  removeUpvote,
  getNearbyComplaints,
};

export default complaintService;
