import { Router } from 'express';
import { Customer } from '../models/Customer.js';
import { Order } from '../models/Order.js';
import mongoose from 'mongoose';
import { getAllCustomers, addCustomer, getCustomerByPhone, getCustomerById as getMockCustomerById } from '../services/mockDb.js';

export const customersRouter = Router();

const isMongoDB = () => mongoose.connection.readyState === 1;

// Get all customers
customersRouter.get('/', async (req, res) => {
  try {
    if (!isMongoDB()) {
      return res.json({ customers: getAllCustomers() });
    }
    
    const customers = await Customer.find().sort({ createdAt: -1 });

    // Aggregate order counts by customer name
    const orderCounts = await Order.aggregate([
      { $group: { _id: '$customer', count: { $sum: 1 }, totalSpent: { $sum: '$total' } } }
    ]);
    const countMap: Record<string, { count: number; totalSpent: number }> = {};
    for (const entry of orderCounts) {
      if (entry._id) countMap[entry._id] = { count: entry.count, totalSpent: entry.totalSpent };
    }

    const enriched = customers.map((c) => {
      const stats = countMap[c.name] || { count: 0, totalSpent: 0 };
      return {
        ...c.toObject(),
        totalOrders: stats.count,
        totalSpent: stats.totalSpent,
      };
    });

    res.json({ customers: enriched });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// Get customer by ID
customersRouter.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!isMongoDB()) {
      const customer = getMockCustomerById(id);
      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }
      return res.json(customer);
    }
    
    const customer = await Customer.findById(id);
    
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    res.json(customer);
  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
});

// Create new customer
customersRouter.post('/', async (req, res) => {
  try {
    const { name, phone, email, address } = req.body;

    // Validate required fields
    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and phone number are required' });
    }

    if (!isMongoDB()) {
      // Check if phone exists in mock database
      const existingCustomer = getCustomerByPhone(phone);
      if (existingCustomer) {
        return res.status(409).json({ 
          error: 'A customer with this phone number already exists',
          existingCustomer 
        });
      }
      
      const newCustomer = addCustomer({
        name,
        phone,
        email,
        address,
        totalOrders: 0,
        totalSpent: 0,
      });
      return res.status(201).json(newCustomer);
    }

    // Check if phone number already exists
    const existingCustomer = await Customer.findOne({ phone });
    if (existingCustomer) {
      return res.status(409).json({ 
        error: 'A customer with this phone number already exists',
        existingCustomer 
      });
    }

    const newCustomer = new Customer({
      name,
      phone,
      email,
      address,
      totalOrders: 0,
      totalSpent: 0
    });
    
    await newCustomer.save();
    res.status(201).json(newCustomer);
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

// Update customer
customersRouter.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const customer = await Customer.findByIdAndUpdate(id, updates, { new: true });
    
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    res.json(customer);
  } catch (error) {
    console.error('Error updating customer:', error);
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

// Delete customer
customersRouter.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const customer = await Customer.findByIdAndDelete(id);
    
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    res.json({ message: `Customer ${id} deleted successfully` });
  } catch (error) {
    console.error('Error deleting customer:', error);
    res.status(500).json({ error: 'Failed to delete customer' });
  }
});
