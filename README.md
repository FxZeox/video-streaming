# Fahad B Ali — video editor portfolio

A dark, cinematic Next.js portfolio built for an independent video editor. Phase 1 is intentionally frontend-only: project cards load optimized poster images, and full video sources are requested only after a visitor opens a project and presses play.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Replace the demo content

- Brand name, email, public URL, and social links: `src/lib/site.ts`
- Projects, thumbnails, source URLs, roles, and tools: `src/data/projects.ts`
- Services, process, and placeholder testimonials: `src/data/content.ts`
- Local images: `public/images`

Set the future media host without changing UI code:

```bash
NEXT_PUBLIC_SITE_URL=https://portfolio.example.com
NEXT_PUBLIC_VIDEO_BASE_URL=https://video.example.com
```

With that setting, `videoAsset("videos/film.mp4")` resolves to `https://video.example.com/videos/film.mp4`. Without it, assets resolve against the local Next.js origin. The included small WebM file is only a functional development preview; it is not portfolio content.

The `sources` array on each project can contain MP4/WebM variants today and can later be adapted for quality selection or HLS without changing cards or page layouts.

## Private project admin

Visit `/admin` directly. The admin area is deliberately absent from public navigation and search metadata. Configure these server-only values in `.env.local` locally and in Vercel Environment Variables when deploying:

```bash
ADMIN_USERNAME=change-me
ADMIN_PASSWORD=use-a-strong-password
ADMIN_SESSION_SECRET=use-a-long-random-secret
```

The temporary dashboard stores edits in `data/admin-projects.json`. This works locally or on a persistent Node server. Vercel's runtime filesystem is ephemeral, so production admin edits on Vercel will require swapping `src/lib/project-store.ts` for a durable database adapter. Authentication and the dashboard UI can remain unchanged.

## Quality checks

```bash
npm run lint
npm run build
```
