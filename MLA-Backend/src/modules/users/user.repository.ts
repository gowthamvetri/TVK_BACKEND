/**
 * User Repository
 * Data access layer for user operations.
 */
import mongoose from 'mongoose';
import User, { IUser } from './User.model';

type UserId = mongoose.Types.ObjectId | string;

interface UserListOptions {
  skip?: number;
  limit?: number;
  sort?: string;
}

const findById = async (id: UserId): Promise<IUser | null> => {
  return User.findById(id);
};

const findByPhone = async (phone: string): Promise<IUser | null> => {
  return User.findOne({ phone });
};

const create = async (userData: Partial<IUser>): Promise<IUser> => {
  return User.create(userData);
};

const update = async (id: UserId, updateData: Partial<IUser>): Promise<IUser | null> => {
  return User.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
};

const findOfficersByWardAndDepartment = async (ward: number, department: string): Promise<IUser[]> => {
  return User.find({
    role: 'service_officer',
    ward,
    department,
    isActive: true,
  });
};

const findOfficersByWard = async (ward: number): Promise<IUser[]> => {
  return User.find({
    role: 'service_officer',
    ward,
    isActive: true,
  });
};

const findWardCouncillor = async (ward: number): Promise<IUser | null> => {
  return User.findOne({
    role: 'ward_councillor',
    ward,
    isActive: true,
  });
};

const findMLA = async (): Promise<IUser | null> => {
  return User.findOne({
    role: 'mla',
    isActive: true,
  });
};

const findAll = async (filter: Record<string, unknown> = {}, options: UserListOptions = {}): Promise<{ data: IUser[]; total: number }> => {
  const { skip = 0, limit = 20, sort = '-createdAt' } = options;
  const [data, total] = await Promise.all([
    User.find(filter).sort(sort).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);
  return { data, total };
};

const deactivate = async (userId: UserId): Promise<IUser | null> => {
  return User.findByIdAndUpdate(userId, { isActive: false }, { new: true });
};

const activate = async (userId: UserId): Promise<IUser | null> => {
  return User.findByIdAndUpdate(userId, { isActive: true }, { new: true });
};

const userRepository = {
  findById,
  findByPhone,
  create,
  update,
  findOfficersByWardAndDepartment,
  findOfficersByWard,
  findWardCouncillor,
  findMLA,
  findAll,
  deactivate,
  activate,
};

export default userRepository;
