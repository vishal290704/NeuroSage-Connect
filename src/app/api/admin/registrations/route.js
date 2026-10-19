import { z } from "zod";
import { connectToDatabase } from "@/lib/db/mongodb";
import { requireRole } from "@/lib/auth/session";
import Registration from "@/models/Registration";

const querySchema = z.object({ page: z.coerce.number().int().min(1).default(1), status: z.enum(["ALL", "PENDING_GUARDIAN_CONSENT", "PENDING_PAYMENT_REVIEW", "APPROVED", "REJECTED"]).default("ALL"), student: z.enum(["ALL", "YES", "NO"]).default("ALL"), search: z.string().trim().max(100).default(""), from: z.string().date().optional().default(""), to: z.string().date().optional().default("") }).refine(({ from, to }) => !from || !to || from <= to, { message: "Invalid date range." });

export async function GET(request) {
  const session = await requireRole(["ADMIN"]);
  if (!session) return Response.json({ error: "Authentication required." }, { status: 401 });
  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return Response.json({ error: "Invalid filters." }, { status: 400 });
  try {
    await connectToDatabase();
    const { page, status, student, search, from, to } = parsed.data;
    const filter = {};
    if (status !== "ALL") filter.registrationStatus = status;
    if (student !== "ALL") filter.isAKGECStudent = student === "YES";
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(`${from}T00:00:00.000Z`);
      if (to) { const end = new Date(`${to}T00:00:00.000Z`); end.setUTCDate(end.getUTCDate() + 1); filter.createdAt.$lt = end; }
    }
    if (search) filter.$or = [{ registrationId: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } }, { fullName: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } }, { emailNormalized: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } }];
    const [items, total, counts] = await Promise.all([
      Registration.find(filter).select("registrationId fullName emailNormalized phone isAKGECStudent createdAt registrationStatus payment.amountExpected payment.utr payment.status approvalEmailStatus").sort({ createdAt: -1 }).skip((page - 1) * 25).limit(25).lean(),
      Registration.countDocuments(filter),
      Registration.aggregate([{ $group: { _id: "$registrationStatus", count: { $sum: 1 } } }]),
    ]);
    const stats = await Promise.all([
      Registration.countDocuments(),
      Registration.countDocuments({ registrationStatus: { $in: ["PENDING_PAYMENT_REVIEW", "PENDING_GUARDIAN_CONSENT"] } }),
      Registration.countDocuments({ registrationStatus: "APPROVED" }),
      Registration.countDocuments({ registrationStatus: "REJECTED" }),
      Registration.countDocuments({ isAKGECStudent: true }),
      Registration.countDocuments({ approvalEmailStatus: "FAILED" }),
    ]);
    return Response.json({ items, total, page, pageSize: 25, counts: Object.fromEntries(counts.map(({ _id, count }) => [_id, count])), stats: { total: stats[0], pending: stats[1], approved: stats[2], rejected: stats[3], akgec: stats[4], failedEmails: stats[5] } }, { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ error: "Registration records are temporarily unavailable." }, { status: 503 }); }
}