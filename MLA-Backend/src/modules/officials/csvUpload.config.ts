/**
 * CSV Upload Configuration
 */
import multer from 'multer';
import path from 'path';
import { Request } from 'express';
import { BadRequestError } from '../../shared/utils/errors';

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(__dirname, '../../../uploads/'));
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const isCsvMime = ['text/csv', 'application/vnd.ms-excel'].includes(file.mimetype);
  const hasCsvExt = path.extname(file.originalname).toLowerCase() === '.csv';

  if (isCsvMime || hasCsvExt) {
    cb(null, true);
  } else {
    cb(new BadRequestError('Only CSV files are allowed'));
  }
};

const csvUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB
    files: 1,
  },
});

export default csvUpload;
