import mongoose, { Schema, Document } from 'mongoose';

export interface IExchangeRate extends Document {
  rate: number;
  effectiveDate: Date;
  source?: string;
  isActive: boolean;
  notes?: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ExchangeRateSchema = new Schema<IExchangeRate>(
  {
    rate: { 
      type: Number, 
      required: true,
      min: 0
    },
    effectiveDate: { 
      type: Date, 
      required: true,
      default: Date.now
    },
    source: { 
      type: String,
      trim: true
    },
    isActive: { 
      type: Boolean, 
      default: true 
    },
    notes: { 
      type: String,
      trim: true
    },
    createdBy: { 
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

// Index for efficient queries
ExchangeRateSchema.index({ isActive: 1, effectiveDate: -1 });

// Method to check if rate is currently valid
ExchangeRateSchema.methods.isValid = function() {
  const now = new Date();
  if (!this.isActive) return false;
  if (this.effectiveDate > now) return false;
  if (this.expiryDate && this.expiryDate < now) return false;
  return true;
};

export const ExchangeRate = mongoose.model<IExchangeRate>('ExchangeRate', ExchangeRateSchema);
