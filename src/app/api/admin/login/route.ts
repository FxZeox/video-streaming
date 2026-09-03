import { NextResponse } from "next/server";
import { ADMIN_COOKIE, adminCookieOptions, createSessionToken, credentialsAreConfigured, credentialsMatch } from "@/lib/admin-auth";

const attempts = new Map<string, { count: number; resetAt: number }>();

export async function POST(request: Request) {
  if (!credentialsAreConfigured()) return NextResponse.json({ error: "Admin credentials are not configured." }, { status: 503 });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  const now = Date.now();
  const record = attempts.get(ip);
  if (record && record.resetAt > now && record.count >= 8) return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  const body = await request.json().catch(() => ({})) as { username?: string; password?: string };
  if (!credentialsMatch(body.username ?? "", body.password ?? "")) {
    attempts.set(ip, record && record.resetAt > now ? { ...record, count: record.count + 1 } : { count: 1, resetAt: now + 15 * 60_000 });
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }
  attempts.delete(ip);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, createSessionToken(body.username!), adminCookieOptions);
  return response;
}
