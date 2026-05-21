/**
 * Report Controller
 */
import { Request, Response } from 'express';
import { FilterQuery } from 'mongoose';
import { IComplaint } from '../complaints/Complaint.model';
import reportService from './report.service';
import asyncHandler from '../../shared/utils/asyncHandler';

interface IDownloadQuery {
  ward?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
}

const downloadCSV = asyncHandler(async (req: Request<{}, {}, {}, IDownloadQuery>, res: Response) => {
  const filter: FilterQuery<IComplaint> = {};
  if (req.query.ward) filter.ward = parseInt(req.query.ward, 10);
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
  const filter: FilterQuery<IComplaint> = {};
  if (req.query.ward) filter.ward = parseInt(req.query.ward, 10);

  const pdfBuffer = await reportService.generateComplaintPDF(filter);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=complaints_report_${Date.now()}.pdf`);
  return res.send(pdfBuffer);
});

export default {
  downloadCSV,
  downloadPDF
};
