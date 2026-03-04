import dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

import mongoose from 'mongoose';
import { Branch } from './models/Branch.js';
import { connectDB } from './config/database.js';

const seedBranches = async () => {
  try {
    console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'Found' : 'Not found');
    await connectDB();
    
    // Check if branches already exist
    const existingBranches = await Branch.countDocuments();
    if (existingBranches > 0) {
      console.log('📊 Branches already exist. Skipping seed...');
      return;
    }
    
    // Seed initial branches
    const branches = [
      {
        name: 'Main Branch',
        prefix: 'MB',
        address: '123 Main Street, City',
        phone: '555-0100',
        active: true
      },
      {
        name: 'Eastside Branch',
        prefix: 'EB',
        address: '456 East Avenue, City',
        phone: '555-0200',
        active: true
      },
      {
        name: 'Westside Branch',
        prefix: 'WB',
        address: '789 West Boulevard, City',
        phone: '555-0300',
        active: true
      },
      {
        name: 'Downtown Branch',
        prefix: 'DB',
        address: '321 Downtown Plaza, City',
        phone: '555-0400',
        active: true
      }
    ];
    
    await Branch.insertMany(branches);
    console.log('✅ Successfully seeded branches!');
    
    // List all branches
    const allBranches = await Branch.find();
    console.log('\n📋 Created branches:');
    allBranches.forEach(branch => {
      console.log(`  - ${branch.name} (${branch.prefix})`);
    });
    
  } catch (error) {
    console.error('❌ Error seeding data:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
    process.exit(0);
  }
};

seedBranches();
