/** Frontmatter written at the top of a .svx post. */
export interface BlogFrontmatter {
	title: string;
	category: string;
	tags: string[];
	headerImage: string;
	/** Alt text for the cover; defaults to the title when omitted. */
	headerImageAlt?: string;
	/** Optional caption shown under the cover image. */
	headerImageCaption?: string;
	date: string;
	excerpt: string;
	/**
	 * Drafts are visible in `next dev` only — the production build (and
	 * therefore the sitemap and every static route) filters them out.
	 */
	draft?: boolean;
}

/** Frontmatter + derived fields for a post, as used by the blog index. */
export interface BlogMeta {
	slug: string;
	title: string;
	category: string;
	tags: string[];
	/** Cover image URL, normally under /images/blog/. May be empty. */
	headerImage: string;
	headerImageAlt: string;
	headerImageCaption: string;
	date: string;
	excerpt: string;
	/** True while the post is a draft; always false in production builds. */
	draft: boolean;
	/**
	 * The post body as plain text, so search can match words that only appear in
	 * the article itself. Empty on a single post, which does not need it.
	 */
	searchText: string;
}

/** A single post: its metadata plus the rendered body. */
export interface BlogPost extends BlogMeta {
	content: string;
}
