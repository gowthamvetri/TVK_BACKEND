/**
 * User Service
 * Business logic for user management.
 */
import userRepository from './user.repository';
import { NotFoundError, BadRequestError } from '../../shared/utils/errors';
import { buildPaginationQuery } from '../../shared/utils/helpers';

export interface IProfileUpdate {
  pin?: string;
  role?: string;
  phone?: string;
  [key: string]: unknown;
}

export interface IUserFilterQuery {
  role?: string;
  ward?: string;
  department?: string;
  isActive?: string;
  search?: string;
  page?: string;
  limit?: string;
  sort?: string;
  skip?: string;
  [key: string]: unknown;
}

const getProfile = async (userId: string) => {
  const user = await userRepository.findById(userId);
  if (!user) throw new NotFoundError('User not found');
  return user;
};

const updateProfile = async (userId: string, updateData: IProfileUpdate) => {
  // Prevent role changes through profile update
  delete updateData.role;
  delete updateData.phone;
  delete updateData.pin;

  const user = await userRepository.update(userId, updateData);
  if (!user) throw new NotFoundError('User not found');
  return user;
};

const updateFCMToken = async (userId: string, fcmToken: string) => {
  return userRepository.updateFCMToken(userId, fcmToken);
};

const listUsers = async (query: IUserFilterQuery, filters: Record<string, unknown> = {}) => {
  const { page, limit, skip, sort } = buildPaginationQuery(query);
  const filter: Record<string, unknown> = { ...filters };

  if (query.role) filter.role = query.role;
  if (query.ward) filter.ward = parseInt(query.ward, 10);
  if (query.department) filter.department = query.department;
  if (query.isActive !== undefined) filter.isActive = query.isActive === 'true';
  if (query.search) {
    filter.$or = [
      { phone: { $regex: query.search, $options: 'i' } },
    ];
  }

  const { data, total } = await userRepository.findAll(filter, { skip, limit, sort });
  return { data, total, page, limit };
};

const deactivateUser = async (userId: string) => {
  const user = await userRepository.deactivate(userId);
  if (!user) throw new NotFoundError('User not found');
  return user;
};

const activateUser = async (userId: string) => {
  const user = await userRepository.activate(userId);
  if (!user) throw new NotFoundError('User not found');
  return user;
};

const getOfficersForWard = async (ward: number) => {
  return userRepository.findOfficersByWard(ward);
};

const userService = {
  getProfile,
  updateProfile,
  updateFCMToken,
  listUsers,
  deactivateUser,
  activateUser,
  getOfficersForWard,
};

export default userService;
