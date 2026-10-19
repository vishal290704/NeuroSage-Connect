import { clearSession } from "@/lib/auth/session";
import { verifySameOrigin } from "@/lib/security/rate-limit";

export async function POST(request) {
  if (!verifySameOrigin(request)) return Response.json({ error: "Request origin is not allowed." }, { status: 403 });
  await clearSession();
  return Response.json({ success: true });
}