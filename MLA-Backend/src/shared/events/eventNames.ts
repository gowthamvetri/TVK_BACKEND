/**
 * Event Names Registry
 * Single source of truth for all internal event names.
 */
const EVENTS = {
  // Complaint Events
  COMPLAINT_CREATED: 'complaint:created',
  COMPLAINT_UPDATED: 'complaint:updated',
  COMPLAINT_ASSIGNED: 'complaint:assigned',
  COMPLAINT_STATUS_CHANGED: 'complaint:status_changed',
  COMPLAINT_RESOLVED: 'complaint:resolved',
  COMPLAINT_VERIFIED: 'complaint:verified',
  COMPLAINT_CLOSED: 'complaint:closed',
  COMPLAINT_REOPENED: 'complaint:reopened',
  COMPLAINT_REJECTED: 'complaint:rejected',
  COMPLAINT_UPVOTED: 'complaint:upvoted',

  // Assignment Events
  ASSIGNMENT_CREATED: 'assignment:created',
  ASSIGNMENT_REASSIGNED: 'assignment:reassigned',

  // Escalation Events
  ESCALATION_TRIGGERED: 'escalation:triggered',
  ESCALATION_RESOLVED: 'escalation:resolved',

  // SLA Events
  SLA_WARNING: 'sla:warning',
  SLA_BREACHED: 'sla:breached',

  // Notification Events
  NOTIFICATION_SEND: 'notification:send',
  NOTIFICATION_BROADCAST: 'notification:broadcast',

  // User Events
  USER_REGISTERED: 'user:registered',
  USER_LOGIN: 'user:login',

  // Announcement Events
  ANNOUNCEMENT_CREATED: 'announcement:created',

  // Analytics Events
  ANALYTICS_UPDATE: 'analytics:update',
} as const;

export default EVENTS;
