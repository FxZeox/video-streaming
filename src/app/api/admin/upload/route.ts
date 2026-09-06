import crypto from "node:crypto";
import { isAdminAuthenticated } from "@/lib/admin-auth";

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

export async function GET() {
  if (!await isAdminAuthenticated()) return Response.json({ error: "Your admin session has expired. Sign in again." }, { status: 401 });

  try {
    return Response.json(getCloudinaryConfig(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Upload failed." }, { status: 500 });
  }
}
