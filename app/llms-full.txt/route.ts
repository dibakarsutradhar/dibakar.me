/**
 * /llms-full.txt — the full-text corpus of the site, in markdown, for LLM
 * ingestion. Companion to /llms.txt (the curated index in public/).
 *
 * Built from the same sources the pages render from — PROJECTS/CLIENTS and the
 * blog posts — so it can never drift from what the site actually shows.
 * Static-exported to out/llms-full.txt, exactly like sitemap.xml.
 */
import { getAllPosts, getPost } from '@/lib/blog/posts';
import { CLIENTS, PROJECTS } from '@/lib/projects';
import { SITE_ROLE, SITE_TITLE, SITE_URL } from '@/lib/site';

export const dynamic = 'force-static';

/** Joins metadata bullet lines, dropping the ones that don't apply. */
function bullets(lines: Array<string | false | undefined>): string {
	return lines.filter(Boolean).join('\n');
}

function projectSection(): string {
	const blocks = CLIENTS.map((client) => {
		const projects = PROJECTS.filter((project) => project.clientId === client.id);
		if (projects.length === 0) return '';

		const entries = projects
			.map((project) => {
				const links = [
					project.href && `[blog write-up](${SITE_URL}${project.href})`,
					...(project.urls ?? []).map((url) => `[${url.label}](${url.href})`)
				].filter(Boolean);

				return [
					`#### ${project.name}`,
					'',
					bullets([
						`- Stack: ${project.stack}`,
						project.period && `- Period: ${project.period}`,
						links.length > 0 && `- Links: ${links.join(', ')}`
					]),
					'',
					project.summary.join('\n\n'),
					'',
					project.details.join('\n\n')
				].join('\n');
			})
			.join('\n\n');

		return [
			`### ${client.name}`,
			'',
			bullets([
				`- Role: ${client.role}`,
				client.location && `- Location: ${client.location}`,
				client.period && `- Period: ${client.period}`
			]),
			'',
			entries
		].join('\n');
	})
		.filter(Boolean)
		.join('\n\n');

	return `## Projects\n\n${blocks}`;
}

function blogSection(): string {
	const blocks = getAllPosts()
		.map((meta) => {
			const post = getPost(meta.slug);
			if (!post) return '';

			return [
				`### ${post.title}`,
				'',
				bullets([
					`- URL: ${SITE_URL}/blog/${post.slug}/`,
					`- Category: ${post.category}`,
					post.tags.length > 0 && `- Tags: ${post.tags.join(', ')}`,
					!!post.date && `- Date: ${post.date}`
				]),
				'',
				post.excerpt,
				'',
				post.content
			].join('\n');
		})
		.filter(Boolean)
		.join('\n\n---\n\n');

	return `## Blog\n\n${blocks}`;
}

export function GET() {
	const body = [
		`# ${SITE_TITLE} — full site corpus`,
		'',
		`> The complete text of ${SITE_URL} — every project and every published blog post, in markdown for LLM ingestion. Companion to ${SITE_URL}/llms.txt.`,
		'',
		`${SITE_TITLE} — ${SITE_ROLE}.`,
		'',
		'---',
		'',
		projectSection(),
		'',
		'---',
		'',
		blogSection(),
		''
	].join('\n');

	return new Response(body, {
		headers: { 'content-type': 'text/plain; charset=utf-8' }
	});
}
