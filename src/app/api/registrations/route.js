import { registrationSchema } from "@/lib/validation/registration";
import { connectToDatabase } from "@/lib/db/mongodb";
import { createRegistration } from "@/lib/services/registration-service";
import { rateLimit, requestAddress } from "@/lib/security/rate-limit";

export async function POST(request) {
  let limit;
  try { limit = await rateLimit(`registration:${requestAddress(request)}`, { limit: 5, windowMs: 60 * 60 * 1000 }); }
  catch { return Response.json({ error: "Registration is temporarily unavailable." }, { status: 503 }); }
  if (!limit.allowed) return Response.json({ error: "Too many attempts. Please try again later." }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
  if (Number(request.headers.get("content-length") || 0) > 40_000) return Response.json({ error: "The submitted form is too large." }, { status: 413 });
  let body;
  try {
    const rawBody = await request.text();
    if (Buffer.byteLength(rawBody, "utf8") > 40_000) return Response.json({ error: "The submitted form is too large." }, { status: 413 });
    body = JSON.parse(rawBody);
  } catch { return Response.json({ error: "Submit valid registration information." }, { status: 400 }); }
  const parsed = registrationSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Review the highlighted form fields and try again.", fieldErrors: parsed.error.flatten().fieldErrors }, { status: 422 });
  try {
    await connectToDatabase();
    const result = await createRegistration(parsed.data);
    return Response.json(result, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const messages = {
      DUPLICATE_EMAIL: "A registration may already exist for this email address. Please use your existing registration details or contact NeuroSage support if you need assistance.",
      DUPLICATE_UTR: "This transaction reference is already associated with a registration. Contact NeuroSage support if you believe this is an error.",
      DUPLICATE_REGISTRATION: "This registration could not be completed. Please contact NeuroSage support.",
    };
    if (messages[error.message]) return Response.json({ error: messages[error.message] }, { status: 409 });
    const status = error.message.includes("Configure the public UPI") ? 503 : 503;
    return Response.json({ error: status === 503 ? "Registration is temporarily unavailable. Please try again later." : "Unable to submit registration." }, { status });
  }
}