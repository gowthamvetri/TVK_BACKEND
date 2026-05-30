/**
 * Scheme Service
 */
import { FilterQuery } from 'mongoose';
import Scheme, { IScheme } from './Scheme.model';
import { NotFoundError } from '../../shared/utils/errors';
import { buildPaginationQuery, PaginationQuery } from '../../shared/utils/helpers';

export interface ISchemeImage {
  url?: string;
  publicId?: string;
}

export interface ISchemeCreateDTO {
  title: string;
  description: string;
  category?: string;
  eligibility?: string;
  benefits?: string;
  applicationLink?: string;
  startDate?: Date;
  endDate?: Date;
  images?: ISchemeImage[];
  targetWards?: number[];
  requiredDocuments?: { name: string; isRequired: boolean }[];
  dynamicFields?: string[];
}

export type ISchemeUpdateDTO = Partial<ISchemeCreateDTO>;

export interface ISchemeListQuery extends PaginationQuery {
  category?: string;
  ward?: string;
}

const create = async (userId: string, data: ISchemeCreateDTO) => {
  return Scheme.create({ ...data, createdBy: userId });
};

const getById = async (id: string) => {
  const scheme = await Scheme.findById(id).populate('createdBy', 'name role');
  if (!scheme) throw new NotFoundError('Scheme not found');
  return scheme;
};

const list = async (query: ISchemeListQuery) => {
  const { page, limit, skip, sort } = buildPaginationQuery(query);
  const filter: FilterQuery<IScheme> = { isActive: true };
  if (query.category) filter.category = query.category;
  if (query.ward) filter.$or = [{ targetWards: parseInt(query.ward, 10) }, { targetWards: { $size: 0 } }];

  const [data, total] = await Promise.all([
    Scheme.find(filter).populate('createdBy', 'name role').sort(sort).skip(skip).limit(limit).lean(),
    Scheme.countDocuments(filter),
  ]);
  return { data, total, page, limit };
};

const update = async (id: string, data: ISchemeUpdateDTO) => {
  const scheme = await Scheme.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!scheme) throw new NotFoundError('Scheme not found');
  return scheme;
};

const deactivate = async (id: string) => {
  return Scheme.findByIdAndUpdate(id, { isActive: false }, { new: true });
};

export default {
  create,
  getById,
  list,
  update,
  deactivate
};
