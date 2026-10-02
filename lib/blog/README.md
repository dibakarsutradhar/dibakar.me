# Blog

Posts are mdsvex files under `src/lib/blog/posts/`. The filename (minus the extension) is the
slug, so `my-post.svx` is served at `/blog/my-post`. Every post in that folder is picked up
automatically by `getAllPosts()` and prerendered to static HTML.

## Writing a post

```svx
<script context="module">
	export const metadata = {
		title: 'My post',
		category: 'tutorial',
		tags: ['svelte', 'css'],
		headerImage: '/images/blog/cover-my-post.jpg',
		headerImageAlt: 'What the cover shows',
		headerImageCaption: 'Optional caption under the cover.',
		date: '2026-02-01',
		excerpt: 'One or two sentences used on the index page and as the meta description.'
	};
</script>

# My post

Normal markdown from here. Headings, lists, code blocks and tables all work.
```

`headerImage`, `headerImageAlt` and `headerImageCaption` are optional. If `headerImageAlt` is
omitted it falls back to the title.

## Pictures

Put image files in `static/images/blog/` (subfolders are fine) and reference them by URL:

```md
![Alt text describing the image](/images/blog/my-photo.jpg 'Caption shown underneath')
```

That is all you need. At build time the markdown pipeline turns it into a `<figure>` with a
`<figcaption>`, adds `loading="lazy"`, `decoding="async"` and the image's intrinsic width and
height, and wraps it in a link to the full-size file so it can be clicked for a full-screen view.

**After adding or replacing files, regenerate the size manifest** (it also runs automatically
before `dev` and `build`):

```bash
pnpm images        # rewrites src/lib/blog/image-manifest.js; commit the result
```

Local files get their real dimensions from the manifest, which is what stops the page shifting
as images load. Remote URLs still work, they just do not get dimensions.

### Sizing

Add a size hint after the caption, separated by a pipe:

| Markdown                             | Result                                                   |
| ------------------------------------ | -------------------------------------------------------- |
| `![alt](/img.jpg "Caption")`         | Text-column width                                        |
| `![alt](/img.jpg "Caption \| half")` | Narrower, centred                                        |
| `![alt](/img.jpg "Caption \| wide")` | A modest outdent past the text column                    |
| `![alt](/img.jpg "Caption \| full")` | The widest band, for diagrams whose labels need the room |
| `![alt](/img.jpg "\| wide")`         | Size hint without a caption                              |

Outdented figures stay centred on the same axis as the text and never run edge to edge: a
viewport-wide image beside a narrow text column reads as a mistake rather than a design choice, and
it takes over the screen. On screens narrower than the outdent they simply fill the column. Use the
full-screen viewer if a reader needs to inspect detail.

### Galleries

Put two or more images on consecutive lines with **no blank line between them** and they become
a grid of captioned tiles:

```md
![First tile](/images/blog/one.jpg 'First caption')
![Second tile](/images/blog/two.jpg 'Second caption')
```

Two to four images sit side by side, more than that wraps in a two-column grid, and everything
collapses to a single column on small screens. Tiles are never cropped: each one keeps its own
proportions, so wide screenshots stay readable. Blank lines between the images produce separate
full-width figures instead.

### Full-screen viewer

Clicking any figure image (including the post cover) opens it full screen. To get out, do whatever
you would try first: click the picture, click anywhere around it, press `Escape`, or use the × in
the top corner. Arrow keys (or the side arrows) move between the images on the page, and focus
returns to the image you came from.

The trigger is a real `<a href="full-size-file" target="_blank">`. Once the page is interactive the
viewer intercepts the click, so no new tab opens; but a click that lands before the app is ready —
or a browser with JavaScript disabled — opens the image in a new tab instead of replacing the
article, so a slow page never becomes a dead end.

### Alt text and captions

`![alt](…)` is the accessibility text: describe what the image shows, not that it is an image.
The markdown title becomes the visible caption and is removed from the `title` attribute so the
browser does not show a duplicate tooltip.

### Hand-written HTML

Raw HTML inside a post passes through mdsvex untouched. `<figure>` and `<div class="gallery">`
still render and are styled, but they do not get captions, dimensions or the viewer. Prefer the
markdown forms above.

## Search

The index page matches every term you type against the whole post — title, tags, category,
excerpt **and body text** — so a word that only appears in the article still finds it. Terms are
matched in any order and case-insensitively (`security web3` finds the same post as
`web3 security`), and partial words match as you type. Results are ranked so a title or tag match
comes before a match buried in a body, and posts of equal relevance stay in date order.

Each post's body is indexed as plain text (`toPlainText()` in `posts.server.ts`): the frontmatter
script block, markdown markers and image URLs are stripped, code blocks are kept. That text is
about half the size of the source file, and it is sent to the browser as part of the index page's
data. If the blog ever grows past roughly a hundred posts, move it behind a lazily fetched search
index file instead.

## How it is put together

| File                                          | Role                                                                                                                                   |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/blog/posts.server.ts`                | Server-only: reads the post files and builds the search text. The `*.server.` suffix keeps the raw markdown out of the browser bundle  |
| `src/lib/blog/utils.ts`                       | Client-safe helpers: `normalizePostMeta`, `formatDate`, `searchPosts`                                                                  |
| `src/lib/blog/rehype-pictures.js`             | mdsvex rehype plugin (registered in `svelte.config.js`) that rewrites markdown images into figures, galleries and zoom links           |
| `src/lib/blog/image-manifest.js`              | Generated by `scripts/generate-image-manifest.mjs`: intrinsic size of every file in `static/images/blog/`                              |
| `src/lib/components/blog/BlogLightbox.svelte` | Full-screen viewer, mounted once by `src/routes/blog/[slug]/+page.svelte`                                                              |
| `src/lib/blog/blog-images.css`                | Figure, gallery and image styles; imported by `src/routes/blog/+layout.svelte` because mdsvex output is outside Svelte's style scoping |

## Artwork

The covers and diagrams currently in `static/images/blog/` are placeholders generated by
`scripts/generate-blog-art.mjs` (`pnpm images:art`). Replace them with real screenshots or
photos, keeping the filenames, then run `pnpm images` to refresh the manifest.
