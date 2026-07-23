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

import { ROLES, TOTAL_WARDS } from '../../shared/constants';
import User from './User.model';

export interface ICreateDeputyDTO {
  phone: string;
  pin: string;
  ward?: number;
  permissions: string[];
}

export interface ICreateOfficialDTO {
  phone: string;
  pin: string;
  role: string;
  ward?: number;
  department?: string;
  permissions?: string[];
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

const createDeputy = async (data: ICreateDeputyDTO) => {
  const existingUser = await userRepository.findByPhone(data.phone);
  if (existingUser) {
    throw new BadRequestError('User with this phone number already exists', 'PHONE_EXISTS');
  }

  const deputy = await userRepository.create({
    phone: data.phone,
    pin: data.pin,
    role: ROLES.DEPUTY,
    ward: data.ward,
    permissions: data.permissions,
    isVerified: true,
    isActive: true,
  });

  return deputy;
};

const createOfficial = async (data: ICreateOfficialDTO) => {
  const existingUser = await userRepository.findByPhone(data.phone);
  if (existingUser) {
    throw new BadRequestError('User with this phone number already exists', 'PHONE_EXISTS');
  }

  const official = await userRepository.create({
    phone: data.phone,
    pin: data.pin,
    role: data.role,
    ward: data.ward,
    department: data.department,
    permissions: data.role === ROLES.DEPUTY ? (data.permissions || []) : undefined,
    isVerified: true,
    isActive: true,
  });

  return official;
};

const listDeputies = async () => {
  const deputies = await User.find({ role: ROLES.DEPUTY });
  return deputies;
};

const updateDeputyPermissions = async (deputyId: string, permissions: string[]) => {
  const deputy = await User.findOne({ _id: deputyId, role: ROLES.DEPUTY });
  if (!deputy) {
    throw new NotFoundError('Deputy not found');
  }

  deputy.permissions = permissions;
  await deputy.save();
  return deputy;
};

const transferCouncillor = async (councillorId: string, targetWard: number) => {
  const councillor = await userRepository.findById(councillorId);
  if (!councillor) {
    throw new NotFoundError('Councillor not found');
  }

  if (councillor.role !== ROLES.WARD_COUNCILLOR) {
    throw new BadRequestError('Target user is not a ward councillor', 'INVALID_ROLE');
  }

  // 1. Find existing active councillor for the target ward
  const existingWardCouncillor = await userRepository.findWardCouncillor(targetWard);
  if (existingWardCouncillor && existingWardCouncillor._id.toString() !== councillorId) {
    // Demote/unassign the previous councillor
    existingWardCouncillor.ward = undefined;
    existingWardCouncillor.isFormerCouncillor = true;
    await existingWardCouncillor.save();
  }

  // 2. Transfer requested councillor to target ward
  councillor.ward = targetWard;
  councillor.isFormerCouncillor = false;
  councillor.isActive = true;
  await councillor.save();

  return {
    transferredCouncillor: councillor,
    previousCouncillor: existingWardCouncillor && existingWardCouncillor._id.toString() !== councillorId ? existingWardCouncillor : null,
  };
};

const getVacantWards = async () => {
  // Find all active ward councillors with assigned wards
  const activeCouncillors = await User.find({
    role: ROLES.WARD_COUNCILLOR,
    isActive: true,
    ward: { $exists: true, $ne: null },
  }).select('ward');

  const occupiedWards = new Set(activeCouncillors.map((c) => c.ward));
  const vacantWards: number[] = [];

  for (let ward = 1; ward <= TOTAL_WARDS; ward++) {
    if (!occupiedWards.has(ward)) {
      vacantWards.push(ward);
    }
  }

  return {
    totalWards: TOTAL_WARDS,
    occupiedCount: occupiedWards.size,
    vacantCount: vacantWards.length,
    vacantWards,
  };
};

const userService = {
  getProfile,
  updateProfile,
  listUsers,
  getOfficersForWard,
  deactivateUser,
  activateUser,
  createDeputy,
  createOfficial,
  listDeputies,
  updateDeputyPermissions,
  transferCouncillor,
  getVacantWards,
};

export default userService;
