# Fahad B Ali — video editor portfolio

A dark, cinematic Next.js portfolio built for an independent video editor. Phase 1 is intentionally frontend-only: project cards load optimized poster images, and full video sources are requested only after a visitor opens a project and presses play.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Portfolio content

- Brand name, email, public URL, and social links: `src/lib/site.ts`
- Projects: add and manage them from `/admin`
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

Project metadata is stored in MongoDB. Uploaded thumbnails and videos are stored in Cloudinary; MongoDB stores only their secure Cloudinary URLs. Add these server-only values locally and in the hosting provider's environment settings:

```bash
MONGODB_URI=mongodb+srv://DATABASE_USERNAME:DATABASE_PASSWORD@your-cluster.mongodb.net/?appName=your-app
MONGODB_DB=stream
MONGODB_PROJECTS_COLLECTION=projects

CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

Never prefix MongoDB or Cloudinary secrets with `NEXT_PUBLIC_`; those variables are only read on the server. When `MONGODB_URI` is absent during local development, the project store falls back to a temporary local JSON file. Production should always configure MongoDB.

## Quality checks

```bash
npm run lint
npm run build
```
