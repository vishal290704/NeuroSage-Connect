import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getServerConfig } from "@/lib/config";
import { connectToDatabase } from "@/lib/db/mongodb";
import AdminUser from "@/models/AdminUser";

const COOKIE_NAME = "neurosage_admin";
const MAX_AGE = 60 * 60 * 8;

function secretKey() { return new TextEncoder().encode(getServerConfig().authSecret); }

export async function createSession(user) {
  const token = await new SignJWT({ role: user.role, email: user.emailNormalized })
    .setProtectedHeader({ alg: "HS256" }).setSubject(String(user._id)).setIssuedAt().setExpirationTime(`${MAX_AGE}s`).sign(secretKey());
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: MAX_AGE });
}

export async function clearSession() {
  const jar = await cookies();
  jar.set(COOKIE_NAME, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 0 });
}

export async function getSession() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    return { id: payload.sub, role: payload.role, email: payload.email };
  } catch { return null; }
}

export async function requireRole(roles = ["ADMIN"]) {
  const session = await getSession();
  if (!session || !roles.includes(session.role)) return null;
  try {
    await connectToDatabase();
    const activeUser = await AdminUser.exists({ _id: session.id, active: true, role: session.role });
    if (!activeUser) return null;
  } catch { return null; }
  return session;
}