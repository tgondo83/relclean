import express, { Request, Response } from 'express';
import Item from '../models/Item';
import mongoose from 'mongoose';

const router = express.Router();

// Get all items (with optional filters)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { category, branchId, isActive } = req.query;
    const filter: Record<string, unknown> = {};

    if (category) {
      filter.category = category;
    }

    if (branchId && mongoose.Types.ObjectId.isValid(branchId as string)) {
      filter.branchId = new mongoose.Types.ObjectId(branchId as string);
    }

    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    const items = await Item.find(filter).sort({ category: 1, name: 1 });
    res.json(items);
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// Get single item by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid item ID' });
    }

    const item = await Item.findById(id);
    
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json(item);
  } catch (error) {
    console.error('Error fetching item:', error);
    res.status(500).json({ error: 'Failed to fetch item' });
  }
});

// Create new item
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, price, category, pieces, description, icon, branchId, isActive } = req.body;

    // Validate required fields
    if (!name || price === undefined || !category) {
      return res.status(400).json({ error: 'Name, price, and category are required' });
    }

    // Validate category
    if (!['Dry Cleaning', 'Laundry', 'Pressing'].includes(category)) {
      return res.status(400).json({ error: 'Category must be "Dry Cleaning", "Laundry" or "Pressing"' });
    }

    // Validate branchId if provided
    if (branchId && !mongoose.Types.ObjectId.isValid(branchId)) {
      return res.status(400).json({ error: 'Invalid branch ID' });
    }

    const item = new Item({
      name,
      price,
      category,
      pieces: pieces || 1,
      description,
      icon: icon || '👔',
      branchId: branchId ? new mongoose.Types.ObjectId(branchId) : undefined,
      isActive: isActive !== false
    });

    await item.save();
    res.status(201).json(item);
  } catch (error) {
    console.error('Error creating item:', error);
    res.status(500).json({ error: 'Failed to create item' });
  }
});

// Update item
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { name, price, category, pieces, description, icon, branchId, isActive } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid item ID' });
    }

    // Validate category if provided
    if (category && !['Dry Cleaning', 'Laundry', 'Pressing'].includes(category)) {
      return res.status(400).json({ error: 'Category must be "Dry Cleaning", "Laundry" or "Pressing"' });
    }

    // Validate branchId if provided
    if (branchId && !mongoose.Types.ObjectId.isValid(branchId)) {
      return res.status(400).json({ error: 'Invalid branch ID' });
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (price !== undefined) updateData.price = price;
    if (category !== undefined) updateData.category = category;
    if (description !== undefined) updateData.description = description;
    if (icon !== undefined) updateData.icon = icon;
    if (branchId !== undefined) {
      updateData.branchId = branchId ? new mongoose.Types.ObjectId(branchId) : undefined;
    }
    if (isActive !== undefined) updateData.isActive = isActive;
    if (pieces !== undefined) updateData.pieces = pieces;

    const item = await Item.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json(item);
  } catch (error) {
    console.error('Error updating item:', error);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// Delete item
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid item ID' });
    }

    const item = await Item.findByIdAndDelete(id);

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json({ message: 'Item deleted successfully', item });
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// Seed default items (useful for initial setup)
router.post('/seed', async (req: Request, res: Response) => {
  try {
    const existingCount = await Item.countDocuments();
    
    if (existingCount > 0) {
      return res.status(400).json({ 
        error: 'Items already exist in database', 
        count: existingCount 
      });
    }

    const defaultItems = [
      { name: 'Suit', price: 15.00, category: 'Dry Cleaning', icon: '🧥' },
      { name: 'Dress', price: 12.00, category: 'Dry Cleaning', icon: '👗' },
      { name: 'Coat', price: 18.00, category: 'Dry Cleaning', icon: '🧥' },
      { name: 'Tie', price: 5.00, category: 'Dry Cleaning', icon: '👔' },
      { name: 'Silk Blouse', price: 10.00, category: 'Dry Cleaning', icon: '👚' },
      { name: 'Shirt', price: 3.50, category: 'Laundry', icon: '👕' },
      { name: 'Pants', price: 4.00, category: 'Laundry', icon: '👖' },
      { name: 'Sheets', price: 8.00, category: 'Laundry', icon: '🛏️' },
      { name: 'Towels', price: 3.00, category: 'Laundry', icon: '🛁' },
      { name: 'Blanket', price: 12.00, category: 'Laundry', icon: '🧺' }
    ];

    const items = await Item.insertMany(defaultItems);
    res.status(201).json({ message: 'Default items seeded', items });
  } catch (error) {
    console.error('Error seeding items:', error);
    res.status(500).json({ error: 'Failed to seed items' });
  }
});

export default router;
