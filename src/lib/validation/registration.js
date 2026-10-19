import { z } from "zod";
import { parsePhoneNumberFromString } from "libphonenumber-js/max";

export const concernOptions = {
  ADHD: ["Difficulty concentrating", "Easily distracted", "Forgetfulness or disorganization", "Difficulty completing tasks", "Restlessness or impulsivity"],
  OCD: ["Repetitive, unwanted thoughts", "Excessive checking or cleaning", "Need for symmetry or things feeling just right", "Repeating actions to reduce anxiety", "Difficulty controlling obsessive thoughts"],
  Anxiety: ["Excessive worrying or overthinking", "Frequent nervousness or fear", "Physical anxiety symptoms", "Fear of judgment or social situations", "Difficulty relaxing"],
  Depression: ["Persistent sadness or emptiness", "Loss of interest in activities", "Low energy or motivation", "Feelings of worthlessness or hopelessness", "Changes in sleep or appetite"],
  Autism: ["Difficulty understanding social cues", "Social communication challenges", "Sensory sensitivities", "Strong preference for routines", "Repetitive behaviours or intense interests"],
  Dyslexia: ["Difficulty reading or spelling", "Slow or effortful reading", "Difficulty connecting letters with sounds", "Frequent spelling errors"],
  Stress: ["Academic pressure or burnout", "Frequent irritability or frustration", "Difficulty managing emotions", "Low confidence or excessive self-comparison", "Feeling mentally overwhelmed"],
  Sleep: ["Difficulty falling or staying asleep", "Irregular sleep schedule", "Excessive daytime sleepiness", "Poor sleep affecting concentration or mood"],
};

export const supportOptions = ["Mental-health awareness", "Psychologist consultation", "Psychiatrist consultation", "Learning assessment or support", "Parent/guardian guidance", "General counselling"];
export const durationOptions = ["Less than 2 weeks", "2 weeks to 6 months", "More than 6 months", "Not sure"];
export const impactOptions = ["Mild", "Moderate", "Severe", "Not sure"];
export const assessmentOptions = ["No previous assessment", "Previously assessed by a professional", "Currently receiving professional support", "Prefer not to say"];

const trimmedText = (min, max, label) => z.string().trim().min(min, `${label} is required.`).max(max, `${label} is too long.`);
const email = z.string().trim().email("Enter a valid email address.").max(254);
const selectionMap = z.record(z.string(), z.array(z.string())).refine((groups) => {
  return Object.entries(groups).every(([key, values]) => concernOptions[key] && values.every((value) => concernOptions[key].includes(value)));
}, "One or more selected areas are invalid.");

export const registrationSchema = z.object({
  fullName: trimmedText(2, 100, "Full name").refine((value) => /^[\p{L}\p{M}][\p{L}\p{M}\s.'’-]*$/u.test(value), "Enter a valid name."),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date of birth.").refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value && date <= new Date();
  }, "Date of birth cannot be in the future."),
  guardian: z.object({ name: z.string().trim().max(100).optional().default(""), email: z.union([email, z.literal("")]).optional().default("") }).strict().default({}),
  phone: z.string().trim().min(5).max(30),
  email,
  gender: z.enum(["Male", "Female", "Other / Non-binary", "Prefer not to say"]).optional().or(z.literal("")),
  address: z.object({
    line: trimmedText(3, 180, "Address"), city: trimmedText(2, 80, "City"), state: trimmedText(2, 80, "State"), postalCode: z.string().trim().min(3).max(12),
    countryCode: z.string().regex(/^[A-Z]{2}$/, "Enter a valid two-letter country code.").default("IN"),
  }).strict(),
  isAKGECStudent: z.boolean(),
  akgecDetails: z.object({
    studentNumber: trimmedText(2, 40, "Student number"), branch: trimmedText(2, 80, "Branch"), specialization: trimmedText(2, 100, "Specialization"),
    section: trimmedText(1, 20, "Section"), yearOfStudy: z.enum(["1", "2", "3", "4", "5", "Other"]),
  }).strict().optional(),
  concerns: selectionMap,
  duration: z.enum(durationOptions),
  impact: z.enum(impactOptions),
  previousAssessment: z.enum(assessmentOptions),
  preferredSupport: z.array(z.enum(supportOptions)).min(1, "Select at least one support preference."),
  additionalInformation: z.string().trim().max(1200, "Keep this response under 1,200 characters.").optional().default(""),
  payment: z.object({ utr: z.string().trim().min(6, "Enter your UTR or transaction reference.").max(64).regex(/^[A-Za-z0-9\-_/]+$/, "Use the characters shown on your UPI transaction receipt.") }).strict(),
  consents: z.object({ screening: z.literal(true), privacy: z.literal(true), professionalSupport: z.literal(true), terms: z.literal(true), participantAssent: z.boolean().optional().default(false) }).strict(),
}).strict().superRefine((value, context) => {
  const phone = parsePhoneNumberFromString(value.phone, "IN");
  if (!phone?.isValid()) context.addIssue({ code: "custom", path: ["phone"], message: "Enter a valid phone number with country code." });
  const age = calculateAge(value.dateOfBirth);
  if (age < 18) {
    if (!value.guardian?.name || !value.guardian?.email) context.addIssue({ code: "custom", path: ["guardian", "email"], message: "A parent or legal guardian name and email are required for participants under 18." });
    if (!value.consents.participantAssent) context.addIssue({ code: "custom", path: ["consents", "participantAssent"], message: "Participant assent is required." });
  }
  if (value.isAKGECStudent && !value.akgecDetails) context.addIssue({ code: "custom", path: ["akgecDetails"], message: "Complete the AKGEC student details." });
  if (!value.isAKGECStudent && value.akgecDetails) context.addIssue({ code: "custom", path: ["akgecDetails"], message: "Remove AKGEC details when this does not apply." });
});

export function calculateAge(dateOfBirth, now = new Date()) {
  const birth = new Date(`${dateOfBirth}T00:00:00.000Z`);
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  if (now.getUTCMonth() < birth.getUTCMonth() || (now.getUTCMonth() === birth.getUTCMonth() && now.getUTCDate() < birth.getUTCDate())) age -= 1;
  return age;
}

export function normalizeEmail(value) { return value.trim().toLowerCase(); }
export function normalizeUtr(value) { return value.trim().replace(/[\s-]/g, "").toUpperCase(); }

export function normalizePhone(value) {
  const parsed = parsePhoneNumberFromString(value, "IN");
  if (!parsed?.isValid()) throw new Error("Enter a valid phone number with country code.");
  return parsed.number;
}