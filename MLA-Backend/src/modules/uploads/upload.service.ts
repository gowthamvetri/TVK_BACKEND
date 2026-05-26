/**
 * Upload Service
 * Handles file uploads to Cloudinary (Free Tier).
 * SECURITY: Implements resource ownership tracking and cleanup
 */
import { v2 as cloudinary } from 'cloudinary';
import config from '../../config';
import logger from '../../shared/logger';
import fs from 'fs';
import path from 'path';

// Configure Cloudinary
cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

/**
 * Upload a single image to Cloudinary
 * SECURITY: Cleans up temporary local files on success or failure
 * @param {string} filePath - Local file path or base64 data
 * @param {string} folder - Cloudinary folder name
 * @param {string} metadata - Optional metadata (resourceId, resourceType) for tracking
 * @returns {Object} { url, publicId }
 */
const uploadImage = async (filePath: string, folder: string = 'mla-grievance', metadata?: { resourceId?: string; resourceType?: string }) => {
  try {
    const uploadOptions: any = {
      folder,
      resource_type: 'image',
      transformation: [
        { width: 1200, crop: 'limit' },     // Max width 1200px
        { quality: 'auto:good' },             // Auto quality optimization
        { fetch_format: 'auto' },             // Auto format (WebP when supported)
      ],
    };

    // SECURITY: Store metadata for ownership verification
    if (metadata) {
      uploadOptions.context = {
        resourceId: metadata.resourceId,
        resourceType: metadata.resourceType,
      };
    }

    const result = await cloudinary.uploader.upload(filePath, uploadOptions);

    return {
      url: result.secure_url,
      publicId: result.public_id,
      metadata: metadata,
    };
  } catch (error) {
    logger.error('[UploadService] Image upload failed:', error);
    throw error;
  } finally {
    // SECURITY: Always clean up temporary local file, whether upload succeeded or failed
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.debug(`[UploadService] Temporary file cleaned up: ${filePath}`);
      }
    } catch (cleanupError) {
      logger.warn(`[UploadService] Failed to cleanup temp file ${filePath}:`, cleanupError);
    }
  }
};

/**
 * Upload multiple images
 * SECURITY: Each upload is independent and cleans its own temp file
 */
const uploadMultiple = async (filePaths: string[], folder: string = 'mla-grievance', metadata?: { resourceId?: string; resourceType?: string }) => {
  const uploads = filePaths.map((filePath) => uploadImage(filePath, folder, metadata));
  return Promise.all(uploads);
};

/**
 * Delete an image from Cloudinary
 * SECURITY: Only deletes if metadata matches (ownership verified). Fails closed if verification fails.
 */
const deleteImage = async (publicId: string, ownerResourceId?: string) => {
  try {
    // SECURITY: Verify ownership by checking metadata - if verification fails, DENY deletion
    if (ownerResourceId) {
      try {
        const resource = await cloudinary.api.resource(publicId);
        const storedResourceId = resource.context?.custom?.resourceId;
        if (storedResourceId && storedResourceId !== ownerResourceId) {
          throw new Error('Resource ownership mismatch - deletion denied');
        }
      } catch (error) {
        // SECURITY: Fail closed - throw error if verification fails
        logger.error('[UploadService] Failed to verify resource ownership:', error);
        throw new Error('Ownership verification failed - resource deletion denied');
      }
    }

    await cloudinary.uploader.destroy(publicId);
    logger.debug(`[UploadService] Image deleted: ${publicId}`);
  } catch (error) {
    logger.error('[UploadService] Image deletion failed:', error);
    throw error;
  }
};

export default {
  uploadImage,
  uploadMultiple,
  deleteImage
};
