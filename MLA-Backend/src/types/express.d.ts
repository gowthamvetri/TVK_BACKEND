import { Document } from 'mongoose';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: string;
        department?: string;
        ward?: number;
      };
    }
  }
}

export {};
