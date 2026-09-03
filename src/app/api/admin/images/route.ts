import { promises as fs } from "node:fs";
import path from "node:path";

export async function GET() {
  try {
    const imagesDir = path.join(process.cwd(), "public", "images");
    const names = await fs.readdir(imagesDir);
    const images = names.filter((n) => /\.(png|jpe?g|webp|avif|gif)$/i.test(n)).map((n) => `/images/${n}`);
    return new Response(JSON.stringify(images), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify([]), { status: 200, headers: { "Content-Type": "application/json" } });
  }
}
