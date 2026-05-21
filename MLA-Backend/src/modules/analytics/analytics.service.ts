/**
 * Analytics Service
 * Precomputed analytics using MongoDB aggregation pipelines.
 * Avoids expensive real-time queries on free-tier MongoDB.
 */
import { FilterQuery } from 'mongoose';
import Complaint, { IComplaint } from '../complaints/Complaint.model';
import AnalyticsLog from './AnalyticsLog.model';
import slaEngine from '../complaints/sla.engine';
import { COMPLAINT_STATUS, COMPLAINT_PRIORITY } from '../../shared/constants';
import logger from '../../shared/logger';

// ─── Private Aggregation Helpers ────────────────────────────

const _getStatusBreakdown = async (filter: FilterQuery<IComplaint> = {}) => {
  const result = await Complaint.aggregate([
    { $match: filter },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  return result.reduce((acc: Record<string, number>, item: { _id: string; count: number }) => {
    acc[item._id] = item.count;
    return acc;
  }, {});
};

const _getPriorityBreakdown = async (filter: FilterQuery<IComplaint> = {}) => {
  const result = await Complaint.aggregate([
    { $match: filter },
    { $group: { _id: '$priority', count: { $sum: 1 } } },
  ]);
  return result.reduce((acc: Record<string, number>, item: { _id: string; count: number }) => {
    acc[item._id] = item.count;
    return acc;
  }, {});
};

const _getCategoryBreakdown = async (filter: FilterQuery<IComplaint> = {}) => {
  return Complaint.aggregate([
    { $match: filter },
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 15 },
  ]);
};

const _getRecentTrend = async (days: number = 30) => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return Complaint.aggregate([
    { $match: { createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);
};

const _getAvgResolutionTime = async (filter: FilterQuery<IComplaint> = {}) => {
  const result = await Complaint.aggregate([
    { $match: { ...filter, resolvedAt: { $exists: true } } },
    {
      $project: {
        resolutionHours: {
          $divide: [{ $subtract: ['$resolvedAt', '$createdAt'] }, 3600000],
        },
      },
    },
    { $group: { _id: null, avg: { $avg: '$resolutionHours' } } },
  ]);
  return result[0]?.avg?.toFixed(2) || 0;
};

// ─── Public Methods ─────────────────────────────────────────

/**
 * Get constituency-wide KPIs (for MLA dashboard)
 */
const getConstituencyKPIs = async () => {
  const [
    totalComplaints,
    statusBreakdown,
    priorityBreakdown,
    slaMetrics,
    categoryBreakdown,
    recentTrend,
  ] = await Promise.all([
    Complaint.countDocuments(),
    _getStatusBreakdown(),
    _getPriorityBreakdown(),
    slaEngine.calculateSLAMetrics(),
    _getCategoryBreakdown(),
    _getRecentTrend(30),
  ]);

  return {
    totalComplaints,
    statusBreakdown,
    priorityBreakdown,
    slaMetrics,
    categoryBreakdown,
    recentTrend,
  };
};

/**
 * Get ward-level analytics
 */
const getWardAnalytics = async (ward: number) => {
  const filter = { ward };

  const [
    totalComplaints,
    statusBreakdown,
    slaMetrics,
    categoryBreakdown,
  ] = await Promise.all([
    Complaint.countDocuments(filter),
    _getStatusBreakdown(filter),
    slaEngine.calculateSLAMetrics(filter),
    _getCategoryBreakdown(filter),
  ]);

  return {
    ward,
    totalComplaints,
    statusBreakdown,
    slaMetrics,
    categoryBreakdown,
  };
};

/**
 * Get officer performance analytics
 */
const getOfficerAnalytics = async (officerId: string) => {
  const filter = { assignedOfficer: officerId };

  const [total, resolved, slaMetrics, avgResolution] = await Promise.all([
    Complaint.countDocuments(filter),
    Complaint.countDocuments({ ...filter, status: { $in: ['resolved', 'verified', 'closed'] } }),
    slaEngine.calculateSLAMetrics(filter),
    _getAvgResolutionTime(filter),
  ]);

  return {
    officerId,
    totalAssigned: total,
    totalResolved: resolved,
    resolutionRate: total > 0 ? ((resolved / total) * 100).toFixed(2) : 0,
    slaCompliance: slaMetrics.complianceRate,
    avgResolutionHours: avgResolution,
  };
};

/**
 * Get ward comparison analytics (for MLA)
 */
const getWardComparison = async () => {
  return Complaint.aggregate([
    {
      $group: {
        _id: '$ward',
        total: { $sum: 1 },
        resolved: {
          $sum: { $cond: [{ $in: ['$status', ['resolved', 'verified', 'closed']] }, 1, 0] },
        },
        escalated: {
          $sum: { $cond: ['$isEscalated', 1, 0] },
        },
        slaBreached: {
          $sum: { $cond: ['$slaBreached', 1, 0] },
        },
      },
    },
    {
      $project: {
        ward: '$_id',
        total: 1,
        resolved: 1,
        escalated: 1,
        slaBreached: 1,
        resolutionRate: {
          $cond: [{ $gt: ['$total', 0] }, { $multiply: [{ $divide: ['$resolved', '$total'] }, 100] }, 0],
        },
      },
    },
    { $sort: { ward: 1 } },
  ]);
};

/**
 * Precompute and store daily analytics (called by cron)
 */
const precomputeDailyAnalytics = async () => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const kpis = await getConstituencyKPIs();

    await AnalyticsLog.findOneAndUpdate(
      { type: 'daily', period: today },
      {
        type: 'daily',
        period: today,
        metrics: {
          totalComplaints: kpis.totalComplaints,
          resolvedComplaints: kpis.statusBreakdown.resolved || 0,
          pendingComplaints: (kpis.statusBreakdown.created || 0) +
            (kpis.statusBreakdown.assigned || 0) +
            (kpis.statusBreakdown.in_progress || 0),
          escalatedComplaints: kpis.statusBreakdown.escalated || 0,
          slaCompliant: (kpis.slaMetrics as { compliant: number }).compliant,
          slaBreached: (kpis.slaMetrics as { breached: number }).breached,
          avgResolutionHours: parseFloat((kpis.slaMetrics as { avgResolutionHours: string | number }).avgResolutionHours as string) || 0,
          categoryBreakdown: new Map(
            kpis.categoryBreakdown.map((c: { _id: string; count: number }) => [c._id, c.count])
          ),
        },
      },
      { upsert: true, new: true }
    );

    logger.info(`[AnalyticsService] Daily analytics precomputed for ${today}`);
  } catch (error) {
    logger.error('[AnalyticsService] Daily analytics precomputation failed:', error);
  }
};

export default {
  getConstituencyKPIs,
  getWardAnalytics,
  getOfficerAnalytics,
  getWardComparison,
  precomputeDailyAnalytics
};
