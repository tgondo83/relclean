import mongoose, { Schema, Document } from 'mongoose';

export interface ICustomer extends Document {
  name: string;
  email?: string;
  phone: string;
  address?: string;
  totalOrders: number;
  totalSpent: number;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String, required: true, unique: true },
    address: { type: String },
    totalOrders: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 }
  },
  {
    timestamps: true
  }
);

CustomerSchema.index({ email: 1 });

export const Customer = mongoose.model<ICustomer>('Customer', CustomerSchema);
