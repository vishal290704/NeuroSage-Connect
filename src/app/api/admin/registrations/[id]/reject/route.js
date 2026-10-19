import { z } from "zod";
import { createHash } from "node:crypto";
import { connectToDatabase } from "@/lib/db/mongodb";
import { requireRole } from "@/lib/auth/session";
import { verifySameOrigin, requestAddress } from "@/lib/security/rate-limit";
import { rejectRegistration } from "@/lib/services/approval-service";

const schema = z.object({ reason: z.string().trim().min(5).max(500) }).strict();

export async function POST(request, context) {
  const actor = await requireRole(["ADMIN"]);
  if (!actor) return Response.json({ error: "Authentication required." }, { status: 401 });
  if (!verifySameOrigin(request)) return Response.json({ error: "Request origin is not allowed." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Provide a brief, participant-appropriate reason." }, { status: 400 });
  const { id } = await context.params;
  try {
    await connectToDatabase();
    const ipHash = createHash("sha256").update(requestAddress(request)).digest("hex");
    return Response.json(await rejectRegistration(id, actor.id, parsed.data.reason, ipHash));
  } catch (error) {
    const status = error.message === "NOT_FOUND" ? 404 : 409;
    return Response.json({ error: status === 404 ? "Registration not found." : "This registration cannot be rejected in its current status." }, { status });
  }
}