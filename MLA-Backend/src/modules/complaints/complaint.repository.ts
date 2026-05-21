/**
 * Complaint Repository
 * Data access layer for complaint operations.
 */
import { FilterQuery, UpdateQuery } from 'mongoose';
import Complaint, { IComplaint } from './Complaint.model';
import ComplaintStatusHistory, { IComplaintStatusHistory } from './ComplaintStatusHistory.model';
import Upvote from './Upvote.model';

interface PaginationOptions {
  skip?: number;
  limit?: number;
  sort?: string;
}

const create = async (complaintData: Partial<IComplaint>) => {
  return Complaint.create(complaintData);
};

const findById = async (id: string) => {
  return Complaint.findById(id)
    .populate('citizen', 'name phone ward')
    .populate('assignedOfficer', 'name phone department')
    .populate('verifiedBy', 'name role');
};

const findByTrackingId = async (trackingId: string) => {
  return Complaint.findOne({ trackingId })
    .populate('citizen', 'name phone ward')
    .populate('assignedOfficer', 'name phone department');
};

const update = async (id: string, updateData: UpdateQuery<IComplaint>) => {
  return Complaint.findByIdAndUpdate(id, updateData, { new: true, runValidators: true })
    .populate('citizen', 'name phone ward')
    .populate('assignedOfficer', 'name phone department');
};

const findAll = async (filter: FilterQuery<IComplaint> = {}, options: PaginationOptions = {}) => {
  const { skip = 0, limit = 20, sort = '-createdAt' } = options;
  const [data, total] = await Promise.all([
    Complaint.find(filter)
      .populate('citizen', 'name phone ward')
      .populate('assignedOfficer', 'name phone department')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Complaint.countDocuments(filter),
  ]);
  return { data, total };
};

const findByCitizen = async (citizenId: string, options: PaginationOptions = {}) => {
  return findAll({ citizen: citizenId }, options);
};

const findByOfficer = async (officerId: string, options: PaginationOptions = {}) => {
  return findAll({ assignedOfficer: officerId }, options);
};

const findByWard = async (ward: number, options: PaginationOptions = {}) => {
  return findAll({ ward }, options);
};

const findNearby = async (longitude: number, latitude: number, maxDistance: number = 500) => {
  return Complaint.find({
    location: {
      $near: {
        $geometry: { type: 'Point', coordinates: [longitude, latitude] },
        $maxDistance: maxDistance,
      },
    },
    status: { $nin: ['closed', 'rejected'] },
  })
    .limit(10)
    .lean();
};

const findSLABreached = async () => {
  return Complaint.find({
    slaDeadline: { $lt: new Date() },
    slaBreached: false,
    status: { $nin: ['resolved', 'verified', 'closed', 'rejected'] },
  });
};

const findInactive = async (hoursThreshold: number = 48) => {
  const threshold = new Date(Date.now() - hoursThreshold * 60 * 60 * 1000);
  return Complaint.find({
    updatedAt: { $lt: threshold },
    status: { $in: ['assigned', 'in_progress'] },
    isEscalated: false,
  });
};

// Status History
const addStatusHistory = async (historyData: Partial<IComplaintStatusHistory>) => {
  return ComplaintStatusHistory.create(historyData);
};

const getStatusHistory = async (complaintId: string) => {
  return ComplaintStatusHistory.find({ complaint: complaintId })
    .populate('changedBy', 'name role')
    .sort('createdAt');
};

// Upvotes
const addUpvote = async (complaintId: string, citizenId: string) => {
  return Upvote.create({ complaint: complaintId, citizen: citizenId });
};

const removeUpvote = async (complaintId: string, citizenId: string) => {
  return Upvote.deleteOne({ complaint: complaintId, citizen: citizenId });
};

const hasUpvoted = async (complaintId: string, citizenId: string) => {
  return Upvote.exists({ complaint: complaintId, citizen: citizenId });
};

const getUpvoteCount = async (complaintId: string) => {
  return Upvote.countDocuments({ complaint: complaintId });
};

// Aggregation helpers
const countByStatusAndWard = async (ward?: number) => {
  return Complaint.aggregate([
    { $match: ward ? { ward } : {} },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
};

const countByCategory = async (filter: FilterQuery<IComplaint> = {}) => {
  return Complaint.aggregate([
    { $match: filter },
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
};

const complaintRepository = {
  create,
  findById,
  findByTrackingId,
  update,
  findAll,
  findByCitizen,
  findByOfficer,
  findByWard,
  findNearby,
  findSLABreached,
  findInactive,
  addStatusHistory,
  getStatusHistory,
  addUpvote,
  removeUpvote,
  hasUpvoted,
  getUpvoteCount,
  countByStatusAndWard,
  countByCategory,
};

export default complaintRepository;
