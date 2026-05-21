/**
 * Helper Utilities
 */
import crypto from 'crypto';

/**
 * Generate a random numeric OTP
 * @param length - OTP length (default: 6)
 */
export const generateOTP = (length = 6): string => {
  const digits = '0123456789';
  let otp = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i += 1) {
    otp += digits[bytes[i] % 10];
  }
  return otp;
};

/**
 * Calculate distance between two geo coordinates (Haversine formula)
 * @returns Distance in meters
 */
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Build pagination query params
 */
export interface PaginationQuery {
  page?: string | number;
  limit?: string | number;
  sort?: string;
}

export const buildPaginationQuery = <T extends PaginationQuery>(query: T) => {
  const pageValue = typeof query.page === 'number' ? `${query.page}` : query.page;
  const limitValue = typeof query.limit === 'number' ? `${query.limit}` : query.limit;
  const page = Math.max(parseInt(pageValue || '', 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(limitValue || '', 10) || 20, 1), 100);
  const skip = (page - 1) * limit;
  const sort = typeof query.sort === 'string' && query.sort ? query.sort : '-createdAt';
  return { page, limit, skip, sort };
};

/**
 * Generate a unique tracking ID for complaints
 */
export const generateTrackingId = (prefix = 'GRV'): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

/**
 * Sanitize search string for safe regex usage
 */
export const escapeRegex = (str: string): string => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};
