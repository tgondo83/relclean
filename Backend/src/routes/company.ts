import { Router } from 'express';
import { Company } from '../models/Company.js';
import mongoose from 'mongoose';
import { getCompany, updateCompany } from '../services/mockDb.js';

export const companyRouter = Router();

const isMongoDB = () => mongoose.connection.readyState === 1;

// Get company details (should only be one company record)
companyRouter.get('/', async (req, res) => {
  try {
    if (!isMongoDB()) {
      return res.json(getCompany());
    }

    const company = await Company.findOne();
    
    if (!company) {
      // Return default company if none exists
      return res.json({
        name: 'RelClean Dry Cleaners',
        address: '123 Main Street, Harare',
        phone: '+263 77 000 0000',
      });
    }
    
    res.json(company);
  } catch (error) {
    console.error('Error fetching company:', error);
    res.status(500).json({ error: 'Failed to fetch company details' });
  }
});

// Update company details (or create if doesn't exist)
companyRouter.put('/', async (req, res) => {
  try {
    const companyData = req.body;

    if (!isMongoDB()) {
      const updatedCompany = updateCompany(companyData);
      return res.json(updatedCompany);
    }

    const company = await Company.findOne();
    
    if (company) {
      // Update existing company
      const updated = await Company.findByIdAndUpdate(
        company._id,
        companyData,
        { new: true }
      );
      res.json(updated);
    } else {
      // Create new company
      const newCompany = new Company(companyData);
      await newCompany.save();
      res.status(201).json(newCompany);
    }
  } catch (error) {
    console.error('Error updating company:', error);
    res.status(500).json({ error: 'Failed to update company details' });
  }
});

export default companyRouter;
