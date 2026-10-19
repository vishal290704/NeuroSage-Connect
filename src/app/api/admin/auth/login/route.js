import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/db/mongodb";
import { adminLoginSchema } from "@/lib/config";
import { createSession } from "@/lib/auth/session";
import { rateLimit, requestAddress } from "@/lib/security/rate-limit";
import AdminUser from "@/models/AdminUser";

export async function POST(request) {
  let limit;
  try { limit = await rateLimit(`admin-login:${requestAddress(request)}`, { limit: 5, windowMs: 15 * 60 * 1000 }); }
  catch (error) {
    console.error("Admin login rate-limit check failed", { errorType: error?.name, errorCode: error?.codeName || error?.code });
    return Response.json({ error: "Sign-in is temporarily unavailable." }, { status: 503 });
  }
  if (!limit.allowed) return Response.json({ error: "Unable to sign in. Try again later." }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
  const parsed = adminLoginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Enter a valid email and password." }, { status: 400 });
  try {
    await connectToDatabase();
    const emailNormalized = parsed.data.email.toLowerCase();
    const user = await AdminUser.findOne({ emailNormalized }).select("+passwordHash");
    if (!user || !user.active || (user.lockedUntil && user.lockedUntil > new Date()) || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
      return Response.json({ error: "Unable to sign in with those credentials." }, { status: 401 });
    }
    user.failedLoginCount = 0;
    user.lockedUntil = undefined;
    user.lastLoginAt = new Date();
    await user.save();
    await createSession(user);
    return Response.json({ success: true, role: user.role });
  } catch (error) {
    console.error("Admin login processing failed", { errorType: error?.name, errorCode: error?.codeName || error?.code });
    return Response.json({ error: "Sign-in is temporarily unavailable." }, { status: 503 });
  }
}