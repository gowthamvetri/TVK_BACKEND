export const QUEUES = {
  OTP: 'otp',
  NOTIFICATIONS: 'notifications',
  ESCALATIONS: 'escalations',
  ANALYTICS: 'analytics',
  REPORTS: 'reports',
  UPLOADS: 'uploads',
  CLEANUP: 'cleanup',
} as const;

export const JOB_NAMES = {
  // OTP
  SEND_OTP: 'send-otp',
  RESEND_OTP: 'resend-otp',

  // Notifications
  SEND_SMS: 'send-sms',
  SEND_PUSH: 'send-push',
  WEBSOCKET_BROADCAST: 'websocket-broadcast',

  // Escalations
  SLA_CHECK: 'sla-check',
  AUTO_ESCALATE: 'auto-escalate',

  // Analytics
  AGGREGATE_KPIS: 'aggregate-kpis',
  REFRESH_DASHBOARD: 'refresh-dashboard',

  // Reports
  GENERATE_PDF: 'generate-pdf',
  GENERATE_CSV: 'generate-csv',

  // Uploads
  PROCESS_IMAGE: 'process-image',
  
  // Cleanup
  CLEANUP_STALE_DATA: 'cleanup-stale-data'
} as const;

export const PRIORITIES = {
  CRITICAL: 1,
  HIGH: 2,
  NORMAL: 3,
  LOW: 4
} as const;
