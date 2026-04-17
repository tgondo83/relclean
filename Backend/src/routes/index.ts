import { Router } from 'express';
import { ordersRouter } from './orders.js';
import { customersRouter } from './customers.js';
import { hardwareRouter } from './hardware.js';
import { metricsRouter } from './metrics.js';
import { usersRouter } from './users.js';
import { branchesRouter } from './branches.js';
import { paymentsRouter } from './payments.js';
import { exchangeRatesRouter } from './exchangeRates.js';
import { companyRouter } from './company.js';
import { authRouter } from './auth.js';
import { authMiddleware } from '../middleware/auth.js';
import itemsRouter from './items.js';
import { auditLogRouter } from './auditLogs.js';

export const router = Router();

// Public routes (no auth required)
router.use('/auth', authRouter);

// Protected routes (auth required)
router.use('/orders', authMiddleware, ordersRouter);
router.use('/customers', authMiddleware, customersRouter);
router.use('/hardware', authMiddleware, hardwareRouter);
router.use('/metrics', authMiddleware, metricsRouter);
router.use('/users', authMiddleware, usersRouter);
router.use('/branches', authMiddleware, branchesRouter);
router.use('/payments', authMiddleware, paymentsRouter);

router.use('/exchange-rates', authMiddleware, exchangeRatesRouter);
router.use('/company', authMiddleware, companyRouter);
router.use('/items', authMiddleware, itemsRouter);
router.use('/audit-logs', auditLogRouter);

// Default route
router.get('/', (req, res) => {
  res.json({ 
    message: 'Reliable API',
    version: '1.0.0',
    endpoints: {
      orders: '/api/orders',
      customers: '/api/customers',
      hardware: '/api/hardware',
      metrics: '/api/metrics',
      users: '/api/users',
      branches: '/api/branches',
      payments: '/api/payments',
      exchangeRates: '/api/exchange-rates',
      company: '/api/company',
      items: '/api/items'
    }
  });
});
