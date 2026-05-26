/**
 * User Service
 * Business logic for user management.
 */
import userRepository from './user.repository';
import { NotFoundError, BadRequestError } from '../../shared/utils/errors';
import { buildPaginationQuery, escapeRegex } from '../../shared/utils/helpers';

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

interface IUserContext {
  id: string;
  role: string;
  ward?: number;
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

const listUsers = async (query: IUserFilterQuery, userContext?: IUserContext, filters: Record<string, unknown> = {}) => {
  const { page, limit, skip, sort } = buildPaginationQuery(query);
  const filter: Record<string, unknown> = { ...filters };

  // SECURITY: Ward councillors can only list users in their ward
  if (userContext?.role === 'ward_councillor') {
    filter.ward = userContext.ward;
    // Ward councillors cannot override their ward filter via query params
  } else {
    // MLA or other roles can filter by ward if specified
    if (query.ward) filter.ward = parseInt(query.ward, 10);
  }

  if (query.role) filter.role = query.role;
  if (query.department) filter.department = query.department;
  if (query.isActive !== undefined) filter.isActive = query.isActive === 'true';
  if (query.search) {
    // SECURITY: Escape regex search terms to prevent regex injection
    const escapedSearch = escapeRegex(query.search);
    filter.$or = [
      { phone: { $regex: escapedSearch, $options: 'i' } },
      { name: { $regex: escapedSearch, $options: 'i' } },
    ];
  }

  const { data, total } = await userRepository.findAll(filter, { skip, limit, sort });
  return { data, total, page, limit };
};

const getOfficersForWard = async (ward: number) => {
  return userRepository.findOfficersByWard(ward);
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

const userService = {
  getProfile,
  updateProfile,
  listUsers,
  getOfficersForWard,
  deactivateUser,
  activateUser,
};

export default userService;
