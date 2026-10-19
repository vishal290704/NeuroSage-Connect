import { connectToDatabase } from "@/lib/db/mongodb";
import { requireRole } from "@/lib/auth/session";
import AKGECStudent from "@/models/AKGECStudent";

export async function GET(request) {
  if (!(await requireRole(["ADMIN"]))) return Response.json({ error: "Authentication required." }, { status: 401 });
  const page = Math.max(1, Math.min(10000, Number(new URL(request.url).searchParams.get("page") || 1)));
  try {
    await connectToDatabase();
    const [items, total] = await Promise.all([AKGECStudent.find().sort({ createdAt: -1 }).skip((page - 1) * 25).limit(25).lean(), AKGECStudent.countDocuments()]);
    return Response.json({ items, total, page, pageSize: 25 }, { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ error: "Student records are temporarily unavailable." }, { status: 503 }); }
}