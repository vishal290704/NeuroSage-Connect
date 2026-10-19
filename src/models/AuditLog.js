import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AdminUser",
      required: true,
    },
    action: { type: String, required: true, maxlength: 80 },
    registrationId: { type: String, maxlength: 40 },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    ipHash: String,
  },
  { timestamps: true, collection: "audit_logs" },
);

export default mongoose.models.AuditLog || mongoose.model("AuditLog", schema);
