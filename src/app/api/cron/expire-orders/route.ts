// Releases stock held by abandoned QR codes, so products don't stay "sold out"
// until the next order is placed. Call it on a schedule (about every 5 minutes)
// with "Authorization: Bearer $CRON_SECRET". Database only: it never calls Bakong.
import { timingSafeEqual } from "node:crypto";
import { expireOrders } from "@/lib/orders";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);

  // No secret configured means the route stays closed
  if (!secret || given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return new Response("Unauthorized", { status: 401 });
  }

  await expireOrders();
  return Response.json({ ok: true });
}
