import { Router } from 'express';
import { Payment } from '../models/Payment.js';
import { Order } from '../models/Order.js';
import { Customer } from '../models/Customer.js';
import mongoose from 'mongoose';

export const paymentsRouter = Router();

const isMongoDB = () => mongoose.connection.readyState === 1;

// Get all payments (with optional filters)
paymentsRouter.get('/', async (req, res) => {
  try {
    if (!isMongoDB()) {
      return res.status(503).json({ error: 'Payments require MongoDB connection' });
    }

    const { orderId, customerId, status } = req.query;
    
    const query: any = {};
    if (orderId) query.orderId = orderId;
    if (customerId) query.customerId = customerId;
    if (status) query.paymentStatus = status;
    
    const payments = await Payment.find(query)
      .populate('orderId', 'orderNumber branchPrefix status')
      .populate('customerId', 'name phone email')
      .sort({ paymentDate: -1 });
    
    res.json({ payments });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// Get payment by ID
paymentsRouter.get('/:id', async (req, res) => {
  try {
    if (!isMongoDB()) {
      return res.status(503).json({ error: 'Payments require MongoDB connection' });
    }

    const payment = await Payment.findById(req.params.id)
      .populate('orderId')
      .populate('customerId');
    
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    
    res.json(payment);
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({ error: 'Failed to fetch payment' });
  }
});

// Get payments for a specific order
paymentsRouter.get('/order/:orderId', async (req, res) => {
  try {
    if (!isMongoDB()) {
      return res.status(503).json({ error: 'Payments require MongoDB connection' });
    }

    const rawId = req.params.orderId;
    const orderQ: any[] = [{ orderNumber: rawId }];
    if (mongoose.Types.ObjectId.isValid(rawId)) orderQ.unshift({ _id: new mongoose.Types.ObjectId(rawId) });
    const resolvedId = mongoose.Types.ObjectId.isValid(rawId) ? rawId : ((await Order.findOne({ orderNumber: rawId }))?._id?.toString() || rawId);

    const payments = await Payment.find({ orderId: resolvedId })
      .populate('customerId', 'name phone email')
      .sort({ paymentDate: -1 });
    
    res.json({ payments });
  } catch (error) {
    console.error('Error fetching order payments:', error);
    res.status(500).json({ error: 'Failed to fetch order payments' });
  }
});

// Get payment summary for an order (for split payment tracking)
paymentsRouter.get('/order/:orderId/summary', async (req, res) => {
  try {
    if (!isMongoDB()) {
      return res.status(503).json({ error: 'Payments require MongoDB connection' });
    }

    const rawSummaryId = req.params.orderId;
    const summaryOrderQ: any[] = [{ orderNumber: rawSummaryId }];
    if (mongoose.Types.ObjectId.isValid(rawSummaryId)) summaryOrderQ.unshift({ _id: new mongoose.Types.ObjectId(rawSummaryId) });
    const order = await Order.findOne({ $or: summaryOrderQ });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    const summaryOrderId = order._id.toString();

    const payments = await Payment.find({ 
      orderId: summaryOrderId,
      paymentStatus: 'completed'
    }).sort({ paymentDate: -1 });

    const totalPaidUSD = payments.reduce((sum, p) => sum + p.amount, 0);
    const balanceUSD = Math.max(0, order.total - totalPaidUSD);

    res.json({
      orderId: order._id,
      orderNumber: order.orderNumber,
      orderTotal: order.total,
      totalPaid: totalPaidUSD,
      balance: balanceUSD,
      paymentStatus: order.paymentStatus || (totalPaidUSD >= order.total ? 'paid' : totalPaidUSD > 0 ? 'partial' : 'unpaid'),
      payments: payments.map(p => ({
        id: p._id,
        paymentNumber: p.paymentNumber,
        amount: p.amount,
        originalAmount: p.originalAmount,
        currency: p.currency,
        exchangeRate: p.exchangeRate,
        method: p.paymentMethod,
        date: p.paymentDate
      }))
    });
  } catch (error) {
    console.error('Error fetching payment summary:', error);
    res.status(500).json({ error: 'Failed to fetch payment summary' });
  }
});

// Create new payment
paymentsRouter.post('/', async (req, res) => {
  try {
    if (!isMongoDB()) {
      return res.status(503).json({ error: 'Payments require MongoDB connection' });
    }

    const { orderId, customerId: rawCustomerId, amount, paymentMethod, paymentStatus, transactionReference, notes } = req.body;
    
    // Validate required fields
    if (!orderId || !amount) {
      return res.status(400).json({ error: 'Order ID and amount are required' });
    }
    
    // Verify order exists - support both MongoDB _id and orderNumber
    const orderQuery: any[] = [{ orderNumber: orderId }];
    if (mongoose.Types.ObjectId.isValid(orderId)) {
      orderQuery.unshift({ _id: new mongoose.Types.ObjectId(orderId) });
    }
    const order = await Order.findOne({ $or: orderQuery });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    const resolvedOrderId = order._id.toString();

    // Resolve customerId - use provided value or try to look up by customer name on order
    let customerId = rawCustomerId;
    if (!customerId && order.customer) {
      const customerRecord = await Customer.findOne({ name: order.customer });
      if (customerRecord) customerId = customerRecord._id.toString();
    }

    // Verify customer exists if we have an id
    if (customerId) {
      const customer = await Customer.findById(customerId);
      if (!customer) customerId = undefined;
    }
    
    // Generate payment number (format: PAY-timestamp)
    const paymentNumber = `PAY-${Date.now()}`;

    const normalizedStatus = typeof paymentStatus === 'string' ? paymentStatus : undefined;
    if (normalizedStatus && !['pending', 'completed', 'failed', 'refunded'].includes(normalizedStatus)) {
      return res.status(400).json({ error: 'Invalid payment status' });
    }

    // Handle currency conversion for split payments
    const currency = req.body.currency || 'USD';
    const exchangeRate = req.body.exchangeRate || (currency === 'ZWL' ? 32.5 : 1);
    const originalAmount = req.body.originalAmount || amount;
    const amountUSD = currency === 'USD' ? amount : (originalAmount / exchangeRate);
    
    const newPayment = new Payment({
      paymentNumber,
      orderId: resolvedOrderId,
      customerId,
      amount: amountUSD,
      originalAmount,
      currency,
      exchangeRate,
      paymentMethod: paymentMethod || 'cash',
      paymentStatus: normalizedStatus || 'completed',
      transactionReference,
      notes,
      paymentDate: new Date()
    });
    
    await newPayment.save();

    // Update order payment status
    if (normalizedStatus === 'completed' || !normalizedStatus) {
      const newPaidAmount = (order.paidAmount || 0) + amountUSD;
      let paymentStatusUpdate: 'unpaid' | 'partial' | 'paid' = 'unpaid';
      
      if (newPaidAmount >= order.total) {
        paymentStatusUpdate = 'paid';
      } else if (newPaidAmount > 0) {
        paymentStatusUpdate = 'partial';
      }

      await Order.findByIdAndUpdate(resolvedOrderId, {
        paidAmount: newPaidAmount,
        paymentStatus: paymentStatusUpdate
      });
    }
    
    // Populate the references before returning
    await newPayment.populate('orderId', 'orderNumber branchPrefix status');
    await newPayment.populate('customerId', 'name phone email');
    
    res.status(201).json(newPayment);
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

// Update payment status
paymentsRouter.patch('/:id/status', async (req, res) => {
  try {
    if (!isMongoDB()) {
      return res.status(503).json({ error: 'Payments require MongoDB connection' });
    }

    const { status } = req.body;
    
    if (!['pending', 'completed', 'failed', 'refunded'].includes(status)) {
      return res.status(400).json({ error: 'Invalid payment status' });
    }
    
    const payment = await Payment.findByIdAndUpdate(
      req.params.id,
      { paymentStatus: status },
      { new: true }
    )
      .populate('orderId', 'orderNumber branchPrefix status')
      .populate('customerId', 'name phone email');
    
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    
    res.json(payment);
  } catch (error) {
    console.error('Error updating payment status:', error);
    res.status(500).json({ error: 'Failed to update payment status' });
  }
});

// Update payment
paymentsRouter.put('/:id', async (req, res) => {
  try {
    if (!isMongoDB()) {
      return res.status(503).json({ error: 'Payments require MongoDB connection' });
    }

    const { amount, paymentMethod, paymentStatus, transactionReference, notes } = req.body;
    
    const payment = await Payment.findByIdAndUpdate(
      req.params.id,
      { amount, paymentMethod, paymentStatus, transactionReference, notes },
      { new: true, runValidators: true }
    )
      .populate('orderId', 'orderNumber branchPrefix status')
      .populate('customerId', 'name phone email');
    
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    
    res.json(payment);
  } catch (error) {
    console.error('Error updating payment:', error);
    res.status(500).json({ error: 'Failed to update payment' });
  }
});

// Delete payment
paymentsRouter.delete('/:id', async (req, res) => {
  try {
    if (!isMongoDB()) {
      return res.status(503).json({ error: 'Payments require MongoDB connection' });
    }

    const payment = await Payment.findByIdAndDelete(req.params.id);
    
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    
    res.json({ message: 'Payment deleted successfully' });
  } catch (error) {
    console.error('Error deleting payment:', error);
    res.status(500).json({ error: 'Failed to delete payment' });
  }
});
