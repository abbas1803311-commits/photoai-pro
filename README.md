# PhotoAI Pro

A responsive, dark-themed web app for restoring old photos and enhancing/upscaling images to 4K, built with plain HTML/CSS/JS on the frontend and Vercel serverless functions on the backend.

## Project structure

```
photoai-pro/
├── api/
│   ├── restore.js       Serverless function — "Restore Old Photo" (Replicate: GFPGAN)
│   └── enhance.js        Serverless function — "Enhance & Upscale to 4K" (Replicate: Real-ESRGAN)
├── public/
│   ├── index.html         Single-page app: hero, upload studio, how-it-works, FAQ
│   ├── css/
│   │   └── style.css      Dark UI, responsive layout, before/after slider styles
│   ├── js/
│   │   └── app.js         Upload handling, drag-and-drop, comparison slider, API calls
│   └── assets/            (optional — put any static images/icons here)
├── package.json
├── vercel.json             Routes /api/* to serverless functions, everything else to /public
├── .env.example
└── .gitignore
```

## Features

- Premium dark UI (Fraunces + Inter + Space Mono, amber/cyan accent palette)
- Drag-and-drop or click-to-browse image upload (JPG/PNG/WEBP, up to 12MB)
- Two AI modes: **Restore Old Photo** and **Enhance & Upscale to 4K**
- Interactive drag-to-compare before/after slider, both in the hero demo and on your own upload
- Download button for the processed result
- Fully responsive, down to small mobile screens
- Keyboard-accessible comparison slider (arrow keys) and visible focus states
- Respects `prefers-reduced-motion`

## How the AI processing works

The two serverless functions in `/api` call [Replicate](https://replicate.com)-hosted models:

| Mode | Model | What it does |
|---|---|---|
| Restore Old Photo | `tencentarc/gfpgan` | Repairs scratches, fading, and damage; rebuilds facial detail |
| Enhance & Upscale to 4K | `nightmareai/real-esrgan` | General-purpose super-resolution upscaling |

You can swap in any other Replicate model (or a different provider entirely, like Stability AI or your own hosted model) by changing the `MODEL_VERSION` and `input` fields in `api/restore.js` / `api/enhance.js` — the rest of the app (upload, slider, download) doesn't need to change.

## Local development

1. Install the Vercel CLI if you don't have it:
   ```bash
   npm install -g vercel
   ```
2. Copy the environment example and add your Replicate API token:
   ```bash
   cp .env.example .env
   ```
3. Run the dev server (serves both the static site and the serverless functions):
   ```bash
   vercel dev
   ```
4. Open `http://localhost:3000`.

## Deploying to Vercel

1. Push this project to a GitHub/GitLab/Bitbucket repo, or run `vercel` from this folder to deploy directly.
2. In your Vercel project settings, add an environment variable:
   - `REPLICATE_API_TOKEN` — your API token from https://replicate.com/account/api-tokens
3. Deploy:
   ```bash
   vercel --prod
   ```

That's it — no build step is required; `public/` is served statically and `api/` runs as Node serverless functions.

## Notes

- Replace the two placeholder hero images in `public/index.html` (`compare-before` / `compare-after`) with your own before/after example if you'd like a custom demo image instead of the stock photo used for illustration.
- The functions currently return JPEG output as a base64 data URI directly in the JSON response, which keeps the frontend simple. For very large 4K outputs you may want to instead upload the result to storage (e.g. Vercel Blob or S3) and return a URL, to stay comfortably under serverless response size limits.
- Replicate free/trial usage has rate limits; for production traffic, set a billing method on your Replicate account.
