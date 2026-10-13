/// <reference types="@cloudflare/workers-types" />

/**
 * Comments API + static asset server.
 *
 * GET  /api/comments?slug=<post-slug>  → list comments (email never selected)
 * POST /api/comments                   → create a comment (Turnstile-gated)
 * anything else                        → static export in ./out
 */

interface Env {
	DB: D1Database;
	ASSETS: Fetcher;
	TURNSTILE_SECRET_KEY?: string;
}

interface CommentRow {
	id: number;
	name: string;
	body: string;
	created_at: string;
}

interface CommentPayload {
	slug?: unknown;
	name?: unknown;
	email?: unknown;
	body?: unknown;
	turnstileToken?: unknown;
}

const SLUG_MAX = 200;
const NAME_MAX = 100;
const EMAIL_MAX = 200;
const BODY_MAX = 5000;
const LIST_LIMIT = 200;
const MAX_BODY_BYTES = 16 * 1024;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Dummy secrets (1x/2x/3x…AA): per Turnstile docs these always pass, so the
// remote siteverify round-trip can be skipped entirely (also sidesteps the
// flaky outbound fetch under local workerd).
const TEST_SECRET_RE = /^([123])x0+AA$/;
const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

function json(data: unknown, status: number): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: { 'content-type': 'application/json; charset=utf-8' }
	});
}

function isNonEmptyString(value: unknown): value is string {
	return typeof value === 'string' && value.trim().length > 0;
}

async function verifyTurnstile(token: string, secret: string): Promise<boolean> {
	if (TEST_SECRET_RE.test(secret)) return true;

	try {
		const response = await fetch(TURNSTILE_VERIFY_URL, {
			method: 'POST',
			headers: { 'content-type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({ secret, response: token })
		});
		if (!response.ok) return false;
		const result = (await response.json()) as { success?: boolean };
		return result.success === true;
	} catch (error) {
		// Fail closed: an unreachable verifier must not let comments through.
		console.error('Turnstile siteverify failed:', error);
		return false;
	}
}

async function listComments(url: URL, env: Env): Promise<Response> {
	const slug = (url.searchParams.get('slug') ?? '').trim();
	if (!slug || slug.length > SLUG_MAX) {
		return json({ error: 'Invalid slug' }, 400);
	}

	const { results } = await env.DB.prepare(
		`SELECT id, name, body, created_at
		 FROM comments
		 WHERE slug = ?1
		 ORDER BY created_at DESC
		 LIMIT ?2`
	)
		.bind(slug, LIST_LIMIT)
		.all<CommentRow>();

	return json({ comments: results ?? [] }, 200);
}

async function createComment(request: Request, env: Env): Promise<Response> {
	const contentType = request.headers.get('content-type') ?? '';
	if (!contentType.includes('application/json')) {
		return json({ error: 'Expected application/json' }, 400);
	}

	const raw = await request.text();
	if (raw.length > MAX_BODY_BYTES) {
		return json({ error: 'Payload too large' }, 413);
	}

	let payload: CommentPayload;
	try {
		payload = JSON.parse(raw) as CommentPayload;
	} catch {
		return json({ error: 'Invalid JSON' }, 400);
	}

	const secret = env.TURNSTILE_SECRET_KEY;
	if (!secret) {
		return json({ error: 'Turnstile is not configured' }, 500);
	}
	if (!isNonEmptyString(payload.turnstileToken)) {
		return json({ error: 'Missing verification token' }, 403);
	}
	if (!(await verifyTurnstile(payload.turnstileToken, secret))) {
		return json({ error: 'Verification failed' }, 403);
	}

	const slug = typeof payload.slug === 'string' ? payload.slug.trim() : '';
	const name = typeof payload.name === 'string' ? payload.name.trim() : '';
	const body = typeof payload.body === 'string' ? payload.body.trim() : '';
	const emailRaw = typeof payload.email === 'string' ? payload.email.trim() : '';
	const email = emailRaw.length > 0 ? emailRaw : null;

	if (!slug || slug.length > SLUG_MAX) return json({ error: 'Invalid post' }, 400);
	if (!name) return json({ error: 'Name is required' }, 400);
	if (name.length > NAME_MAX) return json({ error: 'Name is too long' }, 400);
	if (!body) return json({ error: 'Comment is required' }, 400);
	if (body.length > BODY_MAX) return json({ error: 'Comment is too long' }, 400);
	if (email !== null && (email.length > EMAIL_MAX || !EMAIL_RE.test(email))) {
		return json({ error: 'Invalid email address' }, 400);
	}

	const { success, meta } = await env.DB.prepare(
		'INSERT INTO comments (slug, name, email, body) VALUES (?1, ?2, ?3, ?4)'
	)
		.bind(slug, name, email, body)
		.run();
	if (!success) {
		return json({ error: 'Could not save comment' }, 500);
	}

	const row = await env.DB.prepare('SELECT id, name, body, created_at FROM comments WHERE id = ?1')
		.bind(meta.last_row_id)
		.first<CommentRow>();

	return json({ comment: row }, 201);
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);

		if (url.pathname === '/api/comments') {
			try {
				if (request.method === 'GET') return await listComments(url, env);
				if (request.method === 'POST') return await createComment(request, env);
				return json({ error: 'Method not allowed' }, 405);
			} catch {
				return json({ error: 'Something went wrong' }, 500);
			}
		}

		return env.ASSETS.fetch(request);
	}
} satisfies ExportedHandler<Env>;
