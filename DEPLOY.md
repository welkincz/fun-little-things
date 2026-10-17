# Deploy

Deployment happens outside this repo; nothing here publishes a site.

Drum Kit is a Cloudflare Pages project. In that project, set:

| Setting | Value |
| --- | --- |
| Root directory | `drumkit` |
| Build command | `npm ci && npm run build` |
| Build output directory | `dist` |

Vite is configured with `base: './'`, so JS, CSS, images, and sounds are emitted as relative paths and are meant to be served from the site root.

| Tool | Folder | Live URL |
| --- | --- | --- |
| Drum Kit | `drumkit` | https://fun-drumkit.pages.dev |
| Mortgage | `mortgage` | https://charliebuild.com/tools/mortgage/ |

## Mortgage

The mortgage calculator deploys as the Worker `fun-mortgage-site`. That name is separate from the Pages project `fun-mortgage`. From `mortgage/`:

```sh
npm run deploy:worker
```

That runs `npm run build` and then `wrangler deploy`. Config is `mortgage/wrangler.jsonc`. Static files come from `./dist` through the `ASSETS` binding, and the Worker rewrites `/tools/mortgage/…` onto those files. `/tools/mortgage` (no slash) redirects to `/tools/mortgage/`.

The Worker is attached with the zone route `charliebuild.com/tools/mortgage*` and `zone_name` `charliebuild.com`. The zone has to be on the same Cloudflare account as the Worker. A zone route runs in front of the existing `charliebuild` Worker (the Workers Custom Domain on the apex), so this Worker takes only those paths and the rest of charliebuild.com stays where it is. `workers_dev` is off.

`https://fun-mortgage.pages.dev` keeps working until a later change redirects it. This deploy does not add that redirect.

From the repo root, `npm run build` installs and builds every tool the same way.
