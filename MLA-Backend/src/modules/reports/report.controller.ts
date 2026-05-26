/**
 * Report Controller
 */
import { Request, Response } from 'express';
import { FilterQuery } from 'mongoose';
import { IComplaint } from '../complaints/Complaint.model';
import reportService from './report.service';
import asyncHandler from '../../shared/utils/asyncHandler';
import { ROLES } from '../../shared/constants';
import { ForbiddenError } from '../../shared/utils/errors';

interface IDownloadQuery {
  ward?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
}

const downloadCSV = asyncHandler(async (req: Request<{}, {}, {}, IDownloadQuery>, res: Response) => {
  const user = req.user!;
  const filter: FilterQuery<IComplaint> = {};
  
  // SECURITY: Enforce ward-level access for ward councillors
  if (req.query.ward) {
    const requestedWard = parseInt(req.query.ward, 10);
    if (user.role === ROLES.WARD_COUNCILLOR && user.ward !== requestedWard) {
      throw new ForbiddenError('Ward councillors can only access reports for their assigned ward');
    }
    filter.ward = requestedWard;
  } else if (user.role === ROLES.WARD_COUNCILLOR) {
    // SECURITY: Restrict ward councillor to their ward by default
    filter.ward = user.ward;
  }
  
  if (req.query.status) filter.status = req.query.status;
  if (req.query.fromDate || req.query.toDate) {
    filter.createdAt = {};
    if (req.query.fromDate) filter.createdAt.$gte = new Date(req.query.fromDate);
    if (req.query.toDate) filter.createdAt.$lte = new Date(req.query.toDate);
  }

  const csv = await reportService.generateComplaintCSV(filter);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=complaints_report_${Date.now()}.csv`);
  return res.send(csv);
});

const downloadPDF = asyncHandler(async (req: Request<{}, {}, {}, IDownloadQuery>, res: Response) => {
  const user = req.user!;
  const filter: FilterQuery<IComplaint> = {};
  
  // SECURITY: Enforce ward-level access for ward councillors
  if (req.query.ward) {
    const requestedWard = parseInt(req.query.ward, 10);
    if (user.role === ROLES.WARD_COUNCILLOR && user.ward !== requestedWard) {
      throw new ForbiddenError('Ward councillors can only access reports for their assigned ward');
    }
    filter.ward = requestedWard;
  } else if (user.role === ROLES.WARD_COUNCILLOR) {
    // SECURITY: Restrict ward councillor to their ward by default
    filter.ward = user.ward;
  }

  const pdfBuffer = await reportService.generateComplaintPDF(filter);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=complaints_report_${Date.now()}.pdf`);
  return res.send(pdfBuffer);
});

export default {
  downloadCSV,
  downloadPDF
};
