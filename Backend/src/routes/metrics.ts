import { Router } from 'express';
import { Order } from '../models/Order';
import { Customer } from '../models/Customer';
import { Hardware } from '../models/Hardware';
import { Payment } from '../models/Payment';
import mongoose from 'mongoose';

export const metricsRouter = Router();

// Helper to build branch filter
const buildBranchFilter = (branchId: string | undefined) => {
  if (!branchId) return {};
  try {
    return { branchId: new mongoose.Types.ObjectId(branchId) };
  } catch {
    return { branchId };
  }
};

// Helper to build a date range filter for a given field
const buildDateFilter = (field: string, dateFrom?: string, dateTo?: string) => {
  if (!dateFrom && !dateTo) return {};
  const filter: Record<string, unknown> = {};
  const range: Record<string, unknown> = {};
  if (dateFrom) range['$gte'] = new Date(dateFrom);
  if (dateTo) {
    const end = new Date(dateTo);
    end.setHours(23, 59, 59, 999);
    range['$lte'] = end;
  }
  filter[field] = range;
  return filter;
};

// Get dashboard metrics
metricsRouter.get('/dashboard', async (req, res) => {
  try {
    const { branchId, dateFrom, dateTo } = req.query;
    const branchFilter = buildBranchFilter(branchId as string);
    const dateFilter = buildDateFilter('createdAt', dateFrom as string, dateTo as string);
    const paymentDateFilter = buildDateFilter('paymentDate', dateFrom as string, dateTo as string);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const orderBaseFilter = { ...branchFilter, ...dateFilter };

    // Order counts per status
    const [totalOrders, pendingOrders, processingOrders, completedOrders, cancelledOrders] = await Promise.all([
      Order.countDocuments(orderBaseFilter),
      Order.countDocuments({ ...orderBaseFilter, status: 'pending' }),
      Order.countDocuments({ ...orderBaseFilter, status: 'processing' }),
      Order.countDocuments({ ...orderBaseFilter, status: 'completed' }),
      Order.countDocuments({ ...orderBaseFilter, status: 'cancelled' }),
    ]);

    // Revenue from completed payments — scoped to branch when specified
    const revenueAgg = await Payment.aggregate([
      { $match: { paymentStatus: 'completed', ...paymentDateFilter } },
      {
        $lookup: {
          from: 'orders',
          localField: 'orderId',
          foreignField: '_id',
          as: 'orderInfo'
        }
      },
      { $unwind: { path: '$orderInfo', preserveNullAndEmptyArrays: false } },
      {
        $match: {
          'orderInfo.status': { $ne: 'cancelled' },
          ...(branchFilter.branchId ? { 'orderInfo.branchId': branchFilter.branchId } : {})
        }
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalRevenue = revenueAgg[0]?.total || 0;

    // Last month vs this month revenue change
    const lastMonthPaymentFilter = buildDateFilter('paymentDate', startOfLastMonth.toISOString(), endOfLastMonth.toISOString());
    const thisMonthPaymentFilter = buildDateFilter('paymentDate', startOfMonth.toISOString(), undefined);

    const [lastMonthRevenueAgg, thisMonthRevenueAgg] = await Promise.all([
      Payment.aggregate([
        { $match: { paymentStatus: 'completed', ...lastMonthPaymentFilter } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Payment.aggregate([
        { $match: { paymentStatus: 'completed', ...thisMonthPaymentFilter } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);
    const lastMonthRevenue = lastMonthRevenueAgg[0]?.total || 0;
    const thisMonthRevenue = thisMonthRevenueAgg[0]?.total || 0;
    const revenueChange = lastMonthRevenue > 0
      ? parseFloat(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1))
      : 0;

    // Monthly revenue chart (last 6 months from payments)
    const chartData = await Payment.aggregate([
      { $match: { paymentStatus: 'completed' } },
      {
        $group: {
          _id: { year: { $year: '$paymentDate' }, month: { $month: '$paymentDate' } },
          value: { $sum: '$amount' }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 6 }
    ]);

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const formattedChartData = chartData
      .map(item => ({ month: months[item._id.month - 1], value: item.value }))
      .reverse();

    // Customer stats
    const [totalCustomers, newCustomers] = await Promise.all([
      Customer.countDocuments(),
      Customer.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
    ]);

    // Active customers: placed a non-cancelled order in last 30 days
    const activeCustomersAgg = await Order.aggregate([
      { $match: { ...branchFilter, createdAt: { $gte: thirtyDaysAgo }, status: { $ne: 'cancelled' } } },
      { $group: { _id: '$customer' } },
      { $count: 'count' }
    ]);
    const activeCustomers = activeCustomersAgg[0]?.count || 0;

    // Hardware/Inventory stats
    const [totalItems, lowStockItems, outOfStockItems] = await Promise.all([
      Hardware.countDocuments(),
      Hardware.countDocuments({ quantity: { $gt: 0, $lte: 10 } }),
      Hardware.countDocuments({ quantity: 0 }),
    ]);

    res.json({
      revenue: {
        total: totalRevenue,
        change: revenueChange,
        chartData: formattedChartData.length > 0
          ? formattedChartData
          : [{ month: months[now.getMonth()], value: thisMonthRevenue }]
      },
      orders: {
        total: totalOrders,
        pending: pendingOrders,
        processing: processingOrders,
        completed: completedOrders,
        cancelled: cancelledOrders
      },
      customers: { total: totalCustomers, new: newCustomers, active: activeCustomers },
      inventory: { totalItems, lowStock: lowStockItems, outOfStock: outOfStockItems }
    });
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard metrics' });
  }
});

// Get sales metrics
metricsRouter.get('/sales', async (req, res) => {
  try {
    const { branchId, dateFrom, dateTo } = req.query;
    const branchFilter = buildBranchFilter(branchId as string);
    const orderDateFilter = buildDateFilter('createdAt', dateFrom as string, dateTo as string);

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Sales from completed payments
    const [dailySales, weeklySales, monthlySales] = await Promise.all([
      Payment.aggregate([
        { $match: { paymentStatus: 'completed', paymentDate: { $gte: startOfDay } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Payment.aggregate([
        { $match: { paymentStatus: 'completed', paymentDate: { $gte: startOfWeek } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Payment.aggregate([
        { $match: { paymentStatus: 'completed', paymentDate: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
    ]);

    // Top items by revenue  unwind order items, group by name, sum qty and revenue
    const topProducts = await Order.aggregate([
      { $match: { ...branchFilter, status: { $ne: 'cancelled' }, ...orderDateFilter } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.name',
          sales: { $sum: '$items.qty' },
          revenue: { $sum: { $multiply: ['$items.price', '$items.qty'] } }
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 },
      { $project: { name: '$_id', sales: 1, revenue: 1, _id: 0 } }
    ]);

    res.json({
      daily: dailySales[0]?.total || 0,
      weekly: weeklySales[0]?.total || 0,
      monthly: monthlySales[0]?.total || 0,
      topProducts
    });
  } catch (error) {
    console.error('Error fetching sales metrics:', error);
    res.status(500).json({ error: 'Failed to fetch sales metrics' });
  }
});

// Get top customers by spend
metricsRouter.get('/top-customers', async (req, res) => {
  try {
    const { branchId, dateFrom, dateTo, limit } = req.query;
    const branchFilter = buildBranchFilter(branchId as string);
    const dateFilter = buildDateFilter('createdAt', dateFrom as string, dateTo as string);
    const resultLimit = Math.min(parseInt(limit as string) || 10, 50);

    const topCustomers = await Order.aggregate([
      { $match: { ...branchFilter, status: { $ne: 'cancelled' }, ...dateFilter } },
      {
        $group: {
          _id: '$customer',
          orders: { $sum: 1 },
          spent: { $sum: '$total' }
        }
      },
      { $sort: { spent: -1 } },
      { $limit: resultLimit },
      { $project: { name: '$_id', orders: 1, spent: 1, _id: 0 } }
    ]);

    res.json({ topCustomers });
  } catch (error) {
    console.error('Error fetching top customers:', error);
    res.status(500).json({ error: 'Failed to fetch top customers' });
  }
});

// Get daily order counts for the last N days (default 7)
metricsRouter.get('/daily-orders', async (req, res) => {
  try {
    const { branchId, days } = req.query;
    const branchFilter = buildBranchFilter(branchId as string);
    const numDays = Math.min(parseInt(days as string) || 7, 90);

    const start = new Date();
    start.setDate(start.getDate() - numDays + 1);
    start.setHours(0, 0, 0, 0);

    const dailyCounts = await Order.aggregate([
      { $match: { ...branchFilter, createdAt: { $gte: start } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          orders: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const result = [];
    for (let i = 0; i < numDays; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const day = d.getDate();
      const found = dailyCounts.find(
        (c) => c._id.year === year && c._id.month === month && c._id.day === day
      );
      result.push({
        day: numDays <= 7 ? dayNames[d.getDay()] : `${month}/${day}`,
        date: d.toISOString().slice(0, 10),
        orders: found?.orders || 0
      });
    }

    res.json({ dailyOrders: result });
  } catch (error) {
    console.error('Error fetching daily orders:', error);
    res.status(500).json({ error: 'Failed to fetch daily orders' });
  }
});

// Get performance metrics
metricsRouter.get('/performance', async (req, res) => {
  try {
    const { branchId } = req.query;
    const branchFilter = buildBranchFilter(branchId as string);

    const completedOrders = await Order.find({ ...branchFilter, status: 'completed' }).select('createdAt updatedAt');

    let avgFulfillmentDays = 0;
    if (completedOrders.length > 0) {
      const totalMs = completedOrders.reduce((sum, order) => {
        return sum + (order.updatedAt.getTime() - order.createdAt.getTime());
      }, 0);
      avgFulfillmentDays = totalMs / completedOrders.length / (1000 * 60 * 60 * 24);
    }

    const [totalOrders, completedCount] = await Promise.all([
      Order.countDocuments(branchFilter),
      Order.countDocuments({ ...branchFilter, status: 'completed' })
    ]);
    const completionRate = totalOrders > 0 ? (completedCount / totalOrders * 5) : 0;

    const hardwareCount = await Hardware.countDocuments();
    const turnoverRate = hardwareCount > 0 ? (completedCount / hardwareCount) : 0;

    res.json({
      orderFulfillmentTime: { average: parseFloat(avgFulfillmentDays.toFixed(1)) || 0, unit: 'days' },
      customerSatisfaction: { score: parseFloat(completionRate.toFixed(1)) || 4.5, max: 5 },
      inventoryTurnover: { rate: parseFloat(turnoverRate.toFixed(1)) || 0, period: 'annual' }
    });
  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    res.status(500).json({ error: 'Failed to fetch performance metrics' });
  }
});

// Get revenue by payment type
metricsRouter.get('/revenue-by-payment-type', async (req, res) => {
  try {
    const { branchId, dateFrom, dateTo } = req.query;
    const dateFilter = buildDateFilter('paymentDate', dateFrom as string, dateTo as string);

    const pipeline: mongoose.PipelineStage[] = [
      { $match: { paymentStatus: 'completed', ...dateFilter } }
    ];

    if (branchId) {
      pipeline.push(
        { $lookup: { from: 'orders', localField: 'orderId', foreignField: '_id', as: 'order' } } as mongoose.PipelineStage,
        { $unwind: '$order' } as mongoose.PipelineStage,
        { $match: { 'order.branchId': new mongoose.Types.ObjectId(branchId as string) } } as mongoose.PipelineStage
      );
    }

    pipeline.push(
      { $group: { _id: '$paymentMethod', totalAmount: { $sum: '$amount' }, count: { $sum: 1 } } } as mongoose.PipelineStage,
      { $sort: { totalAmount: -1 } } as mongoose.PipelineStage
    );

    const revenueByType = await Payment.aggregate(pipeline);

    const methodLabels: Record<string, string> = { cash: 'Cash', card: 'Card', mobile_money: 'Mobile Money', bank_transfer: 'Bank Transfer' };
    const methodColors: Record<string, string> = { cash: 'hsl(142 70% 45%)', card: 'hsl(218 55% 22%)', mobile_money: 'hsl(45 93% 47%)', bank_transfer: 'hsl(280 60% 50%)' };

    const formatted = revenueByType.map(item => ({
      method: item._id,
      name: methodLabels[item._id] || item._id,
      amount: item.totalAmount,
      count: item.count,
      color: methodColors[item._id] || 'hsl(215 15% 48%)'
    }));

    res.json({ byPaymentType: formatted, total: formatted.reduce((sum, item) => sum + item.amount, 0) });
  } catch (error) {
    console.error('Error fetching revenue by payment type:', error);
    res.status(500).json({ error: 'Failed to fetch revenue by payment type' });
  }
});

// Get revenue by currency
metricsRouter.get('/revenue-by-currency', async (req, res) => {
  try {
    const { branchId, dateFrom, dateTo } = req.query;
    const dateFilter = buildDateFilter('paymentDate', dateFrom as string, dateTo as string);

    const pipeline: mongoose.PipelineStage[] = [
      { $match: { paymentStatus: 'completed', ...dateFilter } }
    ];

    if (branchId) {
      pipeline.push(
        { $lookup: { from: 'orders', localField: 'orderId', foreignField: '_id', as: 'order' } } as mongoose.PipelineStage,
        { $unwind: '$order' } as mongoose.PipelineStage,
        { $match: { 'order.branchId': new mongoose.Types.ObjectId(branchId as string) } } as mongoose.PipelineStage
      );
    }

    pipeline.push(
      { $group: { _id: '$currency', totalOriginalAmount: { $sum: '$originalAmount' }, totalUsdAmount: { $sum: '$amount' }, count: { $sum: 1 } } } as mongoose.PipelineStage,
      { $sort: { totalUsdAmount: -1 } } as mongoose.PipelineStage
    );

    const revenueByCurrency = await Payment.aggregate(pipeline);

    const currencyLabels: Record<string, string> = { USD: 'US Dollar', ZWL: 'Zimbabwean Dollar' };
    const currencySymbols: Record<string, string> = { USD: '$', ZWL: 'Z$' };
    const currencyColors: Record<string, string> = { USD: 'hsl(218 55% 22%)', ZWL: 'hsl(142 70% 45%)' };

    const formatted = revenueByCurrency.map(item => ({
      currency: item._id,
      name: currencyLabels[item._id] || item._id,
      symbol: currencySymbols[item._id] || '',
      originalAmount: item.totalOriginalAmount,
      usdAmount: item.totalUsdAmount,
      count: item.count,
      color: currencyColors[item._id] || 'hsl(215 15% 48%)'
    }));

    res.json({ byCurrency: formatted, totalUsd: formatted.reduce((sum, item) => sum + item.usdAmount, 0) });
  } catch (error) {
    console.error('Error fetching revenue by currency:', error);
    res.status(500).json({ error: 'Failed to fetch revenue by currency' });
  }
});

// Get daily overview — all figures computed server-side, scoped to the requested day and branch
metricsRouter.get('/daily-overview', async (req, res) => {
  try {
    const { branchId, date } = req.query;
    const branchFilter = buildBranchFilter(branchId as string);

    // Build start/end of the requested calendar day
    const dateStr = (date as string) || new Date().toISOString().slice(0, 10);
    const [yr, mo, dy] = dateStr.split('-').map(Number);
    const dayStart = new Date(yr, mo - 1, dy, 0, 0, 0, 0);
    const dayEnd   = new Date(yr, mo - 1, dy, 23, 59, 59, 999);

    // 1. Fetch orders for this day and branch (use the 'date' field — that is what is set on order creation)
    const orders = await Order.find({
      ...branchFilter,
      date: { $gte: dayStart, $lte: dayEnd },
      deleted: { $ne: true },
    }).lean() as any[];

    const totalOrders = orders.length;

    const totalPieces = orders.reduce((sum: number, o: any) => {
      if (o.totalPieces && o.totalPieces > 0) return sum + o.totalPieces;
      if (Array.isArray(o.items)) {
        return sum + o.items.reduce((s: number, item: any) => s + ((item.pieces || 1) * (item.qty || 1)), 0);
      }
      return sum;
    }, 0);

    const unpaidAmount = orders.reduce((sum: number, o: any) =>
      sum + Math.max(0, (o.total || 0) - (o.paidAmount || 0)), 0);

    // 2. Status breakdown from orders
    const statusCounts: Record<string, number> = {};
    for (const o of orders) statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
    const ordersByStatus = Object.entries(statusCounts)
      .map(([status, count]) => ({ status: status.charAt(0).toUpperCase() + status.slice(1), count }))
      .filter(s => s.count > 0)
      .sort((a, b) => b.count - a.count);

    // 3. Revenue = completed payments whose orderId is in today's order set
    const orderIds = orders.map((o: any) => o._id);

    let totalRevenue = 0;
    let revenueByPaymentMethod: { method: string; amount: number; count: number }[] = [];
    let revenueByCurrency: { currency: string; symbol: string; originalAmount: number; usdAmount: number; count: number }[] = [];

    const methodLabels: Record<string, string> = {
      cash: 'Cash', card: 'Card', mobile_money: 'Mobile Money', bank_transfer: 'Bank Transfer'
    };
    const currencySymbols: Record<string, string> = { USD: '$', ZWL: 'Z$' };

    if (orderIds.length > 0) {
      const paymentBase = { orderId: { $in: orderIds }, paymentStatus: 'completed' };

      const [revAgg, methodAgg, currAgg] = await Promise.all([
        Payment.aggregate([
          { $match: paymentBase },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        Payment.aggregate([
          { $match: paymentBase },
          { $group: { _id: '$paymentMethod', amount: { $sum: '$amount' }, count: { $sum: 1 } } },
          { $sort: { amount: -1 } },
        ]),
        Payment.aggregate([
          { $match: paymentBase },
          { $group: { _id: '$currency', originalAmount: { $sum: '$originalAmount' }, usdAmount: { $sum: '$amount' }, count: { $sum: 1 } } },
          { $sort: { usdAmount: -1 } },
        ]),
      ]);

      totalRevenue = revAgg[0]?.total || 0;

      revenueByPaymentMethod = (methodAgg as any[]).map((m) => ({
        method: methodLabels[m._id] || m._id,
        amount: m.amount,
        count: m.count,
      }));

      revenueByCurrency = (currAgg as any[]).map((c) => ({
        currency: c._id,
        symbol: currencySymbols[c._id] || '',
        originalAmount: c.originalAmount,
        usdAmount: c.usdAmount,
        count: c.count,
      }));
    }

    res.json({
      totalOrders,
      totalPieces,
      totalRevenue,
      unpaidAmount,
      ordersByStatus,
      revenueByPaymentMethod,
      revenueByCurrency,
      topItems: [], // removed from day view
    });
  } catch (error) {
    console.error('Error fetching daily overview:', error);
    res.status(500).json({ error: 'Failed to fetch daily overview' });
  }
});
