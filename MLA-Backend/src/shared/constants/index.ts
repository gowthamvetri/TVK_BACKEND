/**
 * Application Constants
 */

export const ROLES = {
  CITIZEN: 'citizen',
  SERVICE_OFFICER: 'service_officer',
  WARD_COUNCILLOR: 'ward_councillor',
  MLA: 'mla',
  DEPUTY: 'deputy',
} as const;

export const TOTAL_WARDS = 10;

export const DEPUTY_PERMISSIONS = {
  CREATE_DEPUTY: 'create:deputy',
  CREATE_OFFICIALS: 'create:officials',
  EDIT_SCHEMES: 'edit:schemes',
  DELETE_EVENTS: 'delete:events',
  MANAGE_COUNCILLORS: 'manage:councillors',
  MANAGE_SUPERVISORS: 'manage:supervisors',
  TRANSFER_COUNCILLOR: 'transfer:councillor',
  VIEW_VACANT_WARDS: 'view:vacant_wards',
  MANAGE_WARDS: 'manage:wards',
} as const;


export const COMPLAINT_STATUS = {
  CREATED: 'created',
  ASSIGNED: 'assigned',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
  VERIFIED: 'verified',
  CLOSED: 'closed',
  ESCALATED: 'escalated',
  REOPENED: 'reopened',
  REJECTED: 'rejected',
} as const;

export const COMPLAINT_PRIORITY = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
} as const;

// SLA deadlines in hours
export const SLA_DEADLINES = {
  [COMPLAINT_PRIORITY.CRITICAL]: 4,
  [COMPLAINT_PRIORITY.HIGH]: 24,
  [COMPLAINT_PRIORITY.MEDIUM]: 72, // 3 days
  [COMPLAINT_PRIORITY.LOW]: 168, // 7 days
};

export const COMPLAINT_CATEGORIES = {
  ROADS: 'roads',
  WATER_SUPPLY: 'water_supply',
  DRAINAGE: 'drainage',
  ELECTRICITY: 'electricity',
  GARBAGE: 'garbage',
  STREET_LIGHTS: 'street_lights',
  PUBLIC_HEALTH: 'public_health',
  PARKS: 'parks',
  ENCROACHMENT: 'encroachment',
  NOISE_POLLUTION: 'noise_pollution',
  BUILDING_VIOLATION: 'building_violation',
  PUBLIC_SAFETY: 'public_safety',
  OTHER: 'other',
} as const;

export const COMPLAINT_PRIORITY_MAPPING = {
  [COMPLAINT_CATEGORIES.ROADS]: COMPLAINT_PRIORITY.MEDIUM,
  [COMPLAINT_CATEGORIES.WATER_SUPPLY]: COMPLAINT_PRIORITY.HIGH,
  [COMPLAINT_CATEGORIES.DRAINAGE]: COMPLAINT_PRIORITY.HIGH,
  [COMPLAINT_CATEGORIES.ELECTRICITY]: COMPLAINT_PRIORITY.CRITICAL,
  [COMPLAINT_CATEGORIES.GARBAGE]: COMPLAINT_PRIORITY.MEDIUM,
  [COMPLAINT_CATEGORIES.STREET_LIGHTS]: COMPLAINT_PRIORITY.MEDIUM,
  [COMPLAINT_CATEGORIES.PUBLIC_HEALTH]: COMPLAINT_PRIORITY.CRITICAL,
  [COMPLAINT_CATEGORIES.PARKS]: COMPLAINT_PRIORITY.LOW,
  [COMPLAINT_CATEGORIES.ENCROACHMENT]: COMPLAINT_PRIORITY.MEDIUM,
  [COMPLAINT_CATEGORIES.NOISE_POLLUTION]: COMPLAINT_PRIORITY.LOW,
  [COMPLAINT_CATEGORIES.BUILDING_VIOLATION]: COMPLAINT_PRIORITY.HIGH,
  [COMPLAINT_CATEGORIES.PUBLIC_SAFETY]: COMPLAINT_PRIORITY.CRITICAL,
  [COMPLAINT_CATEGORIES.OTHER]: COMPLAINT_PRIORITY.MEDIUM,
} as const;

export const NOTIFICATION_TYPES = {
  PUSH: 'push',
  SMS: 'sms',
  IN_APP: 'in_app',
} as const;

export const ESCALATION_LEVELS = {
  LEVEL_1: 'service_officer',
  LEVEL_2: 'ward_councillor',
  LEVEL_3: 'mla',
} as const;

export const UPLOAD_TYPES = {
  COMPLAINT_IMAGE: 'complaint_image',
  PROOF_IMAGE: 'proof_image',
  PROFILE_IMAGE: 'profile_image',
  ANNOUNCEMENT_IMAGE: 'announcement_image',
} as const;
