# Deploy

Each tool is its own Vite app and its own Cloudflare Pages project. This repository does not deploy itself.

Asset URLs are relative (`base: './'` in Vite), so a project can be hosted at the site root.

## Mortgage

Root directory: `mortgage`

```bash
cd mortgage
npm ci
npm run build
```

Output directory: `mortgage/dist`

Pages URL: https://fun-mortgage.pages.dev

From the repo root, `npm run build` runs the same install and build.
