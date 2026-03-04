import mongoose, { Schema, Document } from 'mongoose';

export interface ICompany extends Document {
  name: string;
  address: string;
  phone: string;
  email?: string;
  website?: string;
  taxId?: string;
  logo?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CompanySchema = new Schema<ICompany>(
  {
    name: { type: String, required: true },
    address: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String },
    website: { type: String },
    taxId: { type: String },
    logo: { type: String }
  },
  {
    timestamps: true
  }
);

export const Company = mongoose.model<ICompany>('Company', CompanySchema);
