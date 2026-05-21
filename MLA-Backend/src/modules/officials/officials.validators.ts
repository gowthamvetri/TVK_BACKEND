/**
 * Official Registry Validators
 */
import { body } from 'express-validator';

const hasUploadedFile = (req: Record<string, unknown>) => {
  if (req.file) return true;
  const files = req.files as
    | { [fieldname: string]: Express.Multer.File[] }
    | Express.Multer.File[]
    | undefined;
  if (!files) return false;
  if (Array.isArray(files)) return files.length > 0;
  return Boolean(files.file?.length || files.csv?.length);
};

const officialsValidators = {
  uploadCsv: [
    body().custom((_value, { req }) => {
      if (!hasUploadedFile(req)) {
        throw new Error('CSV file is required');
      }
      return true;
    }),
  ],
};

export default officialsValidators;
