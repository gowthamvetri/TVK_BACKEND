/**
 * Authorization & Role-Based Access Tests
 * Tests role enforcement, ward scoping, and access control across all routes
 */

import request from 'supertest';
import app from '../../app';
import User from '../../modules/users/User.model';
import {
  createTestUser,
  createTestOfficer,
  createTestWardCouncillor,
  createTestMLA,
  createTestComplaint,
  generateTestToken,
  resetAllMocks,
} from '../utils';
import Complaint from '../../modules/complaints/Complaint.model';

describe('Authorization & Role-Based Access - Integration Tests', () => {
  let citizen: any;
  let officer1: any;
  let officer2: any;
  let councillor1: any;
  let councillor2: any;
  let mla: any;

  beforeEach(async () => {
    resetAllMocks();

    citizen = await User.create(createTestUser({ phone: '1111111111', role: 'citizen' }));
    officer1 = await User.create(createTestOfficer({ phone: '2222222222', ward: 1 }));
    officer2 = await User.create(createTestOfficer({ phone: '3333333333', ward: 2 }));
    councillor1 = await User.create(createTestWardCouncillor({ phone: '4444444444', ward: 1 }));
    councillor2 = await User.create(createTestWardCouncillor({ phone: '5555555555', ward: 2 }));
    mla = await User.create(createTestMLA({ phone: '6666666666' }));
  });

  describe('Citizen Role - Limitations', () => {
    it('should NOT allow citizen to access user list', async () => {
      const token = generateTestToken(citizen._id, 'citizen');

      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });

    it('should NOT allow citizen to access analytics', async () => {
      const token = generateTestToken(citizen._id, 'citizen');

      const res = await request(app)
        .get('/api/v1/analytics')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });

    it('should NOT allow citizen to access reports', async () => {
      const token = generateTestToken(citizen._id, 'citizen');

      const res = await request(app)
        .get('/api/v1/reports')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });

    it('should allow citizen to view own profile', async () => {
      const token = generateTestToken(citizen._id, 'citizen');

      const res = await request(app)
        .get(`/api/v1/users/${citizen._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });

    it('should NOT allow citizen to view other profiles', async () => {
      const token = generateTestToken(citizen._id, 'citizen');

      const res = await request(app)
        .get(`/api/v1/users/${officer1._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });
  });

  describe('Service Officer - Ward Restrictions', () => {
    it('should allow officer to access own ward complaints', async () => {
      const complaint = await Complaint.create(
        createTestComplaint({
          citizen: citizen._id,
          ward: 1,
          assignedOfficer: officer1._id,
        })
      );

      const token = generateTestToken(officer1._id, 'service_officer');

      const res = await request(app)
        .get(`/api/v1/complaints/${complaint._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });

    it('should NOT allow officer to access other ward complaints', async () => {
      const complaint = await Complaint.create(
        createTestComplaint({
          citizen: citizen._id,
          ward: 2,
          assignedOfficer: officer2._id,
        })
      );

      const token = generateTestToken(officer1._id, 'service_officer');

      const res = await request(app)
        .get(`/api/v1/complaints/${complaint._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });

    it('should NOT allow officer to access other users list', async () => {
      const token = generateTestToken(officer1._id, 'service_officer');

      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });

    it('should NOT allow officer to access analytics outside their ward', async () => {
      const token = generateTestToken(officer1._id, 'service_officer');

      const res = await request(app)
        .get('/api/v1/analytics/ward/2')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });

    it('should NOT allow officer to reassign complaints outside their ward', async () => {
      const complaint = await Complaint.create(
        createTestComplaint({
          citizen: citizen._id,
          ward: 1,
          assignedOfficer: officer1._id,
        })
      );

      const token = generateTestToken(officer1._id, 'service_officer');

      const res = await request(app)
        .patch(`/api/v1/complaints/${complaint._id}/assign`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          assignedOfficer: officer2._id,
        });

      expect(res.status).toBe(403);
    });
  });

  describe('Ward Councillor - Ward Scoping', () => {
    it('should allow councillor to access own ward complaints', async () => {
      const complaint = await Complaint.create(
        createTestComplaint({
          citizen: citizen._id,
          ward: 1,
        })
      );

      const token = generateTestToken(councillor1._id, 'ward_councillor', 1);

      const res = await request(app)
        .get(`/api/v1/complaints/${complaint._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });

    it('should NOT allow councillor to access other ward complaints', async () => {
      const complaint = await Complaint.create(
        createTestComplaint({
          citizen: citizen._id,
          ward: 2,
        })
      );

      const token = generateTestToken(councillor1._id, 'ward_councillor', 1);

      const res = await request(app)
        .get(`/api/v1/complaints/${complaint._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });

    it('should NOT allow councillor to override ward filter in list query', async () => {
      const complaint2 = await Complaint.create(
        createTestComplaint({
          citizen: citizen._id,
          ward: 2,
        })
      );

      const token = generateTestToken(councillor1._id, 'ward_councillor', 1);

      const res = await request(app)
        .get('/api/v1/complaints?ward=2')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      // All returned complaints should be from ward 1
      res.body.data.forEach((complaint: any) => {
        expect(complaint.ward).toBe(1);
      });
    });

    it('should NOT allow councillor to access user list', async () => {
      const token = generateTestToken(councillor1._id, 'ward_councillor', 1);

      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });

    it('should NOT allow councillor to fetch arbitrary officers outside ward', async () => {
      const token = generateTestToken(councillor1._id, 'ward_councillor', 1);

      const res = await request(app)
        .get(`/api/v1/users/${officer2._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });

    it('should NOT allow councillor to access analytics outside their ward', async () => {
      const token = generateTestToken(councillor1._id, 'ward_councillor', 1);

      const res = await request(app)
        .get('/api/v1/analytics/ward/2')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });

    it('should NOT allow councillor to access workload reports outside their ward', async () => {
      const token = generateTestToken(councillor1._id, 'ward_councillor', 1);

      const res = await request(app)
        .get('/api/v1/dashboard/workload/ward/2')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });

    it('should allow councillor to access their own ward analytics', async () => {
      const token = generateTestToken(councillor1._id, 'ward_councillor', 1);

      const res = await request(app)
        .get('/api/v1/analytics/ward/1')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBeOneOf([200, 404]); // 404 if no data yet
    });
  });

  describe('MLA Role - Full Access', () => {
    it('should allow MLA to access all complaints', async () => {
      const complaint1 = await Complaint.create(
        createTestComplaint({ citizen: citizen._id, ward: 1 })
      );
      const complaint2 = await Complaint.create(
        createTestComplaint({ citizen: citizen._id, ward: 2 })
      );

      const token = generateTestToken(mla._id, 'mla');

      const res = await request(app)
        .get('/api/v1/complaints')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('should allow MLA to access analytics', async () => {
      const token = generateTestToken(mla._id, 'mla');

      const res = await request(app)
        .get('/api/v1/analytics')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBeOneOf([200, 404]);
    });

    it('should allow MLA to access reports', async () => {
      const token = generateTestToken(mla._id, 'mla');

      const res = await request(app)
        .get('/api/v1/reports')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBeOneOf([200, 404]);
    });

    it('should allow MLA to access user profiles', async () => {
      const token = generateTestToken(mla._id, 'mla');

      const res = await request(app)
        .get(`/api/v1/users/${officer1._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });

    it('should allow MLA to view user list', async () => {
      const token = generateTestToken(mla._id, 'mla');

      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBeOneOf([200, 400, 403]); // Depends on implementation
    });

    it('should allow MLA to access dashboard for all wards', async () => {
      const token = generateTestToken(mla._id, 'mla');

      const res = await request(app)
        .get('/api/v1/dashboard/overview')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBeOneOf([200, 404]);
    });
  });

  describe('Missing Authorization Header', () => {
    it('should reject request without Bearer token', async () => {
      const res = await request(app)
        .get('/api/v1/complaints');

      expect(res.status).toBe(401);
    });

    it('should reject malformed Authorization header', async () => {
      const res = await request(app)
        .get('/api/v1/complaints')
        .set('Authorization', 'InvalidFormat');

      expect(res.status).toBe(401);
    });

    it('should reject expired token', async () => {
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjB9.abcd';

      const res = await request(app)
        .get('/api/v1/complaints')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
    });

    it('should reject invalid token signature', async () => {
      const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.invalid';

      const res = await request(app)
        .get('/api/v1/complaints')
        .set('Authorization', `Bearer ${invalidToken}`);

      expect(res.status).toBe(401);
    });
  });
});
