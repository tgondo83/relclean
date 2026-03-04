import mongoose, { Schema, Document } from 'mongoose';

export interface ICounter extends Document {
  branchPrefix: string;
  sequenceValue: number;
}

const CounterSchema = new Schema<ICounter>({
  branchPrefix: { type: String, required: true, unique: true, uppercase: true },
  sequenceValue: { type: Number, default: 0 }
});

export const Counter = mongoose.model<ICounter>('Counter', CounterSchema);

// Helper function to get next sequence number for a branch
export const getNextSequence = async (branchPrefix: string): Promise<number> => {
  const counter = await Counter.findOneAndUpdate(
    { branchPrefix },
    { $inc: { sequenceValue: 1 } },
    { new: true, upsert: true }
  );
  
  return counter.sequenceValue;
};
