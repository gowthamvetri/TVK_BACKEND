import { Request, Response } from 'express';
import schemeApplicationService, { IApplicationCreateDTO, ISubmittedDocument, IApplicationListQuery } from './scheme-application.service';
import uploadService from '../uploads/upload.service';
import ApiResponse from '../../shared/utils/ApiResponse';
import asyncHandler from '../../shared/utils/asyncHandler';

const apply = asyncHandler(async (req: Request, res: Response) => {
  const { schemeId, documentNames, applicationData } = req.body;
  
  const submittedDocuments: ISubmittedDocument[] = [];

  if (req.files && Array.isArray(req.files) && req.files.length > 0) {
    const filePaths = req.files.map((file: Express.Multer.File) => file.path);
    const uploadedImages = await uploadService.uploadMultiple(filePaths, 'mla-grievance/schemes/applications');
    
    // Parse documentNames if it's sent as a JSON string from FormData
    let parsedNames: string[] = [];
    if (typeof documentNames === 'string') {
      try {
        parsedNames = JSON.parse(documentNames);
      } catch {
        parsedNames = [documentNames];
      }
    } else if (Array.isArray(documentNames)) {
      parsedNames = documentNames;
    }

    uploadedImages.forEach((uploadInfo, index) => {
      submittedDocuments.push({
        documentName: parsedNames[index] || `Document ${index + 1}`,
        url: uploadInfo.url || '',
        publicId: uploadInfo.publicId,
      });
    });
  }

  let parsedData = applicationData;
  if (typeof applicationData === 'string') {
    try {
      parsedData = JSON.parse(applicationData);
    } catch {
      parsedData = { raw: applicationData };
    }
  }

  const applicationCreateDto: IApplicationCreateDTO = {
    schemeId,
    submittedDocuments,
    applicationData: parsedData,
  };

  const application = await schemeApplicationService.apply(req.user!.id, applicationCreateDto);
  return ApiResponse.created(res, { data: application });
});

const getById = asyncHandler(async (req: Request, res: Response) => {
  const application = await schemeApplicationService.getById(req.params.id);
  return ApiResponse.success(res, { data: application });
});

const listMyApplications = asyncHandler(async (req: Request<unknown, unknown, unknown, IApplicationListQuery>, res: Response) => {
  const { data, total, page, limit } = await schemeApplicationService.listByCitizen(req.user!.id, req.query);
  return ApiResponse.paginated(res, { data, total, page, limit });
});

const listSchemeApplications = asyncHandler(async (req: Request<{ schemeId: string }, unknown, unknown, IApplicationListQuery>, res: Response) => {
  const { data, total, page, limit } = await schemeApplicationService.listByScheme(req.params.schemeId, req.query);
  return ApiResponse.paginated(res, { data, total, page, limit });
});

const updateStatus = asyncHandler(async (req: Request<{ id: string }, unknown, { status: string; remarks?: string }>, res: Response) => {
  const { status, remarks } = req.body;
  const application = await schemeApplicationService.updateStatus(req.params.id, status, remarks);
  return ApiResponse.success(res, { data: application });
});

const exportApplications = asyncHandler(async (req: Request<{ schemeId: string }>, res: Response) => {
  const csvData = await schemeApplicationService.exportApplications(req.params.schemeId);
  
  res.header('Content-Type', 'text/csv');
  res.attachment('scheme_applications.csv');
  return res.send(csvData);
});

export default {
  apply,
  getById,
  listMyApplications,
  listSchemeApplications,
  updateStatus,
  exportApplications,
};
