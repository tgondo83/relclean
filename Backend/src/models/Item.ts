import mongoose, { Schema, Document } from 'mongoose';

export interface IItem extends Document {
  name: string;
  price: number;
  category: 'Dry Cleaning' | 'Laundry' | 'Pressing';
  pieces: number; // Default number of pieces for this item type
  description?: string;
  icon?: string;
  branchId?: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ItemSchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  category: {
    type: String,
    required: true,
    enum: ['Dry Cleaning', 'Laundry', 'Pressing']
  },
  pieces: {
    type: Number,
    default: 1,
    min: 1
  },
  description: {
    type: String,
    trim: true
  },
  icon: {
    type: String,
    default: '👔'
  },
  branchId: {
    type: Schema.Types.ObjectId,
    ref: 'Branch'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
ItemSchema.index({ category: 1, isActive: 1 });
ItemSchema.index({ branchId: 1 });

export default mongoose.model<IItem>('Item', ItemSchema);
