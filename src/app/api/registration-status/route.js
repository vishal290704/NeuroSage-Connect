import { z } from "zod";
import { connectToDatabase } from "@/lib/db/mongodb";
import { getRegistrationStatus } from "@/lib/services/registration-service";

const schema = z.object({ registrationId: z.string().min(8).max(40), token: z.string().min(32).max(100) }).strict();

export async function POST(request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Registration status could not be found." }, { status: 404 });
  try {
    await connectToDatabase();
    const status = await getRegistrationStatus(parsed.data.registrationId, parsed.data.token);
    return status ? Response.json(status, { headers: { "Cache-Control": "no-store" } }) : Response.json({ error: "Registration status could not be found." }, { status: 404 });
  } catch { return Response.json({ error: "Status lookup is temporarily unavailable." }, { status: 503 }); }
}