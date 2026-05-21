/**
 * Dashboard Service
 * Provides role-specific dashboard data with precomputed statistics.
 */
import Complaint from '../complaints/Complaint.model';
import User from '../users/User.model';
import Announcement from '../announcements/Announcement.model';
import Escalation from '../escalations/Escalation.model';
import Notification from '../notifications/Notification.model';
import { COMPLAINT_STATUS, ROLES } from '../../shared/constants';
import analyticsService from '../analytics/analytics.service';

/**
 * Citizen Dashboard
 */
const getCitizenDashboard = async (userId: string) => {
  const [
    myComplaints,
    statusBreakdown,
    recentComplaints,
    unreadNotifications,
    recentAnnouncements,
  ] = await Promise.all([
    Complaint.countDocuments({ citizen: userId }),
    Complaint.aggregate([
      { $match: { citizen: userId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Complaint.find({ citizen: userId })
      .sort('-createdAt')
      .limit(5)
      .select('trackingId title status priority category createdAt')
      .lean(),
    Notification.countDocuments({ recipient: userId, isRead: false }),
    Announcement.find({ isActive: true }).sort('-createdAt').limit(3).lean(),
  ]);

  return {
    totalComplaints: myComplaints,
    statusBreakdown: statusBreakdown.reduce((acc: Record<string, number>, s: { _id: string; count: number }) => { acc[s._id] = s.count; return acc; }, {} as Record<string, number>),
    recentComplaints,
    unreadNotifications,
    recentAnnouncements,
  };
};

/**
 * Service Officer Dashboard
 */
const getOfficerDashboard = async (userId: string) => {
  const [
    assignedComplaints,
    statusBreakdown,
    urgentComplaints,
    slaBreachedCount,
    unreadNotifications,
  ] = await Promise.all([
    Complaint.countDocuments({ assignedOfficer: userId }),
    Complaint.aggregate([
      { $match: { assignedOfficer: userId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Complaint.find({
      assignedOfficer: userId,
      status: { $in: [COMPLAINT_STATUS.ASSIGNED, COMPLAINT_STATUS.IN_PROGRESS] },
      priority: { $in: ['critical', 'high'] },
    })
      .sort('slaDeadline')
      .limit(5)
      .select('trackingId title priority status slaDeadline slaBreached')
      .lean(),
    Complaint.countDocuments({ assignedOfficer: userId, slaBreached: true }),
    Notification.countDocuments({ recipient: userId, isRead: false }),
  ]);

  return {
    totalAssigned: assignedComplaints,
    statusBreakdown: statusBreakdown.reduce((acc: Record<string, number>, s: { _id: string; count: number }) => { acc[s._id] = s.count; return acc; }, {} as Record<string, number>),
    urgentComplaints,
    slaBreachedCount,
    unreadNotifications,
  };
};

/**
 * Ward Councillor Dashboard
 */
const getCouncillorDashboard = async (ward: number) => {
  const filter = { ward };
  const [
    totalComplaints,
    statusBreakdown,
    escalatedComplaints,
    pendingVerification,
    wardAnalytics,
    recentEscalations,
  ] = await Promise.all([
    Complaint.countDocuments(filter),
    Complaint.aggregate([
      { $match: filter },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Complaint.countDocuments({ ...filter, isEscalated: true }),
    Complaint.find({ ...filter, status: COMPLAINT_STATUS.RESOLVED })
      .sort('-resolvedAt')
      .limit(5)
      .select('trackingId title category resolvedAt')
      .lean(),
    analyticsService.getWardAnalytics(ward),
    Escalation.find({ toLevel: 'ward_councillor' })
      .populate('complaint', 'trackingId title category')
      .sort('-createdAt')
      .limit(5)
      .lean(),
  ]);

  return {
    ward,
    totalComplaints,
    statusBreakdown: statusBreakdown.reduce((acc: Record<string, number>, s: { _id: string; count: number }) => { acc[s._id] = s.count; return acc; }, {} as Record<string, number>),
    escalatedComplaints,
    pendingVerification,
    wardAnalytics,
    recentEscalations,
  };
};

/**
 * MLA Dashboard
 */
const getMLADashboard = async () => {
  const [
    totalComplaints,
    statusBreakdown,
    constituencyKPIs,
    wardComparison,
    totalUsers,
    totalOfficers,
    recentEscalations,
  ] = await Promise.all([
    Complaint.countDocuments(),
    Complaint.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    analyticsService.getConstituencyKPIs(),
    analyticsService.getWardComparison(),
    User.countDocuments({ role: ROLES.CITIZEN }),
    User.countDocuments({ role: ROLES.SERVICE_OFFICER }),
    Escalation.find({ toLevel: 'mla' })
      .populate('complaint', 'trackingId title category priority')
      .sort('-createdAt')
      .limit(10)
      .lean(),
  ]);

  return {
    totalComplaints,
    statusBreakdown: statusBreakdown.reduce((acc: Record<string, number>, s: { _id: string; count: number }) => { acc[s._id] = s.count; return acc; }, {} as Record<string, number>),
    constituencyKPIs,
    wardComparison,
    totalCitizens: totalUsers,
    totalOfficers,
    recentEscalations,
  };
};

export default {
  getCitizenDashboard,
  getOfficerDashboard,
  getCouncillorDashboard,
  getMLADashboard
};
