import mongoose from 'mongoose';
import { config } from 'dotenv';

config();

async function listCollections() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Connected to MongoDB\n');
    
    const collections = await (mongoose.connection.db as any).listCollections().toArray();
    
    console.log('📊 Collections (tables) in database:');
    console.log('=====================================');
    for (const collection of collections) {
      const count = await (mongoose.connection.db as any).collection(collection.name).countDocuments();
      console.log(`  • ${collection.name} (${count} documents)`);
    }
    console.log('');
    
    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

listCollections();
