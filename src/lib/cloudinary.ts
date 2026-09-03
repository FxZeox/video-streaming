import crypto from "node:crypto";

export function getCloudinaryMetaFromUrl(url: string) {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/").filter(Boolean);
    const uploadIndex = parts.findIndex((part) => part === "upload");
    if (uploadIndex < 0) return null;

    const resourceType = parts[uploadIndex - 1] ?? "image";
    let afterUpload = parts.slice(uploadIndex + 1);
    if (afterUpload[0]?.startsWith("v") && /^v\d+$/.test(afterUpload[0])) {
      afterUpload = afterUpload.slice(1);
    }

    const publicId = afterUpload.join("/").replace(/\.[^/.]+$/, "");
    return { resourceType, publicId };
  } catch {
    return null;
  }
}

export async function deleteCloudinaryAsset(url?: string) {
  if (!url) return false;

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) return false;

  const meta = getCloudinaryMetaFromUrl(url);
  if (!meta || !meta.publicId) return false;

  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto
    .createHash("sha1")
    .update(`public_id=${meta.publicId}&timestamp=${timestamp}${apiSecret}`)
    .digest("hex");

  const params = new URLSearchParams({
    public_id: meta.publicId,
    timestamp: String(timestamp),
    api_key: apiKey,
    signature,
    invalidate: "true",
  });

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/${meta.resourceType}/destroy`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    },
  );

  const payload = await response.json().catch(() => ({}));
  return response.ok && payload.result === "ok";
}
