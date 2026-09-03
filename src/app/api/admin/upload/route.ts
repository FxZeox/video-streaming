export async function POST(request: Request) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;
  if (!cloudName || !uploadPreset) return new Response(JSON.stringify({ error: "Missing Cloudinary configuration. Set CLOUDINARY_CLOUD_NAME and CLOUDINARY_UPLOAD_PRESET in your environment." }), { status: 500, headers: { "Content-Type": "application/json" } });

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!file) return new Response(JSON.stringify({ error: "No file provided." }), { status: 400, headers: { "Content-Type": "application/json" } });

    const forward = new FormData();
    // file may be a Blob / File (web), append directly
    forward.append("file", file as any);
    forward.append("upload_preset", uploadPreset);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, { method: "POST", body: forward });
    const json = await res.json();
    if (!res.ok) return new Response(JSON.stringify({ error: json?.error?.message ?? "Cloudinary upload failed" }), { status: 502, headers: { "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ path: json.secure_url ?? json.url, raw: json }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Upload failed" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
