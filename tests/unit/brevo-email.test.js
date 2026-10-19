import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sendApprovalEmail, sendGuardianConsentEmail } from "../../src/lib/email/mailer.js";

const configKeys = ["BREVO_API_KEY", "BREVO_SENDER_EMAIL", "BREVO_SENDER_NAME", "NEXT_PUBLIC_SITE_URL", "NEXT_PUBLIC_CAMP_NAME"];
let previousConfig;

beforeEach(() => {
  previousConfig = Object.fromEntries(configKeys.map((key) => [key, process.env[key]]));
  process.env.BREVO_API_KEY = "unit-test-brevo-api-key";
  process.env.BREVO_SENDER_EMAIL = "verified@example.test";
  process.env.BREVO_SENDER_NAME = "NeuroSage test";
  process.env.NEXT_PUBLIC_SITE_URL = "https://neurosage.example.test";
  process.env.NEXT_PUBLIC_CAMP_NAME = "NeuroSage Camp";
});

afterEach(() => {
  vi.unstubAllGlobals();
  for (const [key, value] of Object.entries(previousConfig)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("Brevo transactional email", () => {
  it("sends a generic approval email with the Brevo API and no screening data", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ messageId: "test-message" }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    await sendApprovalEmail({
      emailNormalized: "participant@example.test",
      fullName: "Asha Rao",
      registrationId: "NS-20261019-ABCDEF123456",
      concerns: { Anxiety: ["private concern"] },
      additionalInformation: "private participant note",
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.brevo.com/v3/smtp/email");
    expect(options.headers["api-key"]).toBe("unit-test-brevo-api-key");
    const payload = JSON.parse(options.body);
    expect(payload.sender).toEqual({ name: "NeuroSage test", email: "verified@example.test" });
    expect(payload.to).toEqual([{ email: "participant@example.test" }]);
    expect(payload.subject).toBe("Your NeuroSage Registration Is Approved");
    expect(payload.textContent).toContain("NS-20261019-ABCDEF123456");
    expect(payload.textContent).toContain("Our team will contact you by email or WhatsApp once your meeting with a consultant is scheduled.");
    expect(payload.htmlContent).toContain("this email does not confirm an appointment time");
    expect(JSON.stringify(payload)).not.toContain("private concern");
    expect(JSON.stringify(payload)).not.toContain("private participant note");
  });

  it("sends the guardian confirmation link through Brevo", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ messageId: "test-message" }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    await sendGuardianConsentEmail({ guardian: { email: "guardian@example.test" } }, "one-time-token");

    const payload = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(payload.to).toEqual([{ email: "guardian@example.test" }]);
    expect(payload.textContent).toContain("http://localhost:3000/guardian-consent?token=one-time-token");
  });

  it("returns a failure for non-successful Brevo responses without exposing the API key", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("provider detail", { status: 429 })));
    await expect(sendApprovalEmail({ emailNormalized: "participant@example.test", fullName: "Asha", registrationId: "NS-123" }))
      .rejects.toThrow("Brevo transactional email failed with HTTP 429.");
  });

  it("provides safe guidance when Brevo blocks the server IP", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: "unauthorized", message: "Unrecognized IP address is not authorized." }), { status: 401 })));
    await expect(sendApprovalEmail({ emailNormalized: "participant@example.test", fullName: "Asha", registrationId: "NS-123" }))
      .rejects.toMatchObject({ safeMessage: expect.stringContaining("outbound IP") });
  });
});