import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  role: 'admin' | 'manager' | 'user';
  status: 'active' | 'inactive';
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  permissions: {
    pages: string[];
    actions: string[];
  };
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true, select: false },
    role: { 
      type: String, 
      enum: ['admin', 'manager', 'user'],
      default: 'user'
    },
    status: { 
      type: String, 
      enum: ['active', 'inactive'],
      default: 'active'
    },
    lastLogin: { type: Date },
    permissions: {
      pages: {
        type: [String],
        default: ['dashboard', 'orders', 'new-order', 'customers'],
      },
      actions: {
        type: [String],
        default: ['create-order', 'process-payment', 'add-customer'],
      },
    },
  },
  {
    timestamps: true
  }
);

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model<IUser>('User', UserSchema);
