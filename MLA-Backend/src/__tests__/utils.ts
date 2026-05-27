/**
 * Test Utilities & Mocks
 * Provides reusable test helpers, factories, and service mocks
 */

import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';

const TEST_JWT_SECRET = 'test-secret-key-min-32-chars-long!';
const TEST_ACCESS_EXPIRY = '15m';

/**
 * Mock Twilio SMS Service
 */
export const mockTwilioSMS = {
  sendOTP: jest.fn().mockResolvedValue({ sid: 'test-sid', status: 'queued' }),
  sendSMS: jest.fn().mockResolvedValue({ sid: 'test-sid', status: 'queued' }),
};

jest.mock('twilio', () => ({
  default: () => ({
    messages: {
      create: mockTwilioSMS.sendSMS,
    },
  }),
}));

/**
 * Mock Cloudinary Service
 */
export const mockCloudinaryUpload = jest.fn().mockResolvedValue({
  secure_url: 'https://res.cloudinary.com/test/image/upload/v123/test.jpg',
  public_id: 'test-image-123',
  context: { custom: { resourceId: 'complaint-123', resourceType: 'complaint' } },
});

export const mockCloudinaryDelete = jest.fn().mockResolvedValue({ result: 'ok' });

export const mockCloudinaryResource = jest.fn().mockResolvedValue({
  public_id: 'test-image-123',
  context: { custom: { resourceId: 'complaint-123', resourceType: 'complaint' } },
});

jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    uploader: {
      upload: mockCloudinaryUpload,
      destroy: mockCloudinaryDelete,
    },
    api: {
      resource: mockCloudinaryResource,
    },
  },
}));

/**
 * Mock Redis Cache Service
 */
export const mockRedisGet = jest.fn().mockResolvedValue(null);
export const mockRedisSet = jest.fn().mockResolvedValue('OK');
export const mockRedisDel = jest.fn().mockResolvedValue(1);
export const mockRedisFlushDb = jest.fn().mockResolvedValue('OK');

jest.mock('ioredis', () => ({
  default: jest.fn(() => ({
    get: mockRedisGet,
    set: mockRedisSet,
    del: mockRedisDel,
    flushdb: mockRedisFlushDb,
    on: jest.fn(),
    quit: jest.fn(),
  })),
}));

/**
 * Mock Socket.IO
 */
export const mockSocketIO = {
  emit: jest.fn(),
  on: jest.fn(),
  disconnect: jest.fn(),
};

jest.mock('socket.io', () => ({
  default: jest.fn(() => ({
    on: jest.fn(),
    emit: jest.fn(),
    to: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
  })),
}));

/**
 * Mock node-cron workers
 */
jest.mock('node-cron', () => ({
  schedule: jest.fn().mockReturnValue({ start: jest.fn(), stop: jest.fn() }),
}));

/**
 * JWT Token Generation Helper
 */
export const generateTestToken = (userId: string | Types.ObjectId, role: string, ward?: number) => {
  const id = typeof userId === 'string' ? userId : userId.toString();
  return jwt.sign(
    {
      id,
      role,
      phone: '9876543210',
      ward,
      department: 'test-dept',
    },
    TEST_JWT_SECRET,
    { expiresIn: TEST_ACCESS_EXPIRY }
  );
};

/**
 * Test Data Factories
 */

export const createTestUser = (overrides = {}) => ({
  _id: new Types.ObjectId(),
  phone: '9876543210',
  pin: '$2a$10$hashedpin123',
  role: 'citizen',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createTestOfficer = (overrides = {}) => ({
  ...createTestUser({
    role: 'service_officer',
    ward: 1,
    department: 'health',
    ...overrides,
  }),
});

export const createTestWardCouncillor = (overrides = {}) => ({
  ...createTestUser({
    role: 'ward_councillor',
    ward: 1,
    ...overrides,
  }),
});

export const createTestMLA = (overrides = {}) => ({
  ...createTestUser({
    role: 'mla',
    ...overrides,
  }),
});

export const createTestComplaint = (overrides = {}) => ({
  _id: new Types.ObjectId(),
  citizen: new Types.ObjectId(),
  trackingId: 'GRV-2024-00001',
  title: 'Test Complaint',
  description: 'Test description',
  category: 'water_supply',
  priority: 'medium',
  status: 'created',
  ward: 1,
  location: {
    coordinates: [72.8526, 19.0176],
  },
  address: 'Mumbai, Maharashtra',
  images: [],
  assignedOfficer: null,
  department: null,
  slaDeadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
  slaBreached: false,
  isEscalated: false,
  resolutionProof: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createTestOTP = (overrides = {}) => ({
  _id: new Types.ObjectId(),
  phone: '9876543210',
  otp: '123456',
  attempts: 0,
  createdAt: new Date(),
  expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  ...overrides,
});

export const createTestNotification = (overrides = {}) => ({
  _id: new Types.ObjectId(),
  recipient: new Types.ObjectId(),
  title: 'Test Notification',
  message: 'Test message',
  type: 'complaint_assigned',
  isRead: false,
  metadata: {},
  createdAt: new Date(),
  ...overrides,
});

export const createTestEscalation = (overrides = {}) => ({
  _id: new Types.ObjectId(),
  complaint: new Types.ObjectId(),
  escalatedBy: new Types.ObjectId(),
  reason: 'SLA breach',
  level: 1,
  status: 'open',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createTestDepartment = (overrides = {}) => ({
  _id: new Types.ObjectId(),
  name: 'Health',
  code: 'HEALTH',
  description: 'Health Department',
  isActive: true,
  createdAt: new Date(),
  ...overrides,
});

export const createTestAnnouncement = (overrides = {}) => ({
  _id: new Types.ObjectId(),
  title: 'Test Announcement',
  content: 'Test announcement content',
  createdBy: new Types.ObjectId(),
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const resetAllMocks = () => {
  jest.clearAllMocks();
  mockTwilioSMS.sendOTP.mockResolvedValue({ sid: 'test-sid', status: 'queued' });
  mockTwilioSMS.sendSMS.mockResolvedValue({ sid: 'test-sid', status: 'queued' });
  mockCloudinaryUpload.mockResolvedValue({
    secure_url: 'https://res.cloudinary.com/test/image/upload/v123/test.jpg',
    public_id: 'test-image-123',
    context: { custom: { resourceId: 'complaint-123', resourceType: 'complaint' } },
  });
  mockCloudinaryDelete.mockResolvedValue({ result: 'ok' });
  mockCloudinaryResource.mockResolvedValue({
    public_id: 'test-image-123',
    context: { custom: { resourceId: 'complaint-123', resourceType: 'complaint' } },
  });
  mockRedisGet.mockResolvedValue(null);
  mockRedisSet.mockResolvedValue('OK');
  mockRedisDel.mockResolvedValue(1);
  mockRedisFlushDb.mockResolvedValue('OK');
};
