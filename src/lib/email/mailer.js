import { getBrevoConfig } from "@/lib/config";
import { publicConfig } from "@/lib/public-config";

function createBrevoDeliveryError(status, providerMessage = "") {
  const normalizedMessage = providerMessage.toLowerCase();
  let safeMessage;
  if (status === 401 && /authorized.?ip|unrecognized ip|unrecognised ip|whitelist/.test(normalizedMessage)) {
    safeMessage = "Brevo blocked this server's outbound IP. Add the server IP to Brevo Settings > Security > Authorized IPs, then retry.";
  } else if (status === 401) {
    safeMessage = "Brevo rejected the API key. Add an active v3 API key with transactional email access, then retry.";
  } else if (status === 403) {
    safeMessage = "Brevo denied transactional email access. Check API-key permissions and verify the sender address.";
  } else {
    safeMessage = `Brevo could not accept the email (HTTP ${status}). Check Brevo transactional email settings, then retry.`;
  }
  const error = new Error(`Brevo transactional email failed with HTTP ${status}.`);
  error.safeMessage = safeMessage;
  error.status = status;
  return error;
}

async function sendTransactionalEmail({ to, subject, text, html }) {
  const config = getBrevoConfig();
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json", "api-key": config.apiKey },
    body: JSON.stringify({
      sender: { name: config.senderName, email: config.senderEmail },
      to: [{ email: to }],
      subject,
      textContent: text,
      htmlContent: html,
    }),
    cache: "no-store",
  });
  if (!response.ok) {
    const providerError = await response.json().catch(() => ({}));
    throw createBrevoDeliveryError(response.status, providerError.message);
  }
  return response.json().catch(() => ({}));
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

export async function sendApprovalEmail(registration) {
  const name = escapeHtml(registration.fullName);
  const reference = escapeHtml(registration.registrationId);
  const eventName = escapeHtml(
    process.env.NEXT_PUBLIC_CAMP_NAME || publicConfig.campName
  );

  const supportEmail = process.env.SUPPORT_EMAIL?.trim();

  const support = supportEmail
    ? `<a href="mailto:${escapeHtml(supportEmail)}">${escapeHtml(supportEmail)}</a>`
    : "the NeuroSage team";

  const text = `Hello ${registration.fullName},

Your registration for ${eventName} has been approved. Your submitted payment has been reviewed, and your registration is now confirmed.

Registration Reference: ${registration.registrationId}
Event: ${process.env.NEXT_PUBLIC_CAMP_NAME || publicConfig.campName}

Our team will contact you by email or WhatsApp once your meeting with a consultant is scheduled. We will also send you a separate email with the confirmed appointment details. Please check both regularly; this email does not confirm an appointment time.

Thank you for taking this step toward greater awareness and well-being.

Be kind to your Mind.

For questions, contact ${process.env.SUPPORT_EMAIL || "the NeuroSage team"}.

Warm regards,
Team NeuroSage`;

  const html = `<div style="margin:0;background:#f4f8f6;padding:32px 16px;font-family:Arial,sans-serif;color:#24343b">
    <div style="max-width:560px;margin:auto;background:#fff;padding:32px;border-top:4px solid #287f83">
      <p style="color:#287f83;font-weight:bold">NEUROSAGE · BE KIND TO YOUR MIND</p>

      <h1 style="font-size:24px">Your registration is approved</h1>

      <p>Hello ${name},</p>

      <p>
        Your registration for <strong>${eventName}</strong> has been approved.
        Your submitted payment has been reviewed, and your registration is now confirmed.
      </p>

      <p>
        <strong>Registration reference:</strong> ${reference}<br>
        <strong>Event:</strong> ${eventName}
      </p>

      <p>
        Our team will contact you by email or WhatsApp once your meeting with
        a consultant is scheduled. We will also send you a separate email with
        the confirmed appointment details. Please check both regularly;
        this email does not confirm an appointment time.
      </p>

      <p>
        Thank you for taking this step toward greater awareness and well-being.
      </p>

      <p><em>Be kind to your Mind.</em></p>

      <p>For questions, contact ${support}.</p>

      <p>Warm regards,<br>Team NeuroSage</p>
    </div>
  </div>`;

  return sendTransactionalEmail({
    to: registration.emailNormalized,
    subject: "Your NeuroSage Registration Is Approved",
    text,
    html,
  });
}

export async function sendGuardianConsentEmail(registration, token) {
  const link = `${publicConfig.siteUrl}/guardian-consent?token=${encodeURIComponent(token)}`;
  const text = `A registration for ${process.env.NEXT_PUBLIC_CAMP_NAME || publicConfig.campName} lists you as a parent or guardian. Review and confirm consent here: ${link}\n\nThis link expires in 48 hours. If you did not expect this request, you can ignore this email.`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:28px;color:#24343b"><h1>Parent or guardian consent</h1><p>A participant has listed you as their parent or legal guardian for a NeuroSage event registration.</p><p><a href="${link}" style="display:inline-block;padding:12px 18px;background:#287f83;color:#fff;text-decoration:none">Review consent request</a></p><p>This link expires in 48 hours. If you did not expect this request, you can ignore this email.</p></div>`;
  return sendTransactionalEmail({ to: registration.guardian.email, subject: "NeuroSage parent or guardian consent request", text, html });
}