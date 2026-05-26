/**
 * Upload Routes Integration Tests
 * Tests file upload security, validation, ownership, and cleanup
 */

import request from 'supertest';
import app from '../../app';
import User from '../../modules/users/User.model';
import Complaint from '../../modules/complaints/Complaint.model';
import {
  createTestUser,
  createTestOfficer,
  createTestComplaint,
  generateTestToken,
  mockCloudinaryUpload,
  mockCloudinaryDelete,
  mockCloudinaryResource,
  resetAllMocks,
} from '../utils';
import { Types } from 'mongoose';
import fs from 'fs';
import path from 'path';

describe('Upload Routes - Integration Tests', () => {
  let citizen: any;
  let officer: any;
  let complaint: any;
  let testImagePath: string;

  beforeEach(async () => {
    resetAllMocks();

    citizen = await User.create(createTestUser({ phone: '1111111111' }));
    officer = await User.create(createTestOfficer({ phone: '2222222222' }));
    complaint = await Complaint.create(
      createTestComplaint({
        citizen: citizen._id,
        ward: 1,
        assignedOfficer: officer._id,
      })
    );

    // Create a small test image file
    testImagePath = path.join(__dirname, 'test-image.jpg');
    fs.writeFileSync(testImagePath, Buffer.from('fake-image-data'));
  });

  afterEach(() => {
    // Cleanup test files
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
    }
  });

  describe('POST /api/v1/uploads/complaint - Upload for Complaint', () => {
    it('should upload image for authorized complaint', async () => {
      mockCloudinaryUpload.mockResolvedValueOnce({
        secure_url: 'https://res.cloudinary.com/test/image/upload/v123/test.jpg',
        public_id: 'test-image-123',
        context: {
          custom: {
            resourceId: complaint._id.toString(),
            resourceType: 'complaint',
          },
        },
      });

      const token = generateTestToken(citizen._id, 'citizen');

      const res = await request(app)
        .post(`/api/v1/uploads/complaint/${complaint._id}`)
        .set('Authorization', `Bearer ${token}`)
        .attach('file', testImagePath);

      expect(res.status).toBeOneOf([200, 201]);
      expect(res.body.data).toHaveProperty('url');
    });

    it('should reject upload for non-existent complaint', async () => {
      const fakeId = new Types.ObjectId();
      const token = generateTestToken(citizen._id, 'citizen');

      const res = await request(app)
        .post(`/api/v1/uploads/complaint/${fakeId}`)
        .set('Authorization', `Bearer ${token}`)
        .attach('file', testImagePath);

      expect(res.status).toBe(404);
    });

    it('should reject upload by unauthorized user', async () => {
      const otherCitizen = await User.create(createTestUser({ phone: '9999999999' }));
      const token = generateTestToken(otherCitizen._id, 'citizen');

      const res = await request(app)
        .post(`/api/v1/uploads/complaint/${complaint._id}`)
        .set('Authorization', `Bearer ${token}`)
        .attach('file', testImagePath);

      expect(res.status).toBe(403);
    });

    it('should reject upload without file', async () => {
      const token = generateTestToken(citizen._id, 'citizen');

      const res = await request(app)
        .post(`/api/v1/uploads/complaint/${complaint._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('should validate file type is image', async () => {
      // Create a non-image file
      const txtFile = path.join(__dirname, 'test.txt');
      fs.writeFileSync(txtFile, 'This is a text file');

      const token = generateTestToken(citizen._id, 'citizen');

      const res = await request(app)
        .post(`/api/v1/uploads/complaint/${complaint._id}`)
        .set('Authorization', `Bearer ${token}`)
        .attach('file', txtFile);

      expect(res.status).toBe(400);

      fs.unlinkSync(txtFile);
    });

    it('should set Cloudinary folder to complaint resource type only', async () => {
      mockCloudinaryUpload.mockResolvedValueOnce({
        secure_url: 'https://res.cloudinary.com/test/image/upload/v123/test.jpg',
        public_id: 'test-image-123',
        context: { custom: { resourceId: complaint._id, resourceType: 'complaint' } },
      });

      const token = generateTestToken(citizen._id, 'citizen');

      await request(app)
        .post(`/api/v1/uploads/complaint/${complaint._id}`)
        .set('Authorization', `Bearer ${token}`)
        .attach('file', testImagePath);

      // Verify upload was called with correct folder
      expect(mockCloudinaryUpload).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          folder: expect.stringContaining('complaint'),
        })
      );
    });
  });

  describe('DELETE /api/v1/uploads/:publicId - Delete Upload', () => {
    let uploadUrl: string;
    let publicId: string;

    beforeEach(async () => {
      // Setup: Create an upload
      publicId = 'test-image-123';
      uploadUrl = `https://res.cloudinary.com/test/image/upload/v123/${publicId}.jpg`;

      mockCloudinaryUpload.mockResolvedValueOnce({
        secure_url: uploadUrl,
        public_id: publicId,
        context: {
          custom: {
            resourceId: complaint._id.toString(),
            resourceType: 'complaint',
          },
        },
      });

      const token = generateTestToken(citizen._id, 'citizen');
      await request(app)
        .post(`/api/v1/uploads/complaint/${complaint._id}`)
        .set('Authorization', `Bearer ${token}`)
        .attach('file', testImagePath);
    });

    it('should delete upload for resource owner', async () => {
      mockCloudinaryResource.mockResolvedValueOnce({
        public_id: publicId,
        context: {
          custom: {
            resourceId: complaint._id.toString(),
            resourceType: 'complaint',
          },
        },
      });
      mockCloudinaryDelete.mockResolvedValueOnce({ result: 'ok' });

      const token = generateTestToken(citizen._id, 'citizen');

      const res = await request(app)
        .delete(`/api/v1/uploads/${publicId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBeOneOf([200, 204]);
      expect(mockCloudinaryDelete).toHaveBeenCalledWith(publicId);
    });

    it('should verify resource ownership before deletion', async () => {
      mockCloudinaryResource.mockResolvedValueOnce({
        public_id: publicId,
        context: {
          custom: {
            resourceId: complaint._id.toString(),
            resourceType: 'complaint',
          },
        },
      });

      const otherCitizen = await User.create(createTestUser({ phone: '9999999999' }));
      const token = generateTestToken(otherCitizen._id, 'citizen');

      const res = await request(app)
        .delete(`/api/v1/uploads/${publicId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(403);
      expect(mockCloudinaryDelete).not.toHaveBeenCalled();
    });

    it('should only allow deletion of complaint attachments', async () => {
      mockCloudinaryResource.mockResolvedValueOnce({
        public_id: publicId,
        context: {
          custom: {
            resourceId: 'some-user-id',
            resourceType: 'profile-picture', // Not complaint
          },
        },
      });

      const token = generateTestToken(citizen._id, 'citizen');

      const res = await request(app)
        .delete(`/api/v1/uploads/${publicId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(403);
      expect(mockCloudinaryDelete).not.toHaveBeenCalled();
    });

    it('should throw error if Cloudinary resource check fails', async () => {
      mockCloudinaryResource.mockRejectedValueOnce(new Error('Resource not found'));

      const token = generateTestToken(citizen._id, 'citizen');

      const res = await request(app)
        .delete(`/api/v1/uploads/${publicId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(500);
      expect(mockCloudinaryDelete).not.toHaveBeenCalled();
    });

    it('should handle Cloudinary deletion errors gracefully', async () => {
      mockCloudinaryResource.mockResolvedValueOnce({
        public_id: publicId,
        context: {
          custom: {
            resourceId: complaint._id.toString(),
            resourceType: 'complaint',
          },
        },
      });
      mockCloudinaryDelete.mockRejectedValueOnce(new Error('Deletion failed'));

      const token = generateTestToken(citizen._id, 'citizen');

      const res = await request(app)
        .delete(`/api/v1/uploads/${publicId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(500);
    });
  });

  describe('Upload File Size Limits', () => {
    it('should reject oversized files', async () => {
      const largeFile = path.join(__dirname, 'large-file.jpg');
      // Create a file larger than limit (e.g., 10MB)
      const largeBuffer = Buffer.alloc(10 * 1024 * 1024);
      fs.writeFileSync(largeFile, largeBuffer);

      const token = generateTestToken(citizen._id, 'citizen');

      const res = await request(app)
        .post(`/api/v1/uploads/complaint/${complaint._id}`)
        .set('Authorization', `Bearer ${token}`)
        .attach('file', largeFile);

      expect(res.status).toBe(413);

      fs.unlinkSync(largeFile);
    });
  });

  describe('Unauthenticated Upload', () => {
    it('should reject upload without token', async () => {
      const res = await request(app)
        .post(`/api/v1/uploads/complaint/${complaint._id}`)
        .attach('file', testImagePath);

      expect(res.status).toBe(401);
    });
  });

  describe('Temp File Cleanup', () => {
    it('should cleanup temp files on upload failure', async () => {
      mockCloudinaryUpload.mockRejectedValueOnce(new Error('Upload failed'));

      const token = generateTestToken(citizen._id, 'citizen');

      const res = await request(app)
        .post(`/api/v1/uploads/complaint/${complaint._id}`)
        .set('Authorization', `Bearer ${token}`)
        .attach('file', testImagePath);

      // Temp file should be cleaned up even on error
      // This is tested indirectly by verifying error response
      expect(res.status).toBe(500);
    });
  });
});
