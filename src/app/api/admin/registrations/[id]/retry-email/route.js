import { connectToDatabase } from "@/lib/db/mongodb";
import { requireRole } from "@/lib/auth/session";
import { verifySameOrigin } from "@/lib/security/rate-limit";
import { retryApprovalEmail } from "@/lib/services/approval-service";
import { createHash } from "node:crypto";
import { requestAddress } from "@/lib/security/rate-limit";

export async function POST(request, context) {
  const actor = await requireRole(["ADMIN"]);
  if (!actor) return Response.json({ error: "Authentication required." }, { status: 401 });
  if (!verifySameOrigin(request)) return Response.json({ error: "Request origin is not allowed." }, { status: 403 });
  try {
    await connectToDatabase();
    const { id } = await context.params;
    const ipHash = createHash("sha256").update(requestAddress(request)).digest("hex");
    const result = await retryApprovalEmail(id, actor.id, ipHash);
    if (result.status === "FAILED") return Response.json({ error: result.error || "Brevo did not accept the approval email." }, { status: 502 });
    if (result.status === "PENDING") return Response.json({ message: "An approval email attempt is already in progress." }, { status: 202 });
    return Response.json({ message: "Brevo accepted the approval email for delivery." });
  } catch { return Response.json({ error: "Only approved registrations can receive an approval email." }, { status: 409 }); }
}