/**
 * Report Service
 * Generates PDF and CSV reports.
 * Uses lightweight worker-like pattern for large reports.
 */
import PDFDocument from 'pdfkit';
import { Parser } from 'json2csv';
import { FilterQuery } from 'mongoose';
import Complaint, { IComplaint } from '../complaints/Complaint.model';
import analyticsService from '../analytics/analytics.service';
import { buildPaginationQuery } from '../../shared/utils/helpers';
import logger from '../../shared/logger';

type PopulatedComplaint = Omit<IComplaint, 'citizen' | 'assignedOfficer'> & {
  citizen?: { name: string; phone: string };
  assignedOfficer?: { name: string; phone: string; department: string };
};

/**
 * Generate complaint report as CSV
 */
const generateComplaintCSV = async (filters: FilterQuery<IComplaint> = {}) => {
  const complaints = await Complaint.find(filters)
    .populate('citizen', 'name phone')
    .populate('assignedOfficer', 'name phone department')
    .sort('-createdAt')
    .lean() as unknown as PopulatedComplaint[];

  const data = complaints.map((c: PopulatedComplaint) => ({
    'Tracking ID': c.trackingId,
    'Title': c.title,
    'Category': c.category,
    'Priority': c.priority,
    'Status': c.status,
    'Ward': c.ward,
    'Citizen': c.citizen?.name || 'N/A',
    'Citizen Phone': c.citizen?.phone || 'N/A',
    'Assigned Officer': c.assignedOfficer?.name || 'Unassigned',
    'Department': c.department || 'N/A',
    'SLA Breached': c.slaBreached ? 'Yes' : 'No',
    'Created At': c.createdAt?.toISOString() || '',
    'Resolved At': c.resolvedAt?.toISOString() || '',
    'Upvotes': c.upvoteCount || 0,
  }));

  const parser = new Parser();
  return parser.parse(data);
};

/**
 * Generate complaint report as PDF
 */
const generateComplaintPDF = async (filters: FilterQuery<IComplaint> = {}) => {
  const complaints = await Complaint.find(filters)
    .populate('citizen', 'name phone')
    .populate('assignedOfficer', 'name department')
    .sort('-createdAt')
    .lean() as unknown as PopulatedComplaint[];

  const kpis = await analyticsService.getConstituencyKPIs() as { totalComplaints: number, slaMetrics: { complianceRate: number | string, avgResolutionHours: number | string } };

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Title
    doc.fontSize(20).text('Grievance Management Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown(2);

    // Summary KPIs
    doc.fontSize(14).text('Summary', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10);
    doc.text(`Total Complaints: ${kpis.totalComplaints}`);
    doc.text(`SLA Compliance: ${kpis.slaMetrics.complianceRate}%`);
    doc.text(`Avg Resolution Time: ${kpis.slaMetrics.avgResolutionHours} hours`);
    doc.moveDown(2);

    // Complaint Table
    doc.fontSize(14).text('Complaint Details', { underline: true });
    doc.moveDown(0.5);

    complaints.forEach((c: PopulatedComplaint, index: number) => {
      if (doc.y > 700) doc.addPage();

      doc.fontSize(9);
      doc.text(
        `${index + 1}. [${c.trackingId}] ${c.title} | ${c.category} | ${c.priority} | ${c.status} | Ward ${c.ward} | ${c.assignedOfficer?.name || 'Unassigned'}`
      );
      doc.moveDown(0.3);
    });

    doc.end();
  });
};

/**
 * Generate ward performance report
 */
const generateWardReport = async (ward: number) => {
  const analytics = await analyticsService.getWardAnalytics(ward);
  const csv = await generateComplaintCSV({ ward });
  return { analytics, csv };
};

export default {
  generateComplaintCSV,
  generateComplaintPDF,
  generateWardReport
};
