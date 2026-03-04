import mongoose, { Schema, Document } from 'mongoose';

export interface IOrderItem {
  name: string;
  price: number;
  qty: number;
  pieces: number;
}

export interface IOrder extends Document {
  orderNumber: string;
  branchId: mongoose.Types.ObjectId;
  branchPrefix: string;
  customer: string;
  items: IOrderItem[];
  totalPieces: number;
  total: number;
  paidAmount: number; // Total amount paid in USD
  paymentStatus: 'unpaid' | 'partial' | 'paid';
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  qty: { type: Number, required: true, default: 1 },
  pieces: { type: Number, required: true, default: 1 }
}, { _id: false });

const OrderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, required: true, unique: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    branchPrefix: { type: String, required: true, uppercase: true },
    customer: { type: String, required: true },
    items: [OrderItemSchema],
    totalPieces: { type: Number, default: 0 },
    total: { type: Number, required: true, default: 0 },
    paidAmount: { type: Number, default: 0 },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'partial', 'paid'],
      default: 'unpaid'
    },
    status: { 
      type: String, 
      enum: ['pending', 'processing', 'completed', 'cancelled'],
      default: 'processing'
    },
    date: { type: Date, default: Date.now }
  },
  {
    timestamps: true
  }
);

// Index for faster queries
OrderSchema.index({ branchId: 1, orderNumber: 1 });
OrderSchema.index({ customer: 1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ paymentStatus: 1 });

export const Order = mongoose.model<IOrder>('Order', OrderSchema);
