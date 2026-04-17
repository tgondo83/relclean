import { AuditLog } from '../models/AuditLog';
import { Request, Response, NextFunction } from 'express';

export const logActivity = (action: string, details?: string) => async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user) {
      await AuditLog.create({
        userId: req.user.userId,
        action,
        details,
        ip: req.ip,
      });
    }
  } catch (err) {
    // Optionally log error
  }
  next();
};
