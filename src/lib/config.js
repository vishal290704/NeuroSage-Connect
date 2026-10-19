import { z } from "zod";

const optionalEmail = z.string().email().optional().or(z.literal(""));

export function getServerConfig() {
  const values = {
    mongodbUri: process.env.MONGODB_URI,
    databaseName: process.env.MONGODB_DB_NAME || "neurosage",
    authSecret: process.env.AUTH_SECRET,
    brevoApiKey: process.env.BREVO_API_KEY,
    brevoSenderEmail: process.env.BREVO_SENDER_EMAIL,
    brevoSenderName: process.env.BREVO_SENDER_NAME || "NeuroSage",
    privacyEmail: process.env.PRIVACY_CONTACT_EMAIL,
  };
  if (!values.mongodbUri) throw new Error("MONGODB_URI is required to use registration services.");
  if (!values.authSecret || values.authSecret.length < 32 || /change.?me|placeholder/i.test(values.authSecret)) {
    throw new Error("AUTH_SECRET must be configured with at least 32 non-placeholder characters.");
  }
  if (process.env.NODE_ENV === "production" && (!values.brevoApiKey || !values.brevoSenderEmail)) {
    throw new Error("BREVO_API_KEY and BREVO_SENDER_EMAIL must be configured before production email workflows.");
  }
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  let parsedSiteUrl;
  try { parsedSiteUrl = new URL(siteUrl); } catch { throw new Error("NEXT_PUBLIC_SITE_URL must be a valid absolute URL."); }
  if (process.env.NODE_ENV === "production" && parsedSiteUrl.protocol !== "https:") {
    throw new Error("NEXT_PUBLIC_SITE_URL must use HTTPS in production.");
  }
  return values;
}

export function getBrevoConfig() {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  const senderEmail = process.env.BREVO_SENDER_EMAIL?.trim();
  if (!apiKey || !senderEmail) throw new Error("Configure BREVO_API_KEY and BREVO_SENDER_EMAIL to send transactional email.");
  if (!z.string().email().safeParse(senderEmail).success) throw new Error("BREVO_SENDER_EMAIL must be a valid verified sender address.");
  return { apiKey, senderEmail, senderName: process.env.BREVO_SENDER_NAME?.trim() || "NeuroSage" };
}

export function getPaymentConfig() {
  if (process.env.REGISTRATION_OPEN === "false") throw new Error("Registration is currently closed.");
  const feeText = process.env.NEXT_PUBLIC_REGISTRATION_FEE_INR || "";
  const fee = Number(feeText);
  if (!process.env.NEXT_PUBLIC_UPI_ID || !/^\d+(?:\.\d{1,2})?$/.test(feeText) || !Number.isFinite(fee) || fee <= 0 || fee > 1_000_000) {
    throw new Error("Configure the public UPI ID and a positive registration fee before accepting registrations.");
  }
  return {
    upiId: process.env.NEXT_PUBLIC_UPI_ID,
    payeeName: process.env.NEXT_PUBLIC_UPI_PAYEE_NAME || "NeuroSage",
    fee,
    campName: process.env.NEXT_PUBLIC_CAMP_NAME || "NeuroSage Mental Wellness Camp",
  };
}

export const adminLoginSchema = z.object({
  email: optionalEmail,
  password: z.string().min(1).max(200),
}).strict().refine((value) => Boolean(value.email), { path: ["email"], message: "Enter a valid email address." });