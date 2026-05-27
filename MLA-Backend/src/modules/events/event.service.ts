/**
 * Event Service
 */
import { FilterQuery } from 'mongoose';
import EventModel, { IEvent } from './Event.model';
import { NotFoundError } from '../../shared/utils/errors';
import { buildPaginationQuery, PaginationQuery } from '../../shared/utils/helpers';
import eventBus from '../../shared/events/eventBus';
import EVENTS from '../../shared/events/eventNames';

export interface IEventImage {
  url?: string;
  publicId?: string;
}

export interface IEventCreateDTO {
  title: string;
  description: string;
  eventDate: Date;
  venueName: string;
  images?: IEventImage[];
}

export type IEventUpdateDTO = Partial<IEventCreateDTO>;

export interface IEventListQuery extends PaginationQuery {
  upcomingOnly?: string; // 'true' or 'false'
}

const create = async (authorId: string, authorRole: string, data: IEventCreateDTO) => {
  const eventDoc = await EventModel.create({
    ...data,
    author: authorId,
    authorRole,
  });
  // Note: if you want to broadcast this, you can add an eventName for EVENT_CREATED
  // eventBus.emit('EVENT_CREATED', { event: eventDoc });
  return eventDoc;
};

const getById = async (id: string) => {
  const eventDoc = await EventModel.findById(id).populate('author', 'name role');
  if (!eventDoc) throw new NotFoundError('Event not found');
  // Increment view count
  await EventModel.findByIdAndUpdate(id, { $inc: { viewCount: 1 } });
  return eventDoc;
};

const list = async (query: IEventListQuery) => {
  const { page, limit, skip, sort } = buildPaginationQuery(query);
  const filter: FilterQuery<IEvent> = { isActive: true };
  
  if (query.upcomingOnly === 'true') {
    filter.eventDate = { $gte: new Date() };
  }

  const [data, total] = await Promise.all([
    EventModel.find(filter).populate('author', 'name role').sort(sort).skip(skip).limit(limit).lean(),
    EventModel.countDocuments(filter),
  ]);
  return { data, total, page, limit };
};

const update = async (id: string, data: IEventUpdateDTO) => {
  const eventDoc = await EventModel.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!eventDoc) throw new NotFoundError('Event not found');
  return eventDoc;
};

const deactivate = async (id: string) => {
  return EventModel.findByIdAndUpdate(id, { isActive: false }, { new: true });
};

export default {
  create,
  getById,
  list,
  update,
  deactivate
};
