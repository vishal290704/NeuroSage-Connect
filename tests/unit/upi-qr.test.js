import { describe, expect, it } from "vitest";
import { isMatchingUpiQrPayload } from "../../src/lib/payment/upi.js";

const expected = { upiId: "wellness@okaxis", amount: 49 };

describe("UPI QR payload validation", () => {
  it("accepts only a UPI payment payload for the configured account, exact amount, and INR", () => {
    const payload = "upi://pay?pa=wellness%40okaxis&pn=NeuroSage&am=49.00&cu=INR&tn=Camp";
    expect(isMatchingUpiQrPayload(payload, expected)).toBe(true);
  });

  it("rejects a different payee, missing amount, wrong currency, and non-UPI content", () => {
    expect(isMatchingUpiQrPayload("upi://pay?pa=other%40okaxis&am=49&cu=INR", expected)).toBe(false);
    expect(isMatchingUpiQrPayload("upi://pay?pa=wellness%40okaxis&cu=INR", expected)).toBe(false);
    expect(isMatchingUpiQrPayload("upi://pay?pa=wellness%40okaxis&am=49&cu=USD", expected)).toBe(false);
    expect(isMatchingUpiQrPayload("https://example.com", expected)).toBe(false);
  });
});