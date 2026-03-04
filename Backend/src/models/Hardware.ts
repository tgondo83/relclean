import mongoose, { Schema, Document } from 'mongoose';

export type HardwareType = 'Printer' | 'Cash Drawer' | 'Barcode Scanner' | 'Customer Display' | 'Other';
export type ConnectionType = 'USB' | 'Network' | 'Bluetooth' | 'Serial';
export type HardwareStatus = 'connected' | 'disconnected' | 'error';

export interface IHardware extends Document {
  name: string;
  type: HardwareType;
  connection: ConnectionType;
  address?: string;          // IP address, COM port, USB path
  port?: number;             // TCP port for network printers
  branch?: string;
  branchId?: mongoose.Types.ObjectId;
  status: HardwareStatus;
  isActive: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const HardwareSchema = new Schema<IHardware>(
  {
    name:       { type: String, required: true, trim: true },
    type:       { type: String, required: true, enum: ['Printer', 'Cash Drawer', 'Barcode Scanner', 'Customer Display', 'Other'] },
    connection: { type: String, required: true, enum: ['USB', 'Network', 'Bluetooth', 'Serial'] },
    address:    { type: String, trim: true },
    port:       { type: Number, min: 1, max: 65535 },
    branch:     { type: String, trim: true },
    branchId:   { type: Schema.Types.ObjectId, ref: 'Branch' },
    status:     { type: String, enum: ['connected', 'disconnected', 'error'], default: 'disconnected' },
    isActive:   { type: Boolean, default: true },
    notes:      { type: String, trim: true },
  },
  { timestamps: true }
);

HardwareSchema.index({ type: 1, isActive: 1 });
HardwareSchema.index({ branchId: 1 });

export const Hardware = mongoose.model<IHardware>('Hardware', HardwareSchema);
