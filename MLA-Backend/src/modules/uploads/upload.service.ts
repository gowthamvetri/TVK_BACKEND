/**
 * Upload Service
 * Handles file uploads to Cloudinary (Free Tier).
 */
import { v2 as cloudinary } from 'cloudinary';
import config from '../../config';
import logger from '../../shared/logger';

// Configure Cloudinary
cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

/**
 * Upload a single image to Cloudinary
 * @param {string} filePath - Local file path or base64 data
 * @param {string} folder - Cloudinary folder name
 * @returns {Object} { url, publicId }
 */
const uploadImage = async (filePath: string, folder: string = 'mla-grievance') => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: 'image',
      transformation: [
        { width: 1200, crop: 'limit' },     // Max width 1200px
        { quality: 'auto:good' },             // Auto quality optimization
        { fetch_format: 'auto' },             // Auto format (WebP when supported)
      ],
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error) {
    logger.error('[UploadService] Image upload failed:', error);
    throw error;
  }
};

/**
 * Upload multiple images
 */
const uploadMultiple = async (filePaths: string[], folder: string = 'mla-grievance') => {
  const uploads = filePaths.map((filePath) => uploadImage(filePath, folder));
  return Promise.all(uploads);
};

/**
 * Delete an image from Cloudinary
 */
const deleteImage = async (publicId: string) => {
  try {
    await cloudinary.uploader.destroy(publicId);
    logger.debug(`[UploadService] Image deleted: ${publicId}`);
  } catch (error) {
    logger.error('[UploadService] Image deletion failed:', error);
  }
};

export default {
  uploadImage,
  uploadMultiple,
  deleteImage
};
