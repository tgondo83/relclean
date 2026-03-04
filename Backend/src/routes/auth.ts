import { Router } from 'express';
import { User } from '../models/User.js';
import { generateToken, authMiddleware, AuthPayload } from '../middleware/auth.js';
import mongoose from 'mongoose';

export const authRouter = Router();

const isMongoDB = () => mongoose.connection.readyState === 1;

// POST /auth/login
authRouter.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    if (!isMongoDB()) {
      // In mock mode, accept any login with password "admin"
      if (password === 'admin') {
        const token = generateToken({ userId: '1', username, role: 'admin' });
        return res.json({
          token,
          user: { id: '1', username, email: `${username}@reliable.com`, role: 'admin', status: 'active' }
        });
      }
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Find user with password field (select: false by default)
    const user = await User.findOne({
      $or: [{ username }, { email: username }],
      status: 'active'
    }).select('+password');

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Legacy user without password — they need to be re-registered
    if (!user.password) {
      return res.status(401).json({ error: 'This account needs to be set up. Please register with the same username.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login (use updateOne to avoid triggering pre-save password hash)
    await User.updateOne({ _id: user._id }, { $set: { lastLogin: new Date() } });

    const payload: AuthPayload = {
      userId: user._id.toString(),
      username: user.username,
      role: user.role
    };

    const token = generateToken(payload);

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
        permissions: user.permissions
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /auth/register (admin only, or first user)
authRouter.post('/register', async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    if (password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters' });
    }

    if (!isMongoDB()) {
      return res.status(400).json({ error: 'Registration requires database connection' });
    }

    // Check if any users with passwords exist (first usable user becomes admin)
    // Legacy users created before auth was added won't have passwords,
    // so we only count users that can actually authenticate.
    const usableUserCount = await User.countDocuments({ password: { $exists: true, $ne: null } });
    const isFirstUser = usableUserCount === 0;

    // If not the first user, require auth
    if (!isFirstUser) {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required to register new users' });
      }
      try {
        const { verifyToken } = await import('../middleware/auth.js');
        const decoded = verifyToken(authHeader.split(' ')[1]);
        if (decoded.role !== 'admin' && decoded.role !== 'manager') {
          return res.status(403).json({ error: 'Only admins and managers can register new users' });
        }
      } catch {
        return res.status(401).json({ error: 'Invalid token' });
      }
    }

    // Check for existing user
    const existing = await User.findOne({ $or: [{ username }, { email }] }).select('+password');
    if (existing) {
      // If legacy user without password, upgrade them with a password
      if (!existing.password) {
        existing.password = password;
        existing.role = isFirstUser ? 'admin' : (existing.role || role || 'user');
        existing.status = 'active';
        await existing.save();

        const payload: AuthPayload = {
          userId: existing._id.toString(),
          username: existing.username,
          role: existing.role
        };

        const token = generateToken(payload);

        return res.status(201).json({
          token,
          user: {
            id: existing._id,
            username: existing.username,
            email: existing.email,
            role: existing.role,
            status: existing.status,
            permissions: existing.permissions
          }
        });
      }
      return res.status(409).json({ error: 'Username or email already exists' });
    }

    const newUser = new User({
      username,
      email,
      password,
      role: isFirstUser ? 'admin' : (role || 'user'),
      status: 'active'
    });

    await newUser.save();

    const payload: AuthPayload = {
      userId: newUser._id.toString(),
      username: newUser.username,
      role: newUser.role
    };

    const token = generateToken(payload);

    res.status(201).json({
      token,
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        status: newUser.status,
        permissions: newUser.permissions
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// GET /auth/me - get current user from token
authRouter.get('/me', authMiddleware, async (req, res) => {
  try {
    if (!isMongoDB()) {
      return res.json({
        user: {
          id: req.user!.userId,
          username: req.user!.username,
          role: req.user!.role,
          email: `${req.user!.username}@reliable.com`,
          status: 'active'
        }
      });
    }

    const user = await User.findById(req.user!.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
        permissions: user.permissions
      }
    });
  } catch (error) {
    console.error('Error fetching current user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// POST /auth/change-password
authRouter.post('/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 4) {
      return res.status(400).json({ error: 'New password must be at least 4 characters' });
    }

    if (!isMongoDB()) {
      return res.json({ message: 'Password changed successfully' });
    }

    const user = await User.findById(req.user!.userId).select('+password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});
