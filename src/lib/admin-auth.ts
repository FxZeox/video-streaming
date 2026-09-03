import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "frame24_admin";
const SESSION_LENGTH = 60 * 60 * 8;

function secret() {
  return process.env.ADMIN_SESSION_SECRET ?? "development-only-secret-change-me";
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function credentialsAreConfigured() {
  return Boolean(process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD && process.env.ADMIN_SESSION_SECRET);
}

export function credentialsMatch(username: string, password: string) {
  const expectedUser = process.env.ADMIN_USERNAME ?? "";
  const expectedPassword = process.env.ADMIN_PASSWORD ?? "";
  return credentialsAreConfigured() && safeEqual(username, expectedUser) && safeEqual(password, expectedPassword);
}

export function createSessionToken(username: string) {
  const payload = Buffer.from(JSON.stringify({ username, expires: Math.floor(Date.now() / 1000) + SESSION_LENGTH })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token?: string) {
  if (!token) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature || !safeEqual(signature, sign(payload))) return false;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString()) as { username: string; expires: number };
    return session.username === process.env.ADMIN_USERNAME && session.expires > Math.floor(Date.now() / 1000);
  } catch { return false; }
}

export async function isAdminAuthenticated() {
  return verifySessionToken((await cookies()).get(ADMIN_COOKIE)?.value);
}

export const adminCookieOptions = { httpOnly: true, sameSite: "strict" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: SESSION_LENGTH };
