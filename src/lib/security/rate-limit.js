import { createHash } from "node:crypto";
import { connectToDatabase } from "@/lib/db/mongodb";
import RateLimitCounter from "@/models/RateLimitCounter";

export async function rateLimit(key, { limit = 8, windowMs = 60_000 } = {}) {
  await connectToDatabase();
  const hashedKey = createHash("sha256").update(key).digest("hex");
  const now = new Date();
  const nextReset = new Date(now.getTime() + windowMs);
  const pipeline = [{ $set: {
    count: { $cond: [{ $gt: ["$resetAt", now] }, { $add: [{ $ifNull: ["$count", 0] }, 1] }, 1] },
    resetAt: { $cond: [{ $gt: ["$resetAt", now] }, "$resetAt", nextReset] },
  } }];
  const options = { returnDocument: "after", upsert: true, updatePipeline: true };
  let bucket;
  try {
    bucket = await RateLimitCounter.findOneAndUpdate({ key: hashedKey }, pipeline, options);
  } catch (error) {
    if (error?.code !== 11000) throw error;
    bucket = await RateLimitCounter.findOneAndUpdate({ key: hashedKey }, pipeline, { ...options, upsert: false });
  }
  return { allowed: bucket.count <= limit, retryAfter: Math.max(1, Math.ceil((bucket.resetAt.getTime() - now.getTime()) / 1000)) };
}

export function requestAddress(request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export function verifySameOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try { return new URL(origin).host === new URL(request.url).host; } catch { return false; }
}