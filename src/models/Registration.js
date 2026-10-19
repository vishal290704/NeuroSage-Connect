import mongoose from "mongoose";

const { Schema } = mongoose;
const registrationSchema = new Schema(
  {
    registrationId: { type: String, required: true, unique: true, index: true },
    fullName: { type: String, required: true, trim: true, maxlength: 100 },
    dateOfBirth: { type: Date, required: true },
    calculatedAge: { type: Number, required: true, min: 0, max: 125 },
    guardian: {
      name: { type: String, trim: true },
      email: { type: String, lowercase: true, trim: true },
    },
    email: { type: String, required: true, trim: true, lowercase: true },
    emailNormalized: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: { type: String, required: true },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other / Non-binary", "Prefer not to say", ""],
    },
    address: {
      line: String,
      city: String,
      state: String,
      postalCode: String,
      countryCode: String,
    },
    isAKGECStudent: { type: Boolean, required: true },
    akgecDetails: {
      studentNumber: String,
      branch: String,
      specialization: String,
      section: String,
      yearOfStudy: String,
    },
    screeningDataEncrypted: { type: String, required: true, select: false },
    consents: {
      screening: Boolean,
      privacy: Boolean,
      professionalSupport: Boolean,
      terms: Boolean,
      participantAssent: Boolean,
      recordedAt: Date,
    },
    guardianConsent: {
      status: {
        type: String,
        enum: ["NOT_REQUIRED", "PENDING", "CONFIRMED"],
        required: true,
      },
      tokenHash: { type: String, select: false },
      expiresAt: Date,
      confirmedAt: Date,
    },
    payment: {
      amountExpected: { type: Number, required: true },
      amountReported: { type: Number, required: true },
      currency: { type: String, default: "INR" },
      utr: { type: String, required: true },
      utrNormalized: { type: String, required: true },
      status: {
        type: String,
        enum: ["PENDING_REVIEW", "APPROVED", "REJECTED"],
        default: "PENDING_REVIEW",
        required: true,
      },
      reviewedAt: Date,
      reviewedBy: { type: Schema.Types.ObjectId, ref: "AdminUser" },
      rejectionReason: String,
    },
    registrationStatus: {
      type: String,
      enum: [
        "PENDING_GUARDIAN_CONSENT",
        "PENDING_PAYMENT_REVIEW",
        "APPROVED",
        "REJECTED",
      ],
      default: "PENDING_PAYMENT_REVIEW",
      required: true,
    },
    approvalEmailStatus: {
      type: String,
      enum: ["NOT_SENT", "PENDING", "SENT", "FAILED"],
      default: "NOT_SENT",
    },
    statusAccessTokenHash: { type: String, required: true, select: false },
    privacyPolicyVersion: { type: String, required: true },
    termsVersion: { type: String, required: true },
    approvedAt: Date,
    rejectedAt: Date,
    reviewedBy: { type: Schema.Types.ObjectId, ref: "AdminUser" },
  },
  { timestamps: true, minimize: false, collection: "registrations" },
);

registrationSchema.index(
  { "payment.utrNormalized": 1 },
  {
    unique: true,
    partialFilterExpression: { "payment.utrNormalized": { $type: "string" } },
  },
);
registrationSchema.index({
  registrationStatus: 1,
  "payment.status": 1,
  createdAt: -1,
});
registrationSchema.index({ isAKGECStudent: 1, createdAt: -1 });

export default mongoose.models.Registration ||
  mongoose.model("Registration", registrationSchema);
