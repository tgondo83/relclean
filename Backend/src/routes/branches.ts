import { Router } from 'express';
import { Branch } from '../models/Branch.js';
import mongoose from 'mongoose';
import { getAllBranches, addBranch, getBranchById as getMockBranchById } from '../services/mockDb.js';

export const branchesRouter = Router();

const isMongoDB = () => mongoose.connection.readyState === 1;

// Get all branches
branchesRouter.get('/', async (req, res) => {
  try {
    if (!isMongoDB()) {
      return res.json({ branches: getAllBranches() });
    }

    const branches = await Branch.find();
    res.json({ branches });
  } catch (error) {
    console.error('Error fetching branches:', error);
    res.status(500).json({ error: 'Failed to fetch branches' });
  }
});

// Get branch by ID
branchesRouter.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!isMongoDB()) {
      const branch = getMockBranchById(id);
      if (!branch) {
        return res.status(404).json({ error: 'Branch not found' });
      }
      return res.json(branch);
    }

    const branch = await Branch.findById(id);
    
    if (!branch) {
      return res.status(404).json({ error: 'Branch not found' });
    }
    
    res.json(branch);
  } catch (error) {
    console.error('Error fetching branch:', error);
    res.status(500).json({ error: 'Failed to fetch branch' });
  }
});

// Create new branch
branchesRouter.post('/', async (req, res) => {
  try {
    const branchData = req.body;

    if (!isMongoDB()) {
      const newBranch = addBranch({
        name: branchData.name,
        prefix: branchData.prefix || branchData.name.substring(0, 2).toUpperCase(),
        address: branchData.address || '',
        phone: branchData.phone || '',
        active: true,
      });
      return res.status(201).json(newBranch);
    }

    const newBranch = new Branch({
      ...branchData,
      active: true
    });
    
    await newBranch.save();
    res.status(201).json(newBranch);
  } catch (error) {
    console.error('Error creating branch:', error);
    res.status(500).json({ error: 'Failed to create branch' });
  }
});

// Update branch
branchesRouter.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!isMongoDB()) {
      const branch = getMockBranchById(id);
      if (!branch) {
        return res.status(404).json({ error: 'Branch not found' });
      }
      const updatedBranch = { ...branch, ...updates };
      const branchIndex = getAllBranches().findIndex((b: any) => b._id === id);
      if (branchIndex !== -1) {
        (getAllBranches() as any)[branchIndex] = updatedBranch;
      }
      return res.json(updatedBranch);
    }
    
    const branch = await Branch.findByIdAndUpdate(id, updates, { new: true });
    
    if (!branch) {
      return res.status(404).json({ error: 'Branch not found' });
    }
    
    res.json(branch);
  } catch (error) {
    console.error('Error updating branch:', error);
    res.status(500).json({ error: 'Failed to update branch' });
  }
});

// Delete branch (deactivate)
branchesRouter.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!isMongoDB()) {
      const branch = getMockBranchById(id);
      if (!branch) {
        return res.status(404).json({ error: 'Branch not found' });
      }
      const branchIndex = getAllBranches().findIndex((b: any) => b._id === id);
      if (branchIndex !== -1) {
        (getAllBranches() as any).splice(branchIndex, 1);
      }
      return res.json({ message: `Branch ${id} deleted successfully` });
    }
    
    const branch = await Branch.findByIdAndUpdate(
      id,
      { active: false },
      { new: true }
    );
    
    if (!branch) {
      return res.status(404).json({ error: 'Branch not found' });
    }
    
    res.json({ message: `Branch ${id} deactivated successfully` });
  } catch (error) {
    console.error('Error deactivating branch:', error);
    res.status(500).json({ error: 'Failed to deactivate branch' });
  }
});
