import { Router } from 'express';
import { Order } from '../models/Order.js';
import { getNextSequence } from '../models/Counter.js';
import mongoose from 'mongoose';
import { getAllOrders, addOrder, getOrderById as getMockOrderById, getBranchById as getMockBranchById } from '../services/mockDb.js';
import { Branch } from '../models/Branch.js';

export const ordersRouter = Router();

const isMongoDB = () => mongoose.connection.readyState === 1;

// Get all orders (optionally filter by branch)
ordersRouter.get('/', async (req, res) => {
  try {
    const { branchId } = req.query;
    
    if (!isMongoDB()) {
      const allOrders = getAllOrders();
      const filteredOrders = branchId ? allOrders.filter((o: any) => o.branchId === branchId) : allOrders;
      return res.json({ orders: filteredOrders });
    }
    
    const query = branchId ? { branchId } : {};
    const orders = await Order.find(query).sort({ date: -1 });
    
    res.json({ orders });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get order by ID or order number
ordersRouter.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
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
    });
    
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
ordersRouter.post('/', async (req, res) => {
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
      items: orderData.items || [],
      total: orderData.total || 0,
      status: orderData.status || 'processing',
      date: new Date()
    });
    
    await newOrder.save();
    res.status(201).json(newOrder);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Update order
ordersRouter.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const orConditions: Record<string, unknown>[] = [{ orderNumber: id }];
    if (mongoose.Types.ObjectId.isValid(id)) {
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

// Delete order
ordersRouter.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const orConditions: Record<string, unknown>[] = [{ orderNumber: id }];
    if (mongoose.Types.ObjectId.isValid(id)) {
      orConditions.unshift({ _id: new mongoose.Types.ObjectId(id) });
    }

    const order = await Order.findOneAndDelete({ $or: orConditions });
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json({ message: `Order ${id} deleted successfully` });
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({ error: 'Failed to delete order' });
  }
});
