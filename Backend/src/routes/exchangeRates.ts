import { Router } from 'express';
import { ExchangeRate } from '../models/ExchangeRate.js';
import mongoose from 'mongoose';
import { 
  getAllExchangeRates, 
  getCurrentExchangeRate, 
  getExchangeRateById, 
  addExchangeRate,
  updateExchangeRate 
} from '../services/mockDb.js';

export const exchangeRatesRouter = Router();

const isMongoDB = () => mongoose.connection.readyState === 1;

// Get all exchange rates (USD to ZiG)
exchangeRatesRouter.get('/', async (req, res) => {
  try {
    const { active } = req.query;

    if (!isMongoDB()) {
      let rates = getAllExchangeRates();
      if (active !== undefined) {
        rates = rates.filter((r: any) => r.isActive === (active === 'true'));
      }
      return res.json({ exchangeRates: rates });
    }
    
    const query: any = {};
    if (active !== undefined) query.isActive = active === 'true';
    
    const rates = await ExchangeRate.find(query).sort({ effectiveDate: -1 });
    
    res.json({ exchangeRates: rates });
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    res.status(500).json({ error: 'Failed to fetch exchange rates' });
  }
});

// Get current/latest active USD to ZiG rate
exchangeRatesRouter.get('/current', async (req, res) => {
  try {
    if (!isMongoDB()) {
      const rate = getCurrentExchangeRate();
      if (!rate) {
        return res.status(404).json({ 
          error: 'No active exchange rate found' 
        });
      }
      return res.json(rate);
    }

    const now = new Date();
    
    const rate = await ExchangeRate.findOne({
      isActive: true,
      effectiveDate: { $lte: now }
    }).sort({ effectiveDate: -1 });
    
    if (!rate) {
      return res.status(404).json({ 
        error: 'No active exchange rate found for USD to ZiG' 
      });
    }
    
    res.json(rate);
  } catch (error) {
    console.error('Error fetching current rate:', error);
    res.status(500).json({ error: 'Failed to fetch current rate' });
  }
});

// Get exchange rate history
exchangeRatesRouter.get('/history', async (req, res) => {
  try {
    const { limit = '30' } = req.query;
    
    const rates = await ExchangeRate.find()
      .sort({ effectiveDate: -1 })
      .limit(parseInt(limit as string));
    
    res.json({ exchangeRates: rates });
  } catch (error) {
    console.error('Error fetching rate history:', error);
    res.status(500).json({ error: 'Failed to fetch rate history' });
  }
});

// Get exchange rate by ID
exchangeRatesRouter.get('/:id', async (req, res) => {
  try {
    const rate = await ExchangeRate.findById(req.params.id);
    
    if (!rate) {
      return res.status(404).json({ error: 'Exchange rate not found' });
    }
    
    res.json(rate);
  } catch (error) {
    console.error('Error fetching exchange rate:', error);
    res.status(500).json({ error: 'Failed to fetch exchange rate' });
  }
});

// Create new USD to ZiG exchange rate
exchangeRatesRouter.post('/', async (req, res) => {
  try {
    const {
      rate,
      effectiveDate,
      source,
      notes,
      createdBy
    } = req.body;
    
    // Validate required fields
    if (!rate) {
      return res.status(400).json({ 
        error: 'Exchange rate is required' 
      });
    }

    if (!isMongoDB()) {
      const newRate = addExchangeRate({
        rate,
        effectiveDate: effectiveDate ? new Date(effectiveDate) : new Date(),
        source: source || 'Manual Entry',
        notes,
        createdBy,
        isActive: true
      });
      return res.status(201).json(newRate);
    }
    
    const newRate = new ExchangeRate({
      rate,
      effectiveDate: effectiveDate || new Date(),
      source,
      notes,
      createdBy,
      isActive: true
    });
    
    await newRate.save();
    res.status(201).json(newRate);
  } catch (error) {
    console.error('Error creating exchange rate:', error);
    res.status(500).json({ error: 'Failed to create exchange rate' });
  }
});

// Update exchange rate
exchangeRatesRouter.put('/:id', async (req, res) => {
  try {
    const {
      rate,
      effectiveDate,
      source,
      isActive,
      notes
    } = req.body;
    
    const updatedRate = await ExchangeRate.findByIdAndUpdate(
      req.params.id,
      { rate, effectiveDate, source, isActive, notes },
      { new: true, runValidators: true }
    );
    
    if (!updatedRate) {
      return res.status(404).json({ error: 'Exchange rate not found' });
    }
    
    res.json(updatedRate);
  } catch (error) {
    console.error('Error updating exchange rate:', error);
    res.status(500).json({ error: 'Failed to update exchange rate' });
  }
});

// Deactivate exchange rate
exchangeRatesRouter.patch('/:id/deactivate', async (req, res) => {
  try {
    const rate = await ExchangeRate.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    
    if (!rate) {
      return res.status(404).json({ error: 'Exchange rate not found' });
    }
    
    res.json(rate);
  } catch (error) {
    console.error('Error deactivating exchange rate:', error);
    res.status(500).json({ error: 'Failed to deactivate exchange rate' });
  }
});

// Delete exchange rate
exchangeRatesRouter.delete('/:id', async (req, res) => {
  try {
    const rate = await ExchangeRate.findByIdAndDelete(req.params.id);
    
    if (!rate) {
      return res.status(404).json({ error: 'Exchange rate not found' });
    }
    
    res.json({ message: 'Exchange rate deleted successfully' });
  } catch (error) {
    console.error('Error deleting exchange rate:', error);
    res.status(500).json({ error: 'Failed to delete exchange rate' });
  }
});

// Convert USD amount to ZiG using latest rate
exchangeRatesRouter.post('/convert', async (req, res) => {
  try {
    const { amount } = req.body;
    
    if (!amount) {
      return res.status(400).json({ 
        error: 'Amount is required' 
      });
    }
    
    const now = new Date();
    const rate = await ExchangeRate.findOne({
      isActive: true,
      effectiveDate: { $lte: now }
    }).sort({ effectiveDate: -1 });
    
    if (!rate) {
      return res.status(404).json({ 
        error: 'No active exchange rate found for USD to ZiG' 
      });
    }
    
    const convertedAmount = amount * rate.rate;
    
    res.json({
      usdAmount: amount,
      zigAmount: parseFloat(convertedAmount.toFixed(2)),
      rate: rate.rate,
      effectiveDate: rate.effectiveDate,
      rateId: rate._id
    });
  } catch (error) {
    console.error('Error converting amount:', error);
    res.status(500).json({ error: 'Failed to convert amount' });
  }
});
