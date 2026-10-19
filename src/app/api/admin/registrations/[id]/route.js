import { connectToDatabase } from "@/lib/db/mongodb";
import { requireRole } from "@/lib/auth/session";
import Registration from "@/models/Registration";
import AuditLog from "@/models/AuditLog";
import NotificationLog from "@/models/NotificationLog";

export async function GET(_request, context) {
  const session = await requireRole(["ADMIN"]);
  if (!session) return Response.json({ error: "Authentication required." }, { status: 401 });
  const { id } = await context.params;
  try {
    await connectToDatabase();
    const registration = await Registration.findOne({ registrationId: id }).lean();
    if (!registration) return Response.json({ error: "Registration not found." }, { status: 404 });
    const [audit, notification] = await Promise.all([
      AuditLog.find({ registrationId: id }).select("action metadata createdAt actorId").sort({ createdAt: -1 }).limit(20).lean(),
      NotificationLog.findOne({ registrationId: id, type: "APPROVAL" }).select("status attempts lastAttemptAt sentAt safeError").lean(),
    ]);
    return Response.json({ registration, audit, notification }, { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ error: "Registration is temporarily unavailable." }, { status: 503 }); }
}