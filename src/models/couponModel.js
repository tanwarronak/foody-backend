import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  type: { type: String, enum: ['fixed', 'percent'], required: true },
  value: { type: Number, required: true, min: 0.01 },
  expires_at: { type: Date, required: true },
  usage_limit: { type: Number, required: true, min: 1 },
  usage_count: { type: Number, default: 0, min: 0 },
  active: { type: Boolean, default: true },
}, { timestamps: true });

export const Coupon = mongoose.model('Coupon', couponSchema);
