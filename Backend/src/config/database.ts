import mongoose from 'mongoose';

export const connectDB = async () => {
  try {
    const MONGODB_URI = process.env.MONGODB_URI;
    
    if (!MONGODB_URI) {
      console.warn('⚠️  MONGODB_URI is not defined. Running server without database.');
      return false;
    }

    await mongoose.connect(MONGODB_URI);
    
    console.log('✅ MongoDB connected successfully');
    console.log(`📊 Database: ${mongoose.connection.name}`);
    return true;
  } catch (error) {
    console.warn('⚠️  MongoDB connection failed:', error instanceof Error ? error.message : error);
    console.warn('⚠️  Server will run in development mode without persistent storage');
    return false;
  }
};

mongoose.connection.on('disconnected', () => {
  console.log('⚠️  MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB error:', err);
});
