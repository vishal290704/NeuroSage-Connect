import mongoose from "mongoose";

const schema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  count: { type: Number, required: true },
  resetAt: { type: Date, required: true },
}, { collection: "rate_limit_counters", timestamps: false });

schema.index({ resetAt: 1 }, { expireAfterSeconds: 86400 });
export default mongoose.models.RateLimitCounter || mongoose.model("RateLimitCounter", schema);