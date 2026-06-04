/**
 * Feedback Service
 */
import { FilterQuery } from 'mongoose';
import Feedback, { IFeedback } from './Feedback.model';
import { buildPaginationQuery, PaginationQuery } from '../../shared/utils/helpers';

export interface IFeedbackCreateDTO {
  message: string;
  ward?: number;
}

export interface IFeedbackListQuery extends PaginationQuery {
  citizen?: string;
  ward?: number;
}

const create = async (citizenId: string, data: IFeedbackCreateDTO) => {
  return Feedback.create({
    citizen: citizenId,
    message: data.message,
    ...(data.ward && { ward: data.ward }),
  });
};

const list = async (query: IFeedbackListQuery) => {
  const { page, limit, skip, sort } = buildPaginationQuery(query);
  const filter: FilterQuery<IFeedback> = {};
  if (query.citizen) {
    filter.citizen = query.citizen;
  }
  if (query.ward) {
    filter.ward = query.ward;
  }

  const [data, total] = await Promise.all([
    Feedback.find(filter)
      .populate('citizen', 'name phone role')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Feedback.countDocuments(filter),
  ]);

  return { data, total, page, limit };
};

export default {
  create,
  list,
};
