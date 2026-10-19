import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    registrationId: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: ["APPROVAL", "GUARDIAN_CONSENT"],
      required: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "SENT", "FAILED"],
      default: "PENDING",
    },
    attempts: { type: Number, default: 0 },
    lastAttemptAt: Date,
    sentAt: Date,
    safeError: String,
  },
  { timestamps: true, collection: "notification_logs" },
);

schema.index({ registrationId: 1, type: 1 }, { unique: true });
export default mongoose.models.NotificationLog ||
  mongoose.model("NotificationLog", schema);
