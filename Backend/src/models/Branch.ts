import mongoose, { Schema, Document } from 'mongoose';

export interface IBranch extends Document {
  name: string;
  prefix: string;
  address: string;
  phone: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BranchSchema = new Schema<IBranch>(
  {
    name: { type: String, required: true },
    prefix: { type: String, required: true, unique: true, uppercase: true },
    address: { type: String, required: true },
    phone: { type: String, required: true },
    active: { type: Boolean, default: true }
  },
  {
    timestamps: true
  }
);

export const Branch = mongoose.model<IBranch>('Branch', BranchSchema);
