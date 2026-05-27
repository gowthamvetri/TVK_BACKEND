/**
 * Announcement Service
 */
import { FilterQuery } from 'mongoose';
import Announcement, { IAnnouncement } from './Announcement.model';
import { NotFoundError } from '../../shared/utils/errors';
import { buildPaginationQuery, PaginationQuery } from '../../shared/utils/helpers';
import eventBus from '../../shared/events/eventBus';
import EVENTS from '../../shared/events/eventNames';

export interface IAnnouncementImage {
  url?: string;
  publicId?: string;
}

export interface IAnnouncementCreateDTO {
  title: string;
  body: string;
  category?: string;
  targetWards?: number[];
  publishDate?: Date;
  images?: IAnnouncementImage[];
  expiresAt?: Date;
}

export type IAnnouncementUpdateDTO = Partial<IAnnouncementCreateDTO>;

export interface IAnnouncementListQuery extends PaginationQuery {
  category?: string;
  ward?: string;
}

const create = async (authorId: string, authorRole: string, data: IAnnouncementCreateDTO) => {
  const announcement = await Announcement.create({
    ...data,
    author: authorId,
    authorRole,
  });
  eventBus.emit(EVENTS.ANNOUNCEMENT_CREATED, { announcement });
  return announcement;
};

const getById = async (id: string) => {
  const announcement = await Announcement.findById(id).populate('author', 'name role');
  if (!announcement) throw new NotFoundError('Announcement not found');
  // Increment view count
  await Announcement.findByIdAndUpdate(id, { $inc: { viewCount: 1 } });
  return announcement;
};

const list = async (query: IAnnouncementListQuery) => {
  const { page, limit, skip, sort } = buildPaginationQuery(query);
  const filter: FilterQuery<IAnnouncement> = { isActive: true };
  if (query.category) filter.category = query.category;
  if (query.ward) filter.$or = [{ targetWards: parseInt(query.ward, 10) }, { targetWards: { $size: 0 } }];

  const [data, total] = await Promise.all([
    Announcement.find(filter).populate('author', 'name role').sort(sort).skip(skip).limit(limit).lean(),
    Announcement.countDocuments(filter),
  ]);
  return { data, total, page, limit };
};

const update = async (id: string, data: IAnnouncementUpdateDTO) => {
  const announcement = await Announcement.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!announcement) throw new NotFoundError('Announcement not found');
  return announcement;
};

const deactivate = async (id: string) => {
  return Announcement.findByIdAndUpdate(id, { isActive: false }, { new: true });
};

export default {
  create,
  getById,
  list,
  update,
  deactivate
};
