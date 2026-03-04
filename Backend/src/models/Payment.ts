import mongoose, { Schema, Document } from 'mongoose';

export interface IPayment extends Document {
  paymentNumber: string;
  orderId: mongoose.Types.ObjectId;
  customerId?: mongoose.Types.ObjectId;
  amount: number; // Amount in USD (normalized)
  originalAmount: number; // Amount in original currency
  currency: 'USD' | 'ZWL';
  exchangeRate: number; // Rate used for conversion
  paymentMethod: 'cash' | 'card' | 'mobile_money' | 'bank_transfer';
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
  transactionReference?: string;
  paymentDate: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    paymentNumber: { type: String, required: true, unique: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: false },
    amount: { type: Number, required: true, min: 0 },
    originalAmount: { type: Number, required: true, min: 0 },
    currency: {
      type: String,
      enum: ['USD', 'ZWL'],
      default: 'USD',
      required: true
    },
    exchangeRate: { type: Number, required: true, default: 1 },
    paymentMethod: { 
      type: String, 
      enum: ['cash', 'card', 'mobile_money', 'bank_transfer'],
      required: true,
      default: 'cash'
    },
    paymentStatus: { 
      type: String, 
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending',
      required: true
    },
    transactionReference: { type: String },
    paymentDate: { type: Date, default: Date.now },
    notes: { type: String }
  },
  {
    timestamps: true
  }
);

// Indexes for faster queries
PaymentSchema.index({ orderId: 1 });
PaymentSchema.index({ customerId: 1 });
PaymentSchema.index({ paymentStatus: 1 });
PaymentSchema.index({ paymentDate: -1 });

export const Payment = mongoose.model<IPayment>('Payment', PaymentSchema);
