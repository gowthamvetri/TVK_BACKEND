/**
 * Async Handler Wrapper
 * Wraps async route handlers to automatically catch errors
 * and pass them to Express error handling middleware.
 */
import { Request, Response, NextFunction } from 'express';

const asyncHandler = <P, ResBody, ReqBody, ReqQuery>(
  fn: (req: Request<P, ResBody, ReqBody, ReqQuery>, res: Response, next: NextFunction) => Promise<unknown>
) => {
  return (req: Request<P, ResBody, ReqBody, ReqQuery>, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default asyncHandler;
