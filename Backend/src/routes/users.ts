import { Router } from 'express';
import { User } from '../models/User.js';
import mongoose from 'mongoose';
import { requireRole } from '../middleware/auth.js';
import { logActivity } from '../middleware/auditLog';
import {
  getAllUsers,
  getUserById as getMockUserById,
  addUser,
  updateUser as updateMockUser,
  deleteUser as deleteMockUser,
} from '../services/mockDb.js';

export const usersRouter = Router();

const isMongoDB = () => mongoose.connection.readyState === 1;

// Get all users
usersRouter.get('/', async (req, res) => {
  try {
    if (!isMongoDB()) {
      return res.json({ users: getAllUsers() });
    }

    const users = await User.find().sort({ createdAt: -1 });
    res.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get user by ID
usersRouter.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!isMongoDB()) {
      const user = getMockUserById(id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      return res.json(user);
    }

    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Create new user
usersRouter.post('/', logActivity('user_create'), async (req, res) => {
  try {
    const userData = req.body;

    if (!isMongoDB()) {
      const newUser = addUser({
        username: userData.username,
        email: userData.email,
        role: userData.role || 'user',
        status: 'active',
        phone: userData.phone,
        branch: userData.branch,
      });
      return res.status(201).json(newUser);
    }

    const newUser = new User({
      ...userData,
      password: userData.password || 'changeme',
      status: 'active'
    });
    
    await newUser.save();
    res.status(201).json(newUser);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user (password changes must go through /auth/change-password or /:id/reset-password)
usersRouter.put('/:id', logActivity('user_update'), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Never allow password to be changed via this route
    delete updates.password;

    if (!isMongoDB()) {
      const user = updateMockUser(id, updates);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      return res.json(user);
    }
    
    const user = await User.findByIdAndUpdate(id, { $set: updates }, { new: true });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Reset a user's password (admin/manager only)
usersRouter.post('/:id/reset-password', requireRole('admin', 'manager'), logActivity('user_reset_password'), async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 4) {
      return res.status(400).json({ error: 'New password must be at least 4 characters' });
    }

    if (!isMongoDB()) {
      return res.json({ message: 'Password reset successfully' });
    }

    const user = await User.findById(id).select('+password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.password = newPassword;
    await user.save(); // pre-save hook will hash the new password

    res.json({ message: `Password reset successfully for ${user.username}` });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Delete user
usersRouter.delete('/:id', logActivity('user_delete'), async (req, res) => {
  try {
    const { id } = req.params;

    if (!isMongoDB()) {
      const user = deleteMockUser(id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      return res.json({ message: `User ${id} deleted successfully` });
    }
    
    const user = await User.findByIdAndDelete(id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ message: `User ${id} deleted successfully` });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});
