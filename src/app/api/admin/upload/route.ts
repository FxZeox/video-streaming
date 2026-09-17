import crypto from "node:crypto";
import { isAdminAuthenticated } from "@/lib/admin-auth";

const PLAN_VIDEO_LIMITS_MB: Record<string, number> = {
  Free: 100,
  Plus: 2048,
  Advanced: 4096,
};

let usageCache: { expiresAt: number; plan: string | null; maxVideoBytes: number | null } | null = null;

function getCloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName) throw new Error("Missing Cloudinary cloud name (CLOUDINARY_CLOUD_NAME).");
  if (!uploadPreset && !(apiKey && apiSecret)) throw new Error("Missing Cloudinary configuration. Set CLOUDINARY_UPLOAD_PRESET or CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in your environment.");

  const timestamp = Math.floor(Date.now() / 1000);
  const signature = uploadPreset ? null : crypto.createHash("sha1").update(`timestamp=${timestamp}${apiSecret}`).digest("hex");

  return {
    cloudName,
    uploadPreset: uploadPreset ?? null,
    apiKey: apiKey ?? null,
    timestamp,
    signature,
    url: `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
  };
}

async function getVideoUploadLimit() {
  const configuredLimit = Number(process.env.CLOUDINARY_MAX_VIDEO_MB);
  if (Number.isFinite(configuredLimit) && configuredLimit > 0) {
    return { plan: null, maxVideoBytes: Math.floor(configuredLimit * 1024 * 1024) };
  }

  if (usageCache && usageCache.expiresAt > Date.now()) return usageCache;

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) return { plan: null, maxVideoBytes: null };

  try {
    const authorization = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/usage`, {
      headers: { Authorization: `Basic ${authorization}` },
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Could not read Cloudinary usage limits.");
    const usage = await response.json() as { plan?: string };
    const plan = usage.plan ?? null;
    const maxVideoMb = plan ? PLAN_VIDEO_LIMITS_MB[plan] : undefined;
    usageCache = {
      expiresAt: Date.now() + 5 * 60 * 1000,
      plan,
      maxVideoBytes: maxVideoMb ? maxVideoMb * 1024 * 1024 : null,
    };
    return usageCache;
  } catch {
    return { plan: null, maxVideoBytes: null };
  }
}

export async function GET() {
  if (!await isAdminAuthenticated()) return Response.json({ error: "Your admin session has expired. Sign in again." }, { status: 401 });

  try {
    const config = getCloudinaryConfig();
    const uploadLimit = await getVideoUploadLimit();
    return Response.json({ ...config, ...uploadLimit }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Upload failed." }, { status: 500 });
  }
}
