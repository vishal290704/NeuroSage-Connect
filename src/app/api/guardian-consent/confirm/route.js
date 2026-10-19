import { z } from "zod";
import { connectToDatabase } from "@/lib/db/mongodb";
import { confirmGuardianConsent } from "@/lib/services/registration-service";

export async function POST(request) {
  const parsed = z.object({ token: z.string().min(32).max(100) }).strict().safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "This consent link is invalid or has expired." }, { status: 400 });
  try {
    await connectToDatabase();
    const confirmed = await confirmGuardianConsent(parsed.data.token);
    return confirmed ? Response.json({ message: "Guardian consent has been recorded." }) : Response.json({ error: "This consent link is invalid, expired, or already used." }, { status: 400 });
  } catch { return Response.json({ error: "Consent could not be recorded. Please contact NeuroSage support." }, { status: 503 }); }
}