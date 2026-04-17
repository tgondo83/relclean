import { Router } from 'express';
import { Order } from '../models/Order.js';
import { getNextSequence } from '../models/Counter.js';
import mongoose from 'mongoose';
import { getAllOrders, addOrder, getOrderById as getMockOrderById, getBranchById as getMockBranchById } from '../services/mockDb.js';
import { logActivity } from '../middleware/auditLog';
import { Customer } from '../models/Customer.js';
import { Branch } from '../models/Branch.js';
import { AuditLog } from '../models/AuditLog.js';
import { Payment } from '../models/Payment.js';

export const ordersRouter = Router();

const isMongoDB = () => mongoose.connection.readyState === 1;

// Get all orders (optionally filter by branch, exclude deleted by default)
ordersRouter.get('/', async (req, res) => {
  try {
    const { branchId } = req.query;
    if (!isMongoDB()) {
      const allOrders = getAllOrders();
      const filteredOrders = branchId ? allOrders.filter((o: any) => o.branchId === branchId) : allOrders;
      return res.json({ orders: filteredOrders });
    }
    const query: any = branchId ? { branchId } : {};
    query.deleted = false;
    const limit = Math.min(Number(req.query.limit) || 200, 500);
    const skip = Math.max(Number(req.query.skip) || 0, 0);
    const customer = req.query.customer as string | undefined;
    if (customer) query.customer = { $regex: new RegExp(`^${customer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') };
    const [orders, total] = await Promise.all([
      Order.find(query).sort({ date: -1 }).skip(skip).limit(limit).lean(),
      Order.countDocuments(query),
    ]);
    // Enrich orders with customerPhone from Customer collection when missing
    const missingPhoneOrders = orders.filter((o: any) => !o.customerPhone);
    if (missingPhoneOrders.length > 0) {
      const customerNames = [...new Set(missingPhoneOrders.map((o: any) => o.customer).filter(Boolean))] as string[];
      const nameRegexes = customerNames.map((n) => new RegExp(`^${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'));
      const customers = await Customer.find({ name: { $in: nameRegexes } }).select('name phone').lean();
      const phoneMap = new Map((customers as { name: string; phone: string }[]).map((c) => [c.name.toLowerCase(), c.phone]));
      (orders as any[]).forEach((o) => {
        if (!o.customerPhone && o.customer) {
          o.customerPhone = phoneMap.get(o.customer.toLowerCase()) || '';
        }
      });
    }    // Enrich orders with paymentMethod from Payment collection when missing
    const missingMethodOrders = (orders as any[]).filter((o) => !o.paymentMethod);
    if (missingMethodOrders.length > 0) {
      const missingIds = missingMethodOrders.map((o) => o._id);
      const payments = await Payment.find(
        { orderId: { $in: missingIds }, paymentStatus: 'completed' },
        { orderId: 1, paymentMethod: 1, paymentDate: 1 }
      ).sort({ paymentDate: -1 }).lean();
      const methodMap = new Map<string, string>();
      for (const p of payments as { orderId: mongoose.Types.ObjectId; paymentMethod: string }[]) {
        const key = p.orderId.toString();
        if (!methodMap.has(key)) methodMap.set(key, p.paymentMethod);
      }
      (orders as any[]).forEach((o) => {
        if (!o.paymentMethod) o.paymentMethod = methodMap.get(o._id.toString()) || null;
      });
    }    res.set('Cache-Control', 'private, max-age=5');
    res.json({ orders, total });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get deleted orders
ordersRouter.get('/deleted', async (req, res) => {
  try {
    const { branchId } = req.query;
    if (!isMongoDB()) {
      return res.json({ orders: [] });
    }
    const query: any = branchId ? { branchId } : {};
    query.deleted = true;
    const limit = Math.min(Number(req.query.limit) || 200, 500);
    const skip = Math.max(Number(req.query.skip) || 0, 0);
    const [orders, total] = await Promise.all([
      Order.find(query).sort({ date: -1 }).skip(skip).limit(limit).lean(),
      Order.countDocuments(query),
    ]);
    res.json({ orders, total });
  } catch (error) {
    console.error('Error fetching deleted orders:', error);
    res.status(500).json({ error: 'Failed to fetch deleted orders' });
  }
});

// Get order by ID or order number
ordersRouter.get('/:id', async (req, res) => {
  try {
    let { id } = req.params;
    if (Array.isArray(id)) id = id[0];
    
    if (!isMongoDB()) {
      const order = getMockOrderById(id);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }
      return res.json(order);
    }
    
    const order = await Order.findOne({
      $or: [
        ...(mongoose.Types.ObjectId.isValid(id) ? [{ _id: new mongoose.Types.ObjectId(id) }] : []),
        { orderNumber: id }
      ]
    }).lean();
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Create new order
ordersRouter.post('/', logActivity('order_create'), async (req, res) => {
  try {
    const orderData = req.body;
    const { branchId } = orderData;

    if (!branchId) {
      return res.status(400).json({ error: 'Branch ID is required' });
    }

    // Allow branchPrefix to be omitted; infer it from the branch record when possible.
    let branchPrefix: string | undefined = orderData.branchPrefix;
    if (!branchPrefix) {
      if (!isMongoDB()) {
        const branch = getMockBranchById(branchId);
        if (branch?.prefix) {
          branchPrefix = branch.prefix;
        } else if (branch?.name) {
          branchPrefix = branch.name.substring(0, 2).toUpperCase();
        }
      } else {
        const branch = await Branch.findById(branchId);
        if (branch?.prefix) {
          branchPrefix = branch.prefix;
        } else if (branch?.name) {
          branchPrefix = branch.name.substring(0, 2).toUpperCase();
        }
      }
    }

    if (!branchPrefix) {
      return res.status(400).json({ error: 'Branch prefix is required' });
    }

    // Ensure customerPhone is set
    let customerPhone = orderData.customerPhone;
    if (!customerPhone && orderData.customer) {
      // Try to look up customer by name (case-insensitive)
      const escapedName = orderData.customer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const customerDoc = await Customer.findOne({ name: { $regex: new RegExp(`^${escapedName}$`, 'i') } });
      if (customerDoc && customerDoc.phone) customerPhone = customerDoc.phone;
    }

    if (!isMongoDB()) {
      // Use mock database for order creation
      // Generate a simple sequence number for this branch
      const branchOrders = getAllOrders().filter((o: any) => o.branchPrefix === branchPrefix);
      const sequenceNumber = branchOrders.length + 1;
      const orderNumber = `${branchPrefix}-${String(sequenceNumber).padStart(3, '0')}`;

      const newOrder = addOrder({
        orderNumber,
        branchId,
        branchPrefix,
        customer: orderData.customer,
        customerPhone: customerPhone || '',
        items: orderData.items || [],
        total: orderData.total || 0,
        status: orderData.status || 'processing',
      });

      return res.status(201).json(newOrder);
    }

    // Get next sequence number for this branch
    const sequenceNumber = await getNextSequence(branchPrefix);
    const orderNumber = `${branchPrefix}-${String(sequenceNumber).padStart(3, '0')}`;

    const newOrder = new Order({
      orderNumber,
      branchId,
      branchPrefix,
      customer: orderData.customer,
      customerPhone: customerPhone || '',
      items: orderData.items || [],
      total: orderData.total || 0,
      status: orderData.status || 'processing',
      date: new Date()
    });

    await newOrder.save();

    // Audit log for any price overrides on this order
    if (
      Array.isArray(orderData.priceOverrides) &&
      orderData.priceOverrides.length > 0 &&
      req.user
    ) {
      const overrideLines = (orderData.priceOverrides as { itemName: string; originalPrice: number; newPrice: number }[])
        .map((po) => `${po.itemName}: $${Number(po.originalPrice).toFixed(2)} → $${Number(po.newPrice).toFixed(2)}`)
        .join('; ');
      await AuditLog.create({
        userId: req.user.userId,
        action: 'price_override',
        details: `Order ${newOrder.orderNumber} — price changes: ${overrideLines}`,
        ip: req.ip,
      });
    }

    res.status(201).json(newOrder);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Update order
ordersRouter.put('/:id', logActivity('order_update'), async (req, res) => {
  try {
    let { id } = req.params;
    if (Array.isArray(id)) id = id[0];
    const updates = req.body;

    // Ensure customerPhone is set if missing
    if ((!updates.customerPhone || updates.customerPhone === '') && updates.customer) {
      const escapedName = updates.customer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const customerDoc = await Customer.findOne({ name: { $regex: new RegExp(`^${escapedName}$`, 'i') } });
      if (customerDoc && customerDoc.phone) updates.customerPhone = customerDoc.phone;
    }

    const orConditions: Record<string, unknown>[] = [{ orderNumber: id }];
    if (typeof id === 'string' && mongoose.Types.ObjectId.isValid(id)) {
      orConditions.unshift({ _id: new mongoose.Types.ObjectId(id) });
    }

    const order = await Order.findOneAndUpdate(
      { $or: orConditions },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// Delete order (soft delete)
ordersRouter.delete('/:id', logActivity('order_delete'), async (req, res) => {
  try {
    let { id } = req.params;
    if (Array.isArray(id)) id = id[0];

    const orConditions: Record<string, unknown>[] = [{ orderNumber: id }];
    if (typeof id === 'string' && mongoose.Types.ObjectId.isValid(id)) {
      orConditions.unshift({ _id: new mongoose.Types.ObjectId(id) });
    }

    const order = await Order.findOneAndUpdate(
      { $or: orConditions },
      { $set: { deleted: true } },
      { new: true }
    );
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Mark all related payments as refunded
    const Payment = require('../models/Payment').Payment;
    await Payment.updateMany(
      { orderId: order._id },
      { $set: { paymentStatus: 'refunded' } }
    );

    res.json({ message: `Order ${id} deleted successfully` });
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({ error: 'Failed to delete order' });
  }
});
