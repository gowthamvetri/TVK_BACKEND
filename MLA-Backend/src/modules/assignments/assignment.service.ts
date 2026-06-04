/**
 * Assignment Service
 * Automatic complaint assignment engine.
 * 
 * Assignment Strategy:
 * 1. Detect category → map to department
 * 2. Detect ward → find officers in ward + department
 * 3. Select officer with least active complaints (load balancing)
 * 4. Assign complaint and notify officer
 * 
 * FUTURE UPGRADE: Replace rule-based assignment with AI/ML model
 */
import mongoose from 'mongoose';
import Department from './Department.model';
import userRepository from '../users/user.repository';
import complaintRepository from '../complaints/complaint.repository';
import Complaint from '../complaints/Complaint.model';
import { COMPLAINT_STATUS } from '../../shared/constants';
import eventBus from '../../shared/events/eventBus';
import EVENTS from '../../shared/events/eventNames';
import logger from '../../shared/logger';

export interface IOfficer {
  _id: mongoose.Types.ObjectId;
  [key: string]: unknown;
}

const resolveOfficerId = (officer: { _id?: mongoose.Types.ObjectId | string; id?: string }) => {
  const rawId = officer._id ?? officer.id;
  if (!rawId) return null;
  return rawId instanceof mongoose.Types.ObjectId ? rawId : new mongoose.Types.ObjectId(rawId);
};

/**
 * Auto-assign a complaint to the best available officer
 */
const autoAssign = async (complaintId: string, category: string, ward: number) => {
  try {
    // Step 1: Find explicit department mapping for this category, or default to the raw category string
    const department = await Department.findOne({
      categories: category,
      isActive: true,
    });

    const targetDepartmentName = department ? department.name : category;

    let officers: IOfficer[] = [];

    // Step 2: Find officers in this ward + department (matches explicit mapping or exact category match)
    const usersByDept = await userRepository.findOfficersByWardAndDepartment(ward, targetDepartmentName);
    officers = usersByDept
      .map((user) => {
        const officerId = resolveOfficerId(user);
        if (!officerId) return null;
        return { _id: officerId } as IOfficer;
      })
      .filter((officer): officer is IOfficer => officer !== null);

    // Fallback: Find any officer in the ward
    if (!officers || officers.length === 0) {
      const users = await userRepository.findOfficersByWard(ward);
      officers = users
        .map((user) => {
          const officerId = resolveOfficerId(user);
          if (!officerId) return null;
          return { _id: officerId } as IOfficer;
        })
        .filter((officer): officer is IOfficer => officer !== null);
    }

    if (!officers || officers.length === 0) {
      logger.warn(`[AssignmentService] No officers available for ward ${ward}, category ${category}`);
      return null;
    }

    // Step 3: Load balancing — pick officer with fewest active complaints
    const officerWorkloads = await Promise.all(
      officers.map(async (officer: IOfficer) => {
        const activeCount = await Complaint.countDocuments({
          assignedOfficer: officer._id,
          status: { $in: [COMPLAINT_STATUS.ASSIGNED, COMPLAINT_STATUS.IN_PROGRESS] },
        });
        return { officer, activeCount };
      })
    );

    officerWorkloads.sort((a, b) => a.activeCount - b.activeCount);
    const selectedOfficer = officerWorkloads[0].officer;

    // Step 4: Assign complaint
    const updatedComplaint = await complaintRepository.update(complaintId, {
      assignedOfficer: selectedOfficer._id,
      department: targetDepartmentName,
      status: COMPLAINT_STATUS.ASSIGNED,
    });

    // Record status change
    await complaintRepository.addStatusHistory({
      complaint: new mongoose.Types.ObjectId(complaintId),
      fromStatus: COMPLAINT_STATUS.CREATED,
      toStatus: COMPLAINT_STATUS.ASSIGNED,
      changedBy: selectedOfficer._id, // System-assigned
      changedByRole: 'system',
      notes: `Auto-assigned to ${selectedOfficer._id}`,
      metadata: { assignmentType: 'auto', workload: officerWorkloads[0].activeCount },
    });

    // Emit assignment event for notifications
    eventBus.emit(EVENTS.ASSIGNMENT_CREATED, {
      complaintId,
      officerId: selectedOfficer._id,
    });

    logger.info(`[AssignmentService] Complaint ${complaintId} assigned to officer ${selectedOfficer._id}`);

    return updatedComplaint;
  } catch (error) {
    logger.error(`[AssignmentService] Auto-assignment failed:`, error);
    throw error;
  }
};

/**
 * Manually reassign a complaint
 */
const reassign = async (complaintId: string, newOfficerId: string, reassignedBy: string, reason: string = '') => {
  const complaint = await complaintRepository.findById(complaintId);
  if (!complaint) throw new Error('Complaint not found');

  const previousOfficer = complaint.assignedOfficer;

  const newOfficerObjectId = new mongoose.Types.ObjectId(newOfficerId);
  const reassignedByObjectId = new mongoose.Types.ObjectId(reassignedBy);

  const updated = await complaintRepository.update(complaintId, {
    assignedOfficer: newOfficerObjectId,
    status: COMPLAINT_STATUS.ASSIGNED,
  });

  await complaintRepository.addStatusHistory({
    complaint: new mongoose.Types.ObjectId(complaintId),
    fromStatus: complaint.status,
    toStatus: COMPLAINT_STATUS.ASSIGNED,
    changedBy: reassignedByObjectId,
    notes: `Reassigned: ${reason}`,
    metadata: {
      previousOfficer: previousOfficer?._id || previousOfficer,
      newOfficer: newOfficerId,
    },
  });

  eventBus.emit(EVENTS.ASSIGNMENT_REASSIGNED, {
    complaintId,
    previousOfficerId: previousOfficer?._id || previousOfficer,
    newOfficerId,
  });

  return updated;
};

/**
 * Get officer workload statistics
 */
const getOfficerWorkload = async (officerId: string) => {
  const [active, resolved, total] = await Promise.all([
    Complaint.countDocuments({
      assignedOfficer: officerId,
      status: { $in: [COMPLAINT_STATUS.ASSIGNED, COMPLAINT_STATUS.IN_PROGRESS] },
    }),
    Complaint.countDocuments({
      assignedOfficer: officerId,
      status: { $in: [COMPLAINT_STATUS.RESOLVED, COMPLAINT_STATUS.VERIFIED, COMPLAINT_STATUS.CLOSED] },
    }),
    Complaint.countDocuments({ assignedOfficer: officerId }),
  ]);
  return { active, resolved, total };
};

const assignmentService = {
  autoAssign,
  reassign,
  getOfficerWorkload,
};

export default assignmentService;
