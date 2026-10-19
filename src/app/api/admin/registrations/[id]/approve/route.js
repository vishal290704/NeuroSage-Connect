import { connectToDatabase } from "@/lib/db/mongodb";
import { requireRole } from "@/lib/auth/session";
import { verifySameOrigin, requestAddress } from "@/lib/security/rate-limit";
import { approveRegistration } from "@/lib/services/approval-service";
import { createHash } from "node:crypto";

export async function POST(request, context) {
  const actor = await requireRole(["ADMIN"]);
  if (!actor) return Response.json({ error: "Authentication required." }, { status: 401 });
  if (!verifySameOrigin(request)) return Response.json({ error: "Request origin is not allowed." }, { status: 403 });
  const { id } = await context.params;
  try {
    await connectToDatabase();
    const ipHash = createHash("sha256").update(requestAddress(request)).digest("hex");
    const registration = await approveRegistration(id, actor.id, ipHash);
    return Response.json({ registration, message: registration.approvalEmailStatus === "FAILED" ? "Approved, but the confirmation email needs retry." : "Registration approved." });
  } catch (error) {
    const status = error.message === "NOT_FOUND" ? 404 : 409;
    const messages = { NOT_FOUND: "Registration not found.", NOT_ELIGIBLE: "This registration is not awaiting payment review.", GUARDIAN_CONSENT_REQUIRED: "Parent or guardian consent must be confirmed first." };
    return Response.json({ error: messages[error.message] || "Unable to approve registration." }, { status });
  }
}