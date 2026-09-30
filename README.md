# dibakar.me

Personal portfolio site — a fixed-screen hero page and a blog, built with
Next.js (App Router, static export), Tailwind CSS v4, and Bun.

## Stack

- **Next.js 15** — App Router, `output: 'export'` (fully static build in `out/`,
  deployable to GitHub Pages; `out/404.html` is the fallback route).
- **Tailwind CSS v4** — CSS-first config; the theme palette lives in
  `app/globals.css` as CSS variables exposed via `@theme inline`, switched at
  runtime by the `data-theme` attribute on `<html>`.
- **Bun** — package manager and script runner (`bun install`, `bun run dev`).
  Node is required to run the production build (`next build`), since the Next
  CLI does not run under Bun's runtime.

## Commands

```sh
bun install        # install dependencies
bun run dev        # dev server (Turbopack), regenerates the image manifest first
bun run build      # static production build to out/ (requires node on PATH)
bun run images     # regenerate lib/blog/image-manifest.js (intrinsic image sizes)
bun run logos      # regenerate optimized partner logos
bun run images:art # regenerate blog cover/diagram art
```

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

The slug is the file name. Search indexes the whole body (plus weighted
title/tags/category/excerpt matches).
