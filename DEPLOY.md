# Deploy

Each tool is its own Cloudflare Pages project. Deployment happens outside this repo; nothing here publishes a site.

In the Pages project for a tool, set:

| Setting | Value |
| --- | --- |
| Root directory | the tool folder, such as `tindog` or `drumkit` |
| Build command | `npm ci && npm run build` |
| Build output directory | `dist` |

Vite is configured with `base: './'`, so JS, CSS, images, and sounds are emitted as relative paths and are meant to be served from the site root.

| Tool | Folder | Live URL |
| --- | --- | --- |
| TinDog | `tindog` | https://fun-tindog.pages.dev |
| Drum Kit | `drumkit` | https://fun-drumkit.pages.dev |

From the repo root, `npm run build` installs and builds every tool the same way.
