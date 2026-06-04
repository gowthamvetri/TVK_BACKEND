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
      const value = appData[field.label];
      const isMissing = value === undefined || value === null || (typeof value === 'string' && value.trim() === '');

      if (field.isRequired && isMissing) {
        throw new ValidationError(`Required field missing: ${field.label}`);
      }

      if (!isMissing) {
        if (field.type === 'number') {
          if (isNaN(Number(value))) {
            throw new ValidationError(`Field ${field.label} must be a valid number`);
          }
        } else if (field.type === 'select') {
          if (field.options && field.options.length > 0) {
            if (!field.options.includes(value as string)) {
              throw new ValidationError(`Field ${field.label} must be one of: ${field.options.join(', ')}`);
            }
          }
        }
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

const exportApplications = async (schemeId: string) => {
  const scheme = await Scheme.findById(schemeId);
  if (!scheme) throw new NotFoundError('Scheme not found');

  const applications = await SchemeApplication.find({ scheme: schemeId })
    .populate('citizen', 'name phone ward')
    .sort('-createdAt')
    .lean() as any[];

  if (applications.length === 0) {
    throw new ValidationError('No applications found for this scheme to export');
  }

  const data = applications.map(app => {
    const baseData: Record<string, any> = {
      'Scheme Name': scheme.title,
      'Applicant Name': app.citizen?.name || 'N/A',
      'Applicant Phone': app.citizen?.phone || 'N/A',
      'Ward': app.citizen?.ward || 'N/A',
      'Status': app.status,
      'Applied On': app.createdAt ? new Date(app.createdAt).toLocaleString() : '',
      'Remarks': app.remarks || '',
    };

    // Flatten dynamic application data fields
    if (app.applicationData) {
      for (const [key, value] of Object.entries(app.applicationData)) {
        baseData[`Field: ${key}`] = value;
      }
    }

    // Flatten document URLs
    if (app.submittedDocuments && Array.isArray(app.submittedDocuments)) {
      app.submittedDocuments.forEach((doc: any) => {
        baseData[`Doc: ${doc.documentName}`] = doc.url;
      });
    }

    return baseData;
  });

  const { Parser } = require('json2csv');
  const parser = new Parser();
  return parser.parse(data);
};

export default {
  apply,
  getById,
  listByCitizen,
  listByScheme,
  updateStatus,
  exportApplications,
};
