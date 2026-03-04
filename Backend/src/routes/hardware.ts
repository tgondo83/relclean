import { Router } from 'express';
import mongoose from 'mongoose';
import { Hardware } from '../models/Hardware.js';

export const hardwareRouter = Router();

const VALID_TYPES = ['Printer', 'Cash Drawer', 'Barcode Scanner', 'Customer Display', 'Other'];
const VALID_CONNECTIONS = ['USB', 'Network', 'Bluetooth', 'Serial'];
const VALID_STATUSES = ['connected', 'disconnected', 'error'];

// Get all hardware devices
hardwareRouter.get('/', async (req, res) => {
  try {
    const { type, branchId, isActive } = req.query;
    const filter: Record<string, unknown> = {};

    if (type) filter.type = type;
    if (branchId && mongoose.Types.ObjectId.isValid(branchId as string)) {
      filter.branchId = new mongoose.Types.ObjectId(branchId as string);
    }
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const hardware = await Hardware.find(filter).sort({ type: 1, name: 1 });
    res.json({ hardware });
  } catch (error) {
    console.error('Error fetching hardware:', error);
    res.status(500).json({ error: 'Failed to fetch hardware' });
  }
});

// Get hardware by ID
hardwareRouter.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid hardware ID' });
    }
    const hardware = await Hardware.findById(id);
    if (!hardware) return res.status(404).json({ error: 'Hardware not found' });
    res.json(hardware);
  } catch (error) {
    console.error('Error fetching hardware:', error);
    res.status(500).json({ error: 'Failed to fetch hardware' });
  }
});

// Create new hardware device
hardwareRouter.post('/', async (req, res) => {
  try {
    const { name, type, connection, address, port, branch, branchId, status, isActive, notes } = req.body;

    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
    if (!type || !VALID_TYPES.includes(type)) {
      return res.status(400).json({ error: `Type must be one of: ${VALID_TYPES.join(', ')}` });
    }
    if (!connection || !VALID_CONNECTIONS.includes(connection)) {
      return res.status(400).json({ error: `Connection must be one of: ${VALID_CONNECTIONS.join(', ')}` });
    }
    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${VALID_STATUSES.join(', ')}` });
    }
    if (branchId && !mongoose.Types.ObjectId.isValid(branchId)) {
      return res.status(400).json({ error: 'Invalid branch ID' });
    }

    const hardware = new Hardware({
      name: name.trim(),
      type,
      connection,
      address: address?.trim(),
      port: port ? Number(port) : undefined,
      branch: branch?.trim(),
      branchId: branchId ? new mongoose.Types.ObjectId(branchId) : undefined,
      status: status || 'disconnected',
      isActive: isActive !== false,
      notes: notes?.trim(),
    });

    await hardware.save();
    res.status(201).json(hardware);
  } catch (error) {
    console.error('Error creating hardware:', error);
    res.status(500).json({ error: 'Failed to create hardware' });
  }
});

// Update hardware device
hardwareRouter.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid hardware ID' });
    }

    const { name, type, connection, address, port, branch, branchId, status, isActive, notes } = req.body;

    if (type && !VALID_TYPES.includes(type)) {
      return res.status(400).json({ error: `Type must be one of: ${VALID_TYPES.join(', ')}` });
    }
    if (connection && !VALID_CONNECTIONS.includes(connection)) {
      return res.status(400).json({ error: `Connection must be one of: ${VALID_CONNECTIONS.join(', ')}` });
    }
    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${VALID_STATUSES.join(', ')}` });
    }
    if (branchId && !mongoose.Types.ObjectId.isValid(branchId)) {
      return res.status(400).json({ error: 'Invalid branch ID' });
    }

    const updates: Record<string, unknown> = {};
    if (name !== undefined)       updates.name = name.trim();
    if (type !== undefined)       updates.type = type;
    if (connection !== undefined) updates.connection = connection;
    if (address !== undefined)    updates.address = address?.trim();
    if (port !== undefined)       updates.port = port ? Number(port) : undefined;
    if (branch !== undefined)     updates.branch = branch?.trim();
    if (branchId !== undefined)   updates.branchId = branchId ? new mongoose.Types.ObjectId(branchId) : undefined;
    if (status !== undefined)     updates.status = status;
    if (isActive !== undefined)   updates.isActive = isActive;
    if (notes !== undefined)      updates.notes = notes?.trim();

    const hardware = await Hardware.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
    if (!hardware) return res.status(404).json({ error: 'Hardware not found' });
    res.json(hardware);
  } catch (error) {
    console.error('Error updating hardware:', error);
    res.status(500).json({ error: 'Failed to update hardware' });
  }
});

// Delete hardware device
hardwareRouter.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid hardware ID' });
    }
    const hardware = await Hardware.findByIdAndDelete(id);
    if (!hardware) return res.status(404).json({ error: 'Hardware not found' });
    res.json({ message: `Hardware "${hardware.name}" deleted successfully` });
  } catch (error) {
    console.error('Error deleting hardware:', error);
    res.status(500).json({ error: 'Failed to delete hardware' });
  }
});

