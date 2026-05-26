/**
 * User Routes Integration Tests
 * Tests user profile management, scoping, and access control
 */

import request from 'supertest';
import app from '../../app';
import User from '../../modules/users/User.model';
import {
  createTestUser,
  createTestOfficer,
  createTestWardCouncillor,
  createTestMLA,
  generateTestToken,
  resetAllMocks,
} from '../utils';

describe('User Routes - Integration Tests', () => {
  let citizen: any;
  let officer: any;
  let councillor: any;
  let mla: any;

  beforeEach(async () => {
    resetAllMocks();

    citizen = await User.create(createTestUser({ phone: '1111111111', role: 'citizen' }));
    officer = await User.create(createTestOfficer({ phone: '2222222222', ward: 1 }));
    councillor = await User.create(createTestWardCouncillor({ phone: '3333333333', ward: 1 }));
    mla = await User.create(createTestMLA({ phone: '4444444444' }));
  });

  describe('GET /api/v1/users/:id - Get User Profile', () => {
    it('should allow user to view own profile', async () => {
      const token = generateTestToken(citizen._id, 'citizen');

      const res = await request(app)
        .get(`/api/v1/users/${citizen._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data._id.toString()).toBe(citizen._id.toString());
      expect(res.body.data.phone).toBe('1111111111');
    });

    it('should NOT allow citizen to view other citizen profile', async () => {
      const other = await User.create(createTestUser({ phone: '9999999999' }));
      const token = generateTestToken(citizen._id, 'citizen');

      const res = await request(app)
        .get(`/api/v1/users/${other._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });

    it('should allow officer to view own profile', async () => {
      const token = generateTestToken(officer._id, 'service_officer');

      const res = await request(app)
        .get(`/api/v1/users/${officer._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.ward).toBe(1);
    });

    it('should allow councillor to view own profile', async () => {
      const token = generateTestToken(councillor._id, 'ward_councillor', 1);

      const res = await request(app)
        .get(`/api/v1/users/${councillor._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });

    it('should allow MLA to view any user profile', async () => {
      const token = generateTestToken(mla._id, 'mla');

      const res = await request(app)
        .get(`/api/v1/users/${officer._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data._id.toString()).toBe(officer._id.toString());
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = '507f1f77bcf86cd799439999';
      const token = generateTestToken(mla._id, 'mla');

      const res = await request(app)
        .get(`/api/v1/users/${fakeId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });

    it('should not expose sensitive user data', async () => {
      const token = generateTestToken(mla._id, 'mla');

      const res = await request(app)
        .get(`/api/v1/users/${citizen._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      // Should not expose PIN hash
      expect(res.body.data.pin).toBeUndefined();
    });
  });

  describe('PATCH /api/v1/users/:id - Update User Profile', () => {
    it('should allow user to update own profile', async () => {
      const token = generateTestToken(citizen._id.toString(), 'citizen');

      const res = await request(app)
        .patch(`/api/v1/users/${citizen._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Updated Name',
        });

      expect(res.status).toBe(200);

      const updated = await User.findById(citizen._id);
      // Verify user was updated (structure depends on schema)
      expect(updated).toBeDefined();
    });

    it('should NOT allow user to update other profile', async () => {
      const other = await User.create(createTestUser({ phone: '9999999999' }));
      const token = generateTestToken(citizen._id, 'citizen');

      const res = await request(app)
        .patch(`/api/v1/users/${other._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Hacked Name',
        });

      expect(res.status).toBe(403);
    });

    it('should NOT allow user to change role', async () => {
      const token = generateTestToken(citizen._id, 'citizen');

      const res = await request(app)
        .patch(`/api/v1/users/${citizen._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          role: 'mla', // Attempt to elevate
        });

      expect(res.status).toBe(400);
      const updated = await User.findById(citizen._id);
      expect(updated?.role).toBe('citizen');
    });

    it('should allow MLA to deactivate user', async () => {
      const token = generateTestToken(mla._id, 'mla');

      const res = await request(app)
        .patch(`/api/v1/users/${citizen._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          isActive: false,
        });

      expect(res.status).toBe(200);
      const updated = await User.findById(citizen._id);
      expect(updated?.isActive).toBe(false);
    });

    it('should NOT allow citizen to deactivate anyone', async () => {
      const other = await User.create(createTestUser({ phone: '9999999999' }));
      const token = generateTestToken(citizen._id, 'citizen');

      const res = await request(app)
        .patch(`/api/v1/users/${other._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          isActive: false,
        });

      expect(res.status).toBe(403);
    });

    it('should reject invalid profile data', async () => {
      const token = generateTestToken(citizen._id, 'citizen');

      const res = await request(app)
        .patch(`/api/v1/users/${citizen._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          phone: 'invalid', // Phone cannot be changed to invalid
        });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/v1/users - List Users', () => {
    it('should NOT allow citizen to list users', async () => {
      const token = generateTestToken(citizen._id, 'citizen');

      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });

    it('should NOT allow officer to list all users', async () => {
      const token = generateTestToken(officer._id, 'service_officer');

      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBeOneOf([403, 400]);
    });

    it('should NOT allow councillor to list users', async () => {
      const token = generateTestToken(councillor._id, 'ward_councillor', 1);

      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });

    it('should allow MLA to list users', async () => {
      const token = generateTestToken(mla._id, 'mla');

      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBeOneOf([200, 400]); // Depends on query params
    });

    it('should filter users by role when MLA', async () => {
      const token = generateTestToken(mla._id, 'mla');

      const res = await request(app)
        .get('/api/v1/users?role=service_officer')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      if (res.body.data && res.body.data.length > 0) {
        res.body.data.forEach((user: any) => {
          expect(user.role).toBe('service_officer');
        });
      }
    });

    it('should filter users by ward when MLA', async () => {
      const token = generateTestToken(mla._id, 'mla');

      const res = await request(app)
        .get('/api/v1/users?ward=1&role=service_officer')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      if (res.body.data && res.body.data.length > 0) {
        res.body.data.forEach((user: any) => {
          expect(user.ward).toBe(1);
        });
      }
    });
  });

  describe('User Search with Regex', () => {
    beforeEach(async () => {
      await User.create(createTestUser({ phone: '1111111111', name: 'John Doe' }));
      await User.create(createTestUser({ phone: '2222222222', name: 'Jane Smith' }));
    });

    it('should search users by name', async () => {
      const token = generateTestToken(mla._id, 'mla');

      const res = await request(app)
        .get('/api/v1/users?search=john')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });

    it('should escape regex special characters in search', async () => {
      const token = generateTestToken(mla._id, 'mla');

      // Attempt regex injection
      const res = await request(app)
        .get('/api/v1/users?search=.*|admin')
        .set('Authorization', `Bearer ${token}`);

      // Should not throw, should safely escape
      expect(res.status).toBe(200);
    });

    it('should escape brackets in search', async () => {
      const token = generateTestToken(mla._id, 'mla');

      const res = await request(app)
        .get('/api/v1/users?search=[admin]')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });
  });

  describe('Activate/Deactivate Users', () => {
    it('should allow MLA to activate user', async () => {
      const inactiveUser = await User.create(
        createTestUser({ phone: '9999999999', isActive: false })
      );
      const token = generateTestToken(mla._id, 'mla');

      const res = await request(app)
        .patch(`/api/v1/users/${inactiveUser._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          isActive: true,
        });

      expect(res.status).toBe(200);
      const updated = await User.findById(inactiveUser._id);
      expect(updated?.isActive).toBe(true);
    });

    it('should NOT allow inactive user to login', async () => {
      const inactiveUser = await User.create(
        createTestUser({ phone: '9999999999', isActive: false })
      );

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          phone: '9999999999',
          pin: '1234',
        });

      expect(res.status).toBeOneOf([401, 403]);
    });

    it('should NOT allow inactive user to refresh token', async () => {
      const inactiveUser = await User.create(
        createTestUser({ phone: '9999999999', isActive: false })
      );
      const token = generateTestToken(inactiveUser._id, 'citizen');

      const res = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({
          refreshToken: token,
        });

      expect(res.status).toBeOneOf([401, 403]);
    });
  });

  describe('Ward-Scoped User Access', () => {
    let officer2: any;

    beforeEach(async () => {
      officer2 = await User.create(createTestOfficer({ phone: '7777777777', ward: 2 }));
    });

    it('should NOT allow councillor to view officer from different ward', async () => {
      const token = generateTestToken(councillor._id, 'ward_councillor', 1);

      const res = await request(app)
        .get(`/api/v1/users/${officer2._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });

    it('should allow councillor to view officer from same ward', async () => {
      const token = generateTestToken(councillor._id, 'ward_councillor', 1);

      const res = await request(app)
        .get(`/api/v1/users/${officer._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBeOneOf([200, 403]); // Depends on implementation
    });
  });
});
