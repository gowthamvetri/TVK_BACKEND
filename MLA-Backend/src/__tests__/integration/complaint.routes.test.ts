/**
 * Complaint Routes Integration Tests
 * Tests complaint lifecycle, authorization, and role-based access
 */

import request from 'supertest';
import app from '../../app';
import Complaint from '../../modules/complaints/Complaint.model';
import User from '../../modules/users/User.model';
import Department from '../../modules/assignments/Department.model';
import {
  createTestUser,
  createTestComplaint,
  createTestOfficer,
  createTestWardCouncillor,
  createTestMLA,
  createTestDepartment,
  generateTestToken,
  resetAllMocks,
} from '../utils';
import { Types } from 'mongoose';

describe('Complaint Routes - Integration Tests', () => {
  let citizen: any;
  let officer: any;
  let councillor: any;
  let mla: any;
  let department: any;

  beforeEach(async () => {
    resetAllMocks();

    // Create test users
    citizen = await User.create(createTestUser({ phone: '1111111111', role: 'citizen' }));
    officer = await User.create(createTestOfficer({ phone: '2222222222', ward: 1 }));
    councillor = await User.create(createTestWardCouncillor({ phone: '3333333333', ward: 1 }));
    mla = await User.create(createTestMLA({ phone: '4444444444' }));
    department = await Department.create(createTestDepartment());
  });

  describe('POST /api/v1/complaints - Create Complaint', () => {
    it('should create complaint with valid payload', async () => {
      const token = generateTestToken(citizen._id, 'citizen');

      const res = await request(app)
        .post('/api/v1/complaints')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Broken water pipe',
          description: 'Water pipe burst on Main Street',
          category: 'water_supply',
          priority: 'high',
          ward: 1,
          location: {
            coordinates: [72.8526, 19.0176],
            address: 'Mumbai, Maharashtra',
            landmark: 'Near Market',
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('_id');
      expect(res.body.data).toHaveProperty('trackingId');
      expect(res.body.data.status).toBe('created');
      expect(res.body.data.citizen.toString()).toBe(citizen._id.toString());
    });

    it('should reject invalid complaint payload', async () => {
      const token = generateTestToken(citizen._id, 'citizen');

      const res = await request(app)
        .post('/api/v1/complaints')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: '', // Empty title
          category: 'invalid_category',
        });

      expect(res.status).toBe(400);
    });

    it('should set SLA deadline based on priority', async () => {
      const token = generateTestToken(citizen._id, 'citizen');

      const res = await request(app)
        .post('/api/v1/complaints')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Test complaint',
          description: 'Test',
          category: 'water_supply',
          priority: 'high',
          ward: 1,
          location: { coordinates: [72.8526, 19.0176], address: 'Test' },
        });

      expect(res.status).toBe(201);
      expect(res.body.data.slaDeadline).toBeDefined();
    });

    it('should reject unauthenticated creation', async () => {
      const res = await request(app)
        .post('/api/v1/complaints')
        .send({
          title: 'Test',
          description: 'Test',
          category: 'water_supply',
          priority: 'high',
        });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/complaints - List Complaints', () => {
    let complaint: any;

    beforeEach(async () => {
      complaint = await Complaint.create(
        createTestComplaint({
          citizen: citizen._id,
          ward: 1,
          status: 'assigned',
          assignedOfficer: officer._id,
        })
      );
    });

    it('should return own complaints for citizen', async () => {
      const token = generateTestToken(citizen._id, 'citizen');

      const res = await request(app)
        .get('/api/v1/complaints')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].citizen.toString()).toBe(citizen._id.toString());
    });

    it('should not return other citizens\' complaints', async () => {
      const otherCitizen = await User.create(createTestUser({ phone: '5555555555' }));
      const token = generateTestToken(otherCitizen._id, 'citizen');

      const res = await request(app)
        .get('/api/v1/complaints')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      // Should not contain the original complaint
      const found = res.body.data.find((c: any) => c._id === complaint._id);
      expect(found).toBeUndefined();
    });

    it('should return assigned complaints for officer', async () => {
      const token = generateTestToken(officer._id, 'service_officer');

      const res = await request(app)
        .get('/api/v1/complaints')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data[0].assignedOfficer.toString()).toBe(officer._id.toString());
    });

    it('should return ward-scoped complaints for councillor', async () => {
      const token = generateTestToken(councillor._id, 'ward_councillor', 1);

      const res = await request(app)
        .get('/api/v1/complaints')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      // Should only contain complaints from ward 1
      res.body.data.forEach((c: any) => {
        expect(c.ward).toBe(1);
      });
    });

    it('should not allow councillor to override ward filter', async () => {
      const token = generateTestToken(councillor._id, 'ward_councillor', 1);

      const res = await request(app)
        .get('/api/v1/complaints?ward=2')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      // Should still only contain ward 1 complaints
      res.body.data.forEach((c: any) => {
        expect(c.ward).toBe(1);
      });
    });

    it('should return all complaints for MLA', async () => {
      const token = generateTestToken(mla._id, 'mla');

      const res = await request(app)
        .get('/api/v1/complaints')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should filter by status', async () => {
      const token = generateTestToken(mla._id, 'mla');

      const res = await request(app)
        .get('/api/v1/complaints?status=assigned')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      res.body.data.forEach((c: any) => {
        expect(c.status).toBe('assigned');
      });
    });

    it('should escape regex in search', async () => {
      const token = generateTestToken(mla._id, 'mla');

      const res = await request(app)
        .get('/api/v1/complaints?search=.*|admin')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/v1/complaints/:id - Get Complaint', () => {
    let complaint: any;

    beforeEach(async () => {
      complaint = await Complaint.create(
        createTestComplaint({
          citizen: citizen._id,
          ward: 1,
          status: 'assigned',
          assignedOfficer: officer._id,
        })
      );
    });

    it('should return complaint for authorized citizen', async () => {
      const token = generateTestToken(citizen._id, 'citizen');

      const res = await request(app)
        .get(`/api/v1/complaints/${complaint._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data._id.toString()).toBe(complaint._id.toString());
    });

    it('should deny access to other citizen', async () => {
      const otherCitizen = await User.create(createTestUser({ phone: '5555555555' }));
      const token = generateTestToken(otherCitizen._id, 'citizen');

      const res = await request(app)
        .get(`/api/v1/complaints/${complaint._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });

    it('should allow assigned officer access', async () => {
      const token = generateTestToken(officer._id, 'service_officer');

      const res = await request(app)
        .get(`/api/v1/complaints/${complaint._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });

    it('should deny non-assigned officer access', async () => {
      const otherOfficer = await User.create(
        createTestOfficer({ phone: '6666666666', ward: 2 })
      );
      const token = generateTestToken(otherOfficer._id, 'service_officer');

      const res = await request(app)
        .get(`/api/v1/complaints/${complaint._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });

    it('should allow same-ward councillor access', async () => {
      const token = generateTestToken(councillor._id, 'ward_councillor', 1);

      const res = await request(app)
        .get(`/api/v1/complaints/${complaint._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });

    it('should deny different-ward councillor access', async () => {
      const otherCouncillor = await User.create(
        createTestWardCouncillor({ phone: '7777777777', ward: 2 })
      );
      const token = generateTestToken(otherCouncillor._id, 'ward_councillor', 2);

      const res = await request(app)
        .get(`/api/v1/complaints/${complaint._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });

    it('should allow MLA access', async () => {
      const token = generateTestToken(mla._id, 'mla');

      const res = await request(app)
        .get(`/api/v1/complaints/${complaint._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/v1/complaints/tracking/:trackingId - Get by Tracking ID', () => {
    let complaint: any;

    beforeEach(async () => {
      complaint = await Complaint.create(
        createTestComplaint({
          citizen: citizen._id,
          ward: 1,
          trackingId: 'GRV-2024-00123',
        })
      );
    });

    it('should return complaint by tracking ID for authorized user', async () => {
      const token = generateTestToken(citizen._id, 'citizen');

      const res = await request(app)
        .get(`/api/v1/complaints/tracking/${complaint.trackingId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.trackingId).toBe(complaint.trackingId);
    });

    it('should enforce authorization rules for tracking ID access', async () => {
      const otherCitizen = await User.create(createTestUser({ phone: '5555555555' }));
      const token = generateTestToken(otherCitizen._id, 'citizen');

      const res = await request(app)
        .get(`/api/v1/complaints/tracking/${complaint.trackingId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /api/v1/complaints/:id/status - Update Status', () => {
    let complaint: any;

    beforeEach(async () => {
      complaint = await Complaint.create(
        createTestComplaint({
          citizen: citizen._id,
          ward: 1,
          status: 'created',
          assignedOfficer: officer._id,
        })
      );
    });

    it('should allow valid status transition', async () => {
      const token = generateTestToken(officer._id, 'service_officer');

      const res = await request(app)
        .patch(`/api/v1/complaints/${complaint._id}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          newStatus: 'assigned',
          reason: 'Assigned to team',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('assigned');
    });

    it('should reject invalid status transition', async () => {
      const token = generateTestToken(officer._id, 'service_officer');

      const res = await request(app)
        .patch(`/api/v1/complaints/${complaint._id}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          newStatus: 'invalid_status',
        });

      expect(res.status).toBe(400);
    });

    it('should deny unauthorized status updates', async () => {
      const token = generateTestToken(citizen._id, 'citizen');

      const res = await request(app)
        .patch(`/api/v1/complaints/${complaint._id}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          newStatus: 'resolved',
        });

      expect(res.status).toBe(403);
    });
  });

  describe('Upvote Management', () => {
    let complaint: any;

    beforeEach(async () => {
      complaint = await Complaint.create(createTestComplaint({ citizen: citizen._id }));
    });

    it('should allow upvoting complaint', async () => {
      const otherCitizen = await User.create(createTestUser({ phone: '8888888888' }));
      const token = generateTestToken(otherCitizen._id, 'citizen');

      const res = await request(app)
        .post(`/api/v1/complaints/${complaint._id}/upvote`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.data.upvoteCount).toBeGreaterThan(0);
    });

    it('should prevent duplicate upvotes', async () => {
      const otherCitizen = await User.create(createTestUser({ phone: '8888888888' }));
      const token = generateTestToken(otherCitizen._id, 'citizen');

      // First upvote
      await request(app)
        .post(`/api/v1/complaints/${complaint._id}/upvote`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      // Second upvote (should fail or be idempotent)
      const res = await request(app)
        .post(`/api/v1/complaints/${complaint._id}/upvote`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBeOneOf([200, 400]);
    });

    it('should allow removing upvote', async () => {
      const otherCitizen = await User.create(createTestUser({ phone: '8888888888' }));
      const token = generateTestToken(otherCitizen._id, 'citizen');

      // Upvote
      await request(app)
        .post(`/api/v1/complaints/${complaint._id}/upvote`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      // Remove upvote
      const res = await request(app)
        .delete(`/api/v1/complaints/${complaint._id}/upvote`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(200);
    });
  });
});
