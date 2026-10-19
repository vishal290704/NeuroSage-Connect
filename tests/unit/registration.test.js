import { describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import { calculateAge, normalizeEmail, normalizeUtr, registrationSchema } from "../../src/lib/validation/registration.js";
import { decryptSensitiveData, encryptSensitiveData } from "../../src/lib/security/encryption.js";

const validInput = {
  fullName: "Asha Rao",
  dateOfBirth: "1990-04-23",
  phone: "+91 98765 43210",
  email: " Asha.Rao@example.com ",
  address: { line: "12 Park Road", city: "Ghaziabad", state: "Uttar Pradesh", postalCode: "201009", countryCode: "IN" },
  isAKGECStudent: false,
  concerns: {},
  duration: "Not sure",
  impact: "Mild",
  previousAssessment: "Prefer not to say",
  preferredSupport: ["Mental-health awareness"],
  payment: { utr: "123456789012" },
  consents: { screening: true, privacy: true, professionalSupport: true, terms: true },
};

describe("registration validation", () => {
  it("accepts a valid adult registration without disclosing concerns", () => {
    expect(registrationSchema.safeParse(validInput).success).toBe(true);
  });

  it("rejects malformed email, a future birth date, and missing required consents", () => {
    expect(registrationSchema.safeParse({ ...validInput, email: "not-an-email" }).success).toBe(false);
    expect(registrationSchema.safeParse({ ...validInput, dateOfBirth: "2999-01-01" }).success).toBe(false);
    expect(registrationSchema.safeParse({ ...validInput, consents: { ...validInput.consents, privacy: false } }).success).toBe(false);
  });

  it("requires guardian contact, assent, and AKGEC fields conditionally", () => {
    expect(registrationSchema.safeParse({ ...validInput, dateOfBirth: "2012-01-01" }).success).toBe(false);
    expect(registrationSchema.safeParse({ ...validInput, isAKGECStudent: true }).success).toBe(false);
  });

  it("rejects unknown request fields and invalid concern options", () => {
    expect(registrationSchema.safeParse({ ...validInput, approved: true }).success).toBe(false);
    expect(registrationSchema.safeParse({ ...validInput, concerns: { Anxiety: ["Made up option"] } }).success).toBe(false);
  });
});

describe("normalization and age", () => {
  it("normalizes email and transaction references consistently", () => {
    expect(normalizeEmail("  Person@Example.COM ")).toBe("person@example.com");
    expect(normalizeUtr(" ab-123 456 ")).toBe("AB123456");
  });

  it("calculates age from the full birth date, not just the year", () => {
    expect(calculateAge("2008-10-20", new Date("2026-10-19T12:00:00Z"))).toBe(17);
    expect(calculateAge("2008-10-18", new Date("2026-10-19T12:00:00Z"))).toBe(18);
  });
});

describe("sensitive-data encryption", () => {
  it("round-trips screening data and rejects ciphertext tampering", () => {
    const previousKey = process.env.DATA_ENCRYPTION_KEY;
    process.env.DATA_ENCRYPTION_KEY = randomBytes(32).toString("base64");
    try {
      const input = { concerns: { Anxiety: ["Difficulty relaxing"] }, additionalInformation: "Private note" };
      const encrypted = encryptSensitiveData(input);
      expect(encrypted).not.toContain("Private note");
      expect(decryptSensitiveData(encrypted)).toEqual(input);
      const tampered = `${encrypted.slice(0, -1)}${encrypted.endsWith("A") ? "B" : "A"}`;
      expect(() => decryptSensitiveData(tampered)).toThrow();
    } finally {
      if (previousKey === undefined) delete process.env.DATA_ENCRYPTION_KEY;
      else process.env.DATA_ENCRYPTION_KEY = previousKey;
    }
  });
});