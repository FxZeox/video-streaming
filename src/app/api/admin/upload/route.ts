import crypto from "node:crypto";
import { isAdminAuthenticated } from "@/lib/admin-auth";

const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

export async function POST(request: Request) {
  if (!await isAdminAuthenticated()) return Response.json({ error: "Your admin session has expired. Sign in again." }, { status: 401 });
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName) return new Response(JSON.stringify({ error: "Missing Cloudinary cloud name (CLOUDINARY_CLOUD_NAME)." }), { status: 500, headers: { "Content-Type": "application/json" } });
  if (!uploadPreset && !(apiKey && apiSecret)) return new Response(JSON.stringify({ error: "Missing Cloudinary configuration. Set CLOUDINARY_UPLOAD_PRESET or CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in your environment." }), { status: 500, headers: { "Content-Type": "application/json" } });

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return Response.json({ error: "Choose an image or video file to upload." }, { status: 400 });
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) return Response.json({ error: "Only image and video files are supported." }, { status: 415 });
    if (file.size === 0) return Response.json({ error: "The selected file is empty." }, { status: 400 });
    if (file.size > MAX_UPLOAD_BYTES) return Response.json({ error: "The selected file is larger than the 100 MB upload limit." }, { status: 413 });

    const forward = new FormData();
    forward.append("file", file);

    // If an unsigned preset is configured, use it.
    if (uploadPreset) {
      forward.append("upload_preset", uploadPreset);
    } else {
      // Fallback to signed upload: create timestamp and signature
      const timestamp = Math.floor(Date.now() / 1000);
      const toSign = `timestamp=${timestamp}${apiSecret}`;
      const signature = crypto.createHash("sha1").update(toSign).digest("hex");
      forward.append("api_key", String(apiKey));
      forward.append("timestamp", String(timestamp));
      forward.append("signature", signature);
    }

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, { method: "POST", body: forward });
    const json = await res.json();
    if (!res.ok) return new Response(JSON.stringify({ error: json?.error?.message ?? "Cloudinary upload failed", raw: json }), { status: 502, headers: { "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ path: json.secure_url ?? json.url, raw: json }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch {
    return new Response(JSON.stringify({ error: "Upload failed" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
