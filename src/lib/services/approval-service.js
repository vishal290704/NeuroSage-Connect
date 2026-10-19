import mongoose from "mongoose";
import Registration from "@/models/Registration";
import AKGECStudent from "@/models/AKGECStudent";
import AuditLog from "@/models/AuditLog";
import NotificationLog from "@/models/NotificationLog";
import { sendApprovalEmail } from "@/lib/email/mailer";

export async function approveRegistration(registrationId, actorId, ipHash) {
  const session = await mongoose.startSession();
  let registration;
  let newlyApproved = false;
  try {
    await session.withTransaction(async () => {
      registration = await Registration.findOne({ registrationId }).session(session);
      if (!registration) throw new Error("NOT_FOUND");
      if (registration.registrationStatus === "APPROVED") return;
      if (registration.registrationStatus !== "PENDING_PAYMENT_REVIEW" || registration.payment.status !== "PENDING_REVIEW") throw new Error("NOT_ELIGIBLE");
      if (registration.calculatedAge < 18 && registration.guardianConsent.status !== "CONFIRMED") throw new Error("GUARDIAN_CONSENT_REQUIRED");
      const now = new Date();
      registration.payment.status = "APPROVED";
      registration.payment.reviewedAt = now;
      registration.payment.reviewedBy = actorId;
      registration.registrationStatus = "APPROVED";
      registration.reviewedBy = actorId;
      registration.approvedAt = now;
      registration.approvalEmailStatus = "PENDING";
      await registration.save({ session });
      newlyApproved = true;
      if (registration.isAKGECStudent) {
        const studentUpdate = await AKGECStudent.updateOne({ registrationId, paymentStatus: "PENDING_REVIEW" }, { $set: { paymentStatus: "APPROVED", registrationStatus: "APPROVED" } }, { session });
        if (studentUpdate.matchedCount !== 1) throw new Error("AKGEC_SYNC_FAILED");
      }
      await AuditLog.create([{ actorId, action: "REGISTRATION_APPROVED", registrationId, metadata: { paymentStatus: "APPROVED" }, ipHash }], { session });
      await NotificationLog.findOneAndUpdate({ registrationId, type: "APPROVAL" }, { $set: { status: "PENDING", safeError: undefined }, $setOnInsert: { attempts: 0 } }, { upsert: true, new: true, session });
    });
  } finally { await session.endSession(); }
  if (newlyApproved) await deliverApproval(registration);
  const latest = await Registration.findOne({ registrationId }).select("registrationId registrationStatus payment.status approvalEmailStatus approvedAt").lean();
  return latest;
}

export async function deliverApproval(registration) {
  const filter = { registrationId: registration.registrationId, type: "APPROVAL" };
  const existing = await NotificationLog.findOne(filter);
  if (existing?.status === "SENT") return { status: "SENT", alreadySent: true };
  const update = { $set: { status: "PENDING", lastAttemptAt: new Date(), safeError: "" }, $inc: { attempts: 1 } };
  const log = await NotificationLog.findOneAndUpdate({ ...filter, status: "PENDING", attempts: 0 }, update, { new: true })
    || await NotificationLog.findOneAndUpdate({ ...filter, status: "FAILED" }, update, { new: true });
  if (!log) return { status: "PENDING", alreadyInProgress: true };
  try {
    await sendApprovalEmail(registration);
    await Promise.all([
      NotificationLog.updateOne({ _id: log._id }, { $set: { status: "SENT", sentAt: new Date(), safeError: "" } }),
      Registration.updateOne({ registrationId: registration.registrationId, registrationStatus: "APPROVED" }, { $set: { approvalEmailStatus: "SENT" } }),
    ]);
    return { status: "SENT" };
  } catch (error) {
    const safeError = error?.safeMessage || "Brevo delivery failed. Check transactional email settings, then retry.";
    await Promise.all([
      NotificationLog.updateOne({ _id: log._id }, { $set: { status: "FAILED", safeError } }),
      Registration.updateOne({ registrationId: registration.registrationId, registrationStatus: "APPROVED" }, { $set: { approvalEmailStatus: "FAILED" } }),
    ]);
    return { status: "FAILED", error: safeError };
  }
}

export async function rejectRegistration(registrationId, actorId, reason, ipHash) {
  const session = await mongoose.startSession();
  let result;
  try {
    await session.withTransaction(async () => {
      const registration = await Registration.findOne({ registrationId }).session(session);
      if (!registration) throw new Error("NOT_FOUND");
      if (!["PENDING_PAYMENT_REVIEW", "PENDING_GUARDIAN_CONSENT"].includes(registration.registrationStatus)) throw new Error("NOT_ELIGIBLE");
      const now = new Date();
      registration.payment.status = "REJECTED";
      registration.payment.reviewedAt = now;
      registration.payment.reviewedBy = actorId;
      registration.payment.rejectionReason = reason;
      registration.registrationStatus = "REJECTED";
      registration.reviewedBy = actorId;
      registration.rejectedAt = now;
      await registration.save({ session });
      if (registration.isAKGECStudent) {
        const studentUpdate = await AKGECStudent.updateOne({ registrationId }, { $set: { paymentStatus: "REJECTED", registrationStatus: "REJECTED" } }, { session });
        if (studentUpdate.matchedCount !== 1) throw new Error("AKGEC_SYNC_FAILED");
      }
      await AuditLog.create([{ actorId, action: "REGISTRATION_REJECTED", registrationId, metadata: { reason }, ipHash }], { session });
      result = { registrationId, registrationStatus: "REJECTED", paymentStatus: "REJECTED" };
    });
  } finally { await session.endSession(); }
  return result;
}

export async function retryApprovalEmail(registrationId, actorId, ipHash) {
  const registration = await Registration.findOne({ registrationId, registrationStatus: "APPROVED" });
  if (!registration) throw new Error("NOT_ELIGIBLE");
  await AuditLog.create({ actorId, action: "APPROVAL_EMAIL_RETRY_REQUESTED", registrationId, metadata: {}, ipHash });
  return deliverApproval(registration);
}