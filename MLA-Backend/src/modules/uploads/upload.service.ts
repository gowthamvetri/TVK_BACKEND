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

import sharp from 'sharp';

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
  let uploadFilePath = filePath;
  let optimizedFilePath = '';

  try {
    const isImage = filePath.match(/\.(jpg|jpeg|png|webp|gif)$/i);
    const uploadOptions: any = {
      folder,
      resource_type: 'auto',
    };

    if (isImage) {
      optimizedFilePath = `${filePath.replace(/\.[^/.]+$/, '')}-optimized.webp`;
      
      await sharp(filePath)
        .resize({ width: 1200, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(optimizedFilePath);

      uploadFilePath = optimizedFilePath;
    }

    // SECURITY: Store metadata for ownership verification
    if (metadata) {
      uploadOptions.context = {
        resourceId: metadata.resourceId,
        resourceType: metadata.resourceType,
      };
    }

    const result = await cloudinary.uploader.upload(uploadFilePath, uploadOptions);

    return {
      url: result.secure_url,
      publicId: result.public_id,
      metadata: metadata,
    };
  } catch (error) {
    logger.error('[UploadService] Image upload failed:', error);
    throw error;
  } finally {
    // SECURITY: Always clean up temporary local file(s), whether upload succeeded or failed
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.debug(`[UploadService] Temporary original file cleaned up: ${filePath}`);
      }
      if (optimizedFilePath && fs.existsSync(optimizedFilePath)) {
        fs.unlinkSync(optimizedFilePath);
        logger.debug(`[UploadService] Temporary optimized file cleaned up: ${optimizedFilePath}`);
      }
    } catch (cleanupError) {
      logger.warn(`[UploadService] Failed to cleanup temp files:`, cleanupError);
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
