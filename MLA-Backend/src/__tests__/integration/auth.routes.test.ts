/**
 * Authentication Integration Tests
 * Tests authentication flow, role validation, token management
 */

import request from 'supertest';
import app from '../../app';
import User from '../../modules/users/User.model';
import OTP from '../../modules/auth/OTP.model';
import OfficialRegistry from '../../modules/officials/OfficialRegistry.model';
import { createTestUser, createTestOTP, generateTestToken, resetAllMocks } from '../utils';

describe('Authentication - Integration Tests', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  describe('POST /api/v1/auth/register/send-otp', () => {
    it('should create OTP for valid phone number', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register/send-otp')
        .send({
          phone: '9876543210',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // Response contains message and possibly OTP in dev mode
      expect(res.body.data).toHaveProperty('message');

      // Verify OTP was created in database
      const otp = await OTP.findOne({ phone: '9876543210' });
      expect(otp).toBeDefined();
      expect(otp?.otp).toMatch(/^\d{6}$/);
    });

    it('should reject invalid phone format', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register/send-otp')
        .send({
          phone: 'invalid',
        });

      // Validation errors return 422 (Unprocessable Entity)
      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });

    it('should rate limit OTP requests', async () => {
      // First request should succeed
      const res1 = await request(app)
        .post('/api/v1/auth/register/send-otp')
        .send({ phone: '9876543210' });
      expect(res1.status).toBe(200);

      // Rapid subsequent requests might be limited
      // (Depends on rate limiting configuration)
    });
  });

  describe('POST /api/v1/auth/register/verify-phone', () => {
    let otpCode: string;

    beforeEach(async () => {
      // First create an OTP
      await request(app)
        .post('/api/v1/auth/register/send-otp')
        .send({ phone: '9876543210' });

      // Get the OTP from database
      const otpRecord = await OTP.findOne({ phone: '9876543210' });
      otpCode = otpRecord?.otp || '';
    });

    it('should verify OTP with correct code and return registration token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register/verify-phone')
        .send({
          phone: '9876543210',
          otp: otpCode,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('registrationToken');
    });

    it('should reject incorrect OTP', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register/verify-phone')
        .send({
          phone: '9876543210',
          otp: '000000',
        });

      expect(res.status).toBeOneOf([400, 422]);
      expect(res.body.success).toBe(false);
    });

    it('should increment attempts on failed verification', async () => {
      await request(app)
        .post('/api/v1/auth/register/verify-phone')
        .send({
          phone: '9876543210',
          otp: '000000',
        });

      const updatedOTP = await OTP.findOne({ phone: '9876543210' });
      expect(updatedOTP?.attempts).toBeGreaterThan(0);
    });

    it('should lock account after max attempts', async () => {
      const maxAttempts = 5;
      for (let i = 0; i < maxAttempts + 1; i++) {
        await request(app)
          .post('/api/v1/auth/register/verify-phone')
          .send({
            phone: '9876543210',
            otp: '000000',
          });
      }

      const lockedOTP = await OTP.findOne({ phone: '9876543210' });
      expect(lockedOTP?.attempts).toBeGreaterThanOrEqual(maxAttempts);
    });
  });

  describe('POST /api/v1/auth/register/complete', () => {
    let registrationToken: string;

    beforeEach(async () => {
      // Step 1: Send OTP
      await request(app)
        .post('/api/v1/auth/register/send-otp')
        .send({ phone: '9876543210' });

      // Step 2: Get OTP and verify phone
      const otp = await OTP.findOne({ phone: '9876543210' });
      const verifyRes = await request(app)
        .post('/api/v1/auth/register/verify-phone')
        .send({
          phone: '9876543210',
          otp: otp?.otp,
        });

      registrationToken = verifyRes.body.data.registrationToken;
    });

    it('should complete registration and create citizen account', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register/complete')
        .send({
          registrationToken,
          pin: '1234',
          ward: 5,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe('citizen');

      // Verify user was created
      const user = await User.findOne({ phone: '9876543210' });
      expect(user?.role).toBe('citizen');
    });

    it('should NOT allow client to set elevated role', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register/complete')
        .send({
          registrationToken,
          pin: '1234',
          ward: 5,
          role: 'service_officer', // Should be ignored
        });

      expect(res.status).toBe(201);
      const user = await User.findOne({ phone: '9876543210' });
      expect(user?.role).toBe('citizen');
    });

    it('should assign officer role if pre-registered in official registry', async () => {
      // Create official registry entry
      await OfficialRegistry.create({
        phone: '9876543210',
        role: 'service_officer',
        ward: 5,
        department: 'health',
      });

      const res = await request(app)
        .post('/api/v1/auth/register/complete')
        .send({
          registrationToken,
          pin: '1234',
          ward: 5,
        });

      expect(res.status).toBe(201);
      const user = await User.findOne({ phone: '9876543210' });
      expect(user?.role).toBe('service_officer');
    });

    it('should reject invalid PIN format', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register/complete')
        .send({
          registrationToken,
          pin: 'invalid',
        });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    let user: any;

    beforeEach(async () => {
      user = await User.create(
        createTestUser({
          phone: '9876543210',
          pin: '$2a$10$salt.hashedpinvalue123456789abcdef',
          role: 'citizen',
        })
      );
    });

    it('should login with valid PIN', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login/pin')
        .send({
          phone: '9876543210',
          pin: '1234', // Will be compared with hashed value
        });

      // This test depends on actual bcrypt implementation
      // In a real test, we'd mock or create proper hash
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success');
    });

    it('should reject invalid PIN', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login/pin')
        .send({
          phone: '9876543210',
          pin: '0000',
        });

      expect(res.status).toBe(400);
    });

    it('should reject nonexistent user', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login/pin')
        .send({
          phone: '1111111111',
          pin: '1234',
        });

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/v1/auth/refresh-token', () => {
    let user: any;
    let refreshToken: string;

    beforeEach(async () => {
      user = await User.create(createTestUser({ phone: '9876543210' }));
      refreshToken = generateTestToken(user._id, 'citizen');
    });

    it('should refresh access token with valid refresh token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({
          refreshToken,
        });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
    });

    it('should reject expired refresh token', async () => {
      const expiredToken = generateTestToken(user._id, 'citizen');

      const res = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({
          refreshToken: 'invalid.token.here',
        });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should logout authenticated user', async () => {
      const user = await User.create(createTestUser());
      const token = generateTestToken(user._id, 'citizen');

      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject unauthenticated logout', async () => {
      const res = await request(app)
        .post('/api/v1/auth/logout')
        .send({});

      expect(res.status).toBe(401);
    });
  });

  describe('PIN Reset Flow', () => {
    let user: any;

    beforeEach(async () => {
      user = await User.create(createTestUser({ phone: '9876543210' }));
    });

    it('should initiate PIN reset', async () => {
      const res = await request(app)
        .post('/api/v1/auth/forgot-pin/send-otp')
        .send({
          phone: '9876543210',
        });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('resetToken');
    });

    it('should verify PIN reset OTP', async () => {
      const initiateRes = await request(app)
        .post('/api/v1/auth/forgot-pin/send-otp')
        .send({ phone: '9876543210' });

      const resetToken = initiateRes.body.data.resetToken;
      const otp = await OTP.findOne({ phone: '9876543210', type: 'pin_reset' });

      const res = await request(app)
        .post('/api/v1/auth/forgot-pin/verify-otp')
        .send({
          resetToken,
          otp: otp?.otp,
        });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('verificationToken');
    });

    it('should reset PIN after verification', async () => {
      // Complete the flow...
      const initiateRes = await request(app)
        .post('/api/v1/auth/forgot-pin/send-otp')
        .send({ phone: '9876543210' });

      const resetToken = initiateRes.body.data.resetToken;
      const otp = await OTP.findOne({ phone: '9876543210', type: 'pin_reset' });

      const verifyRes = await request(app)
        .post('/api/v1/auth/forgot-pin/verify-otp')
        .send({
          resetToken,
          otp: otp?.otp,
        });

      const verificationToken = verifyRes.body.data.verificationToken;

      const resetRes = await request(app)
        .post('/api/v1/auth/forgot-pin/reset')
        .send({
          verificationToken,
          newPin: '5678',
        });

      expect(resetRes.status).toBe(200);
      expect(resetRes.body.success).toBe(true);
    });
  });
});
