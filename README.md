# dibakar.me

Personal portfolio site — a fixed-screen hero page and a blog, built with
Next.js (App Router, static export), Tailwind CSS v4, and Bun.

## Stack

- **Next.js 15** — App Router, `output: 'export'` (fully static build in `out/`,
  deployable to Cloudflare Pages).
- **Tailwind CSS v4** — CSS-first config; the theme palette lives in
  `app/globals.css` as CSS variables exposed via `@theme inline`, switched at
  runtime by the `data-theme` attribute on `<html>`.
- **Bun** — package manager and script runner (`bun install`, `bun run dev`).
  The production build (`next build`) needs **Node on PATH** — the Next CLI
  crashes under Bun's `node` shim when no real Node exists (`fnm` provides
  it; `~/.zshrc` runs `eval "$(fnm env --use-on-cd)"`).

## Commands

```sh
bun install        # install dependencies
bun run dev        # dev server (Turbopack), regenerates the image manifest first
bun run build      # static production build to out/
bun run images     # regenerate lib/blog/image-manifest.js (intrinsic image sizes)
bun run logos      # regenerate optimized partner logos
bun run images:art # regenerate blog cover/diagram art + the og-card.png
```

## Deploying (Cloudflare Pages)

Static export: point Cloudflare Pages at the repo with build command
`bun run build` and output directory `out`. `out/404.html` serves unknown
routes. Set `NODE_VERSION` in the Pages environment to a current LTS (e.g.
`22`) — the build runs `next` under real Node, never Bun's shim.

## Structure

- `app/` — routes. `/` is the fixed-screen hero; `app/blog/` holds the blog
  index (client-side search + category/tag filters) and post pages.
- `components/` — React components (`TiltImage` wraps the hero picture's 3D
  tilt effect; `components/blog/` has the index filters and the lightbox).
- `lib/blog/` — the blog engine: posts as `.mdx`-named markdown files with
  YAML frontmatter in `lib/blog/posts/`, loaded at build time by `posts.ts`
  (fs + gray-matter) and rendered by `markdown.ts` (unified pipeline with the
  custom `rehype-pictures.js` plugin for figures, galleries, and zoom links).
- `public/` — fonts, images (blog covers, diagrams, logos), favicons,
  `robots.txt`, and the resume PDF.

## Writing a post

Create `lib/blog/posts/<slug>.mdx`:

```md
---
title: My post
category: tutorial
tags: [one, two]
headerImage: /images/blog/cover-my-post.webp
date: 2026-09-30
excerpt: One sentence summary.
---

Body markdown. Images get automatic figures/captions:

![Alt text](/images/blog/my-image.webp "A caption | wide")
```

Add `draft: true` to the frontmatter to keep a post visible while you write
it: drafts render in `bun run dev` (with a "draft" chip on the card and post
page), and are excluded from production builds — the index, the sitemap, and
every static route. Remove the flag to publish.

The slug is the file name. Search indexes the whole body (plus weighted
title/tags/category/excerpt matches).
