import { Schema, model, models } from "mongoose";

export interface ICounter {
  _id: string;
  seq: number;
}

const CounterSchema = new Schema<ICounter>(
  {
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
  },
  { timestamps: true, _id: false }
);

const Counter = models.Counter || model<ICounter>("Counter", CounterSchema);

export default Counter;
