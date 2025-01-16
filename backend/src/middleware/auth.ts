import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    throw new AppError(401, 'Authentication required');
  }
  next();
};