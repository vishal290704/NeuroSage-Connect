import { createHash, randomBytes } from "node:crypto";
import mongoose from "mongoose";
import { getPaymentConfig } from "@/lib/config";
import Registration from "@/models/Registration";
import AKGECStudent from "@/models/AKGECStudent";
import NotificationLog from "@/models/NotificationLog";
import { calculateAge, normalizeEmail, normalizePhone, normalizeUtr } from "@/lib/validation/registration";
import { sendGuardianConsentEmail } from "@/lib/email/mailer";
import { encryptSensitiveData } from "@/lib/security/encryption";

const digest = (value) => createHash("sha256").update(value).digest("hex");

export async function createRegistration(input) {
  const paymentConfig = getPaymentConfig();
  const now = new Date();
  const age = calculateAge(input.dateOfBirth, now);
  const emailNormalized = normalizeEmail(input.email);
  const utrNormalized = normalizeUtr(input.payment.utr);
  const registrationId = `NS-${now.toISOString().slice(0, 10).replaceAll("-", "")}-${randomBytes(6).toString("hex").toUpperCase()}`;
  const statusToken = randomBytes(32).toString("base64url");
  const guardianToken = age < 18 ? randomBytes(32).toString("base64url") : null;
  const guardianPending = age < 18;
  const session = await mongoose.startSession();
  let registration;
  try {
    await session.withTransaction(async () => {
      const [created] = await Registration.create([{
        registrationId,
        fullName: input.fullName.trim(),
        dateOfBirth: new Date(`${input.dateOfBirth}T00:00:00.000Z`),
        calculatedAge: age,
        guardian: age < 18 ? { name: input.guardian.name.trim(), email: normalizeEmail(input.guardian.email) } : undefined,
        email: emailNormalized,
        emailNormalized,
        phone: normalizePhone(input.phone),
        gender: input.gender || "",
        address: input.address,
        isAKGECStudent: input.isAKGECStudent,
        akgecDetails: input.isAKGECStudent ? input.akgecDetails : undefined,
        screeningDataEncrypted: encryptSensitiveData({
          concerns: input.concerns,
          duration: input.duration,
          impact: input.impact,
          previousAssessment: input.previousAssessment,
          preferredSupport: input.preferredSupport,
          additionalInformation: input.additionalInformation || "",
        }),
        consents: { ...input.consents, recordedAt: now },
        guardianConsent: guardianPending ? { status: "PENDING", tokenHash: digest(guardianToken), expiresAt: new Date(now.getTime() + 48 * 60 * 60 * 1000) } : { status: "NOT_REQUIRED" },
        payment: { amountExpected: paymentConfig.fee, amountReported: paymentConfig.fee, currency: "INR", utr: input.payment.utr.trim(), utrNormalized, status: "PENDING_REVIEW" },
        registrationStatus: guardianPending ? "PENDING_GUARDIAN_CONSENT" : "PENDING_PAYMENT_REVIEW",
        statusAccessTokenHash: digest(statusToken),
        privacyPolicyVersion: "2026-10-19-draft",
        termsVersion: "2026-10-19-draft",
      }], { session });
      registration = created;
      if (input.isAKGECStudent) {
        await AKGECStudent.create([{
          registrationId,
          emailNormalized,
          fullName: input.fullName.trim(),
          studentNumber: input.akgecDetails.studentNumber,
          branch: input.akgecDetails.branch,
          specialization: input.akgecDetails.specialization,
          section: input.akgecDetails.section,
          yearOfStudy: input.akgecDetails.yearOfStudy,
          paymentStatus: "PENDING_REVIEW",
          registrationStatus: guardianPending ? "PENDING_GUARDIAN_CONSENT" : "PENDING_PAYMENT_REVIEW",
        }], { session });
      }
      if (guardianPending) await NotificationLog.create([{ registrationId, type: "GUARDIAN_CONSENT", status: "PENDING" }], { session });
    });
  } catch (error) {
    if (error?.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];
      if (field === "emailNormalized") throw new Error("DUPLICATE_EMAIL");
      if (field === "payment.utrNormalized") throw new Error("DUPLICATE_UTR");
      throw new Error("DUPLICATE_REGISTRATION");
    }
    throw error;
  } finally {
    await session.endSession();
  }

  if (guardianPending) {
    try {
      await sendGuardianConsentEmail(registration, guardianToken);
      await NotificationLog.updateOne({ registrationId, type: "GUARDIAN_CONSENT" }, { $set: { status: "SENT", sentAt: new Date(), lastAttemptAt: new Date() }, $inc: { attempts: 1 } });
    } catch {
      await NotificationLog.updateOne({ registrationId, type: "GUARDIAN_CONSENT" }, { $set: { status: "FAILED", safeError: "Guardian email delivery failed; administrator follow-up is required.", lastAttemptAt: new Date() }, $inc: { attempts: 1 } });
    }
  }
  return { registrationId, registrationStatus: registration.registrationStatus, paymentStatus: registration.payment.status, statusToken };
}

export async function getRegistrationStatus(registrationId, token) {
  const registration = await Registration.findOne({ registrationId, statusAccessTokenHash: digest(token) })
    .select("registrationId registrationStatus payment.status approvalEmailStatus createdAt")
    .lean();
  if (!registration) return null;
  return {
    registrationId: registration.registrationId,
    registrationStatus: registration.registrationStatus,
    paymentStatus: registration.payment.status,
    approvalEmailStatus: registration.approvalEmailStatus,
    createdAt: registration.createdAt,
  };
}

export async function confirmGuardianConsent(token) {
  const tokenHash = digest(token);
  const registration = await Registration.findOne({ "guardianConsent.tokenHash": tokenHash, "guardianConsent.status": "PENDING", "guardianConsent.expiresAt": { $gt: new Date() } }).select("registrationId isAKGECStudent");
  if (!registration) return false;
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const updated = await Registration.updateOne({ _id: registration._id, "guardianConsent.status": "PENDING" }, {
        $set: { "guardianConsent.status": "CONFIRMED", "guardianConsent.confirmedAt": new Date(), registrationStatus: "PENDING_PAYMENT_REVIEW" },
        $unset: { "guardianConsent.tokenHash": 1, "guardianConsent.expiresAt": 1 },
      }, { session });
      if (!updated.modifiedCount) throw new Error("CONSENT_ALREADY_USED");
      if (registration.isAKGECStudent) {
        const studentUpdate = await AKGECStudent.updateOne({ registrationId: registration.registrationId }, { $set: { registrationStatus: "PENDING_PAYMENT_REVIEW" } }, { session });
        if (studentUpdate.matchedCount !== 1) throw new Error("AKGEC_SYNC_FAILED");
      }
    });
    await NotificationLog.updateOne({ registrationId: registration.registrationId, type: "GUARDIAN_CONSENT" }, { $set: { status: "SENT", safeError: "Guardian consent link completed." } });
    return true;
  } finally { await session.endSession(); }
}