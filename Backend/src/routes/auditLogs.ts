import { Router } from 'express';
import { AuditLog } from '../models/AuditLog';
import { authMiddleware } from '../middleware/auth';

export const auditLogRouter = Router();

auditLogRouter.get('/', authMiddleware, async (req, res) => {
  try {
    const { userId, limit = 100, action } = req.query;
    const filter: any = {};
    if (userId) filter.userId = userId;
    if (action) filter.action = action;
    const logs = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit));
    res.json({ logs });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});
