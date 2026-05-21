/**
 * Feedback Service
 */
import { FilterQuery } from 'mongoose';
import Feedback, { IFeedback } from './Feedback.model';
import { buildPaginationQuery, PaginationQuery } from '../../shared/utils/helpers';

export interface IFeedbackCreateDTO {
  message: string;
}

export interface IFeedbackListQuery extends PaginationQuery {
  citizen?: string;
}

const create = async (citizenId: string, data: IFeedbackCreateDTO) => {
  return Feedback.create({
    citizen: citizenId,
    message: data.message,
  });
};

const list = async (query: IFeedbackListQuery) => {
  const { page, limit, skip, sort } = buildPaginationQuery(query);
  const filter: FilterQuery<IFeedback> = {};
  if (query.citizen) {
    filter.citizen = query.citizen;
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
