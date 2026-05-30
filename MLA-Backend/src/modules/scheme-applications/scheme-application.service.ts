import { FilterQuery } from 'mongoose';
import SchemeApplication, { ISchemeApplication } from './SchemeApplication.model';
import Scheme from '../schemes/Scheme.model';
import { NotFoundError, ValidationError } from '../../shared/utils/errors';
import { buildPaginationQuery, PaginationQuery } from '../../shared/utils/helpers';

export interface ISubmittedDocument {
  documentName: string;
  url: string;
  publicId?: string;
}

export interface IApplicationCreateDTO {
  schemeId: string;
  submittedDocuments: ISubmittedDocument[];
  applicationData?: Record<string, unknown>;
}

export interface IApplicationListQuery extends PaginationQuery {
  status?: string;
}

const apply = async (citizenId: string, data: IApplicationCreateDTO) => {
  const scheme = await Scheme.findById(data.schemeId);
  if (!scheme) throw new NotFoundError('Scheme not found');
  if (!scheme.isActive) throw new ValidationError('This scheme is not active');

  // Validate required documents
  if (scheme.requiredDocuments && scheme.requiredDocuments.length > 0) {
    const requiredDocs = scheme.requiredDocuments.filter(doc => doc.isRequired);
    for (const requiredDoc of requiredDocs) {
      const isProvided = data.submittedDocuments.some(
        doc => doc.documentName.toLowerCase() === requiredDoc.name.toLowerCase()
      );
      if (!isProvided) {
        throw new ValidationError(`Required document missing: ${requiredDoc.name}`);
      }
    }
  }

  // Validate dynamic fields
  if (scheme.dynamicFields && scheme.dynamicFields.length > 0) {
    const appData = data.applicationData || {};
    for (const field of scheme.dynamicFields) {
      if (!appData[field] || (typeof appData[field] === 'string' && (appData[field] as string).trim() === '')) {
        throw new ValidationError(`Required field missing: ${field}`);
      }
    }
  }

  // Ensure user hasn't already applied
  const existing = await SchemeApplication.findOne({ scheme: data.schemeId, citizen: citizenId });
  if (existing) {
    throw new ValidationError('You have already applied for this scheme');
  }

  return SchemeApplication.create({
    scheme: data.schemeId,
    citizen: citizenId,
    submittedDocuments: data.submittedDocuments,
    applicationData: data.applicationData,
  });
};

const getById = async (id: string) => {
  const application = await SchemeApplication.findById(id)
    .populate('scheme', 'title category')
    .populate('citizen', 'name phone ward address');
  if (!application) throw new NotFoundError('Scheme Application not found');
  return application;
};

const listByCitizen = async (citizenId: string, query: IApplicationListQuery) => {
  const { page, limit, skip, sort } = buildPaginationQuery(query);
  const filter: FilterQuery<ISchemeApplication> = { citizen: citizenId };
  if (query.status) filter.status = query.status;

  const [data, total] = await Promise.all([
    SchemeApplication.find(filter)
      .populate('scheme', 'title category')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    SchemeApplication.countDocuments(filter),
  ]);
  return { data, total, page, limit };
};

const listByScheme = async (schemeId: string, query: IApplicationListQuery) => {
  const { page, limit, skip, sort } = buildPaginationQuery(query);
  const filter: FilterQuery<ISchemeApplication> = { scheme: schemeId };
  if (query.status) filter.status = query.status;

  const [data, total] = await Promise.all([
    SchemeApplication.find(filter)
      .populate('citizen', 'name phone ward')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    SchemeApplication.countDocuments(filter),
  ]);
  return { data, total, page, limit };
};

const updateStatus = async (id: string, status: string, remarks?: string) => {
  if (!['pending', 'approved', 'rejected'].includes(status)) {
    throw new ValidationError('Invalid status');
  }

  const application = await SchemeApplication.findByIdAndUpdate(
    id,
    { status, remarks },
    { new: true, runValidators: true }
  );

  if (!application) throw new NotFoundError('Scheme Application not found');
  
  // Potential future feature: Send notification to the citizen about status change
  
  return application;
};

export default {
  apply,
  getById,
  listByCitizen,
  listByScheme,
  updateStatus,
};
