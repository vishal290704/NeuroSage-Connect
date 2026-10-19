import mongoose from "mongoose";

const schema = new mongoose.Schema({
  registrationId: { type: String, required: true, unique: true, index: true },
  emailNormalized: { type: String, required: true, index: true },
  fullName: { type: String, required: true },
  studentNumber: { type: String, required: true },
  branch: { type: String, required: true },
  specialization: { type: String, required: true },
  section: { type: String, required: true },
  yearOfStudy: { type: String, required: true },
  paymentStatus: { type: String, enum: ["PENDING_REVIEW", "APPROVED", "REJECTED"], required: true },
  registrationStatus: { type: String, enum: ["PENDING_GUARDIAN_CONSENT", "PENDING_PAYMENT_REVIEW", "APPROVED", "REJECTED"], required: true },
}, { timestamps: true, collection: "akgec_students" });

export default mongoose.models.AKGECStudent || mongoose.model("AKGECStudent", schema);