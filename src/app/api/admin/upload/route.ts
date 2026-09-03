import crypto from "node:crypto";
import { isAdminAuthenticated } from "@/lib/admin-auth";

const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

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
    return Response.json(getCloudinaryConfig());
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Upload failed." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!await isAdminAuthenticated()) return Response.json({ error: "Your admin session has expired. Sign in again." }, { status: 401 });

  try {
    const config = getCloudinaryConfig();
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return Response.json({ error: "Choose an image or video file to upload." }, { status: 400 });
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) return Response.json({ error: "Only image and video files are supported." }, { status: 415 });
    if (file.size === 0) return Response.json({ error: "The selected file is empty." }, { status: 400 });
    if (file.size > MAX_UPLOAD_BYTES) return Response.json({ error: "The selected file is larger than the 100 MB upload limit." }, { status: 413 });

    const forward = new FormData();
    forward.append("file", file);

    if (config.uploadPreset) {
      forward.append("upload_preset", config.uploadPreset);
    } else {
      forward.append("api_key", String(config.apiKey));
      forward.append("timestamp", String(config.timestamp));
      forward.append("signature", String(config.signature));
    }

    const res = await fetch(config.url, { method: "POST", body: forward });
    const json = await res.json();
    if (!res.ok) return new Response(JSON.stringify({ error: json?.error?.message ?? "Cloudinary upload failed", raw: json }), { status: 502, headers: { "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ path: json.secure_url ?? json.url, raw: json }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Upload failed" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
