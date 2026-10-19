import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    emailNormalized: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ["ADMIN"], default: "ADMIN", required: true },
    active: { type: Boolean, default: true },
    lastLoginAt: Date,
    failedLoginCount: { type: Number, default: 0 },
    lockedUntil: Date,
  },
  { timestamps: true, collection: "admin_users" },
);

export default mongoose.models.AdminUser || mongoose.model("AdminUser", schema);
