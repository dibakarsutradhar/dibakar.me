'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';

/**
 * Persistent comment section for blog posts.
 *
 * Fully decoupled: the article above renders and hydrates without this
 * component's data. The comments list is fetched lazily — only when the
 * section scrolls near the viewport — and a failed request degrades to an
 * inline retry state; nothing here can block the page.
 *
 * Submissions are gated by a Cloudflare Turnstile widget (loaded from its own
 * script only when this section is on screen) and stored via D1 behind
 * /api/comments on the api.dibakar.me Worker.
 */

interface Comment {
	id: number;
	name: string;
	body: string;
	created_at: string;
}

interface Feedback {
	type: 'success' | 'error';
	text: string;
}

type LoadState = 'idle' | 'loading' | 'error' | 'ready';

// The site key is public by design. Falls back to Turnstile's always-pass
// test key outside production so the flow works locally without .env.local.
const SITE_KEY =
	process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ||
	(process.env.NODE_ENV !== 'production' ? '1x00000000000000000000AA' : '');

// Empty in dev (same-origin `wrangler dev`); set to the Worker URL for
// production builds via .env.production.local.
const API_BASE = process.env.NEXT_PUBLIC_COMMENTS_API_URL ?? '';

interface TurnstileOptions {
	sitekey: string;
	callback: (token: string) => void;
	'expired-callback'?: () => void;
	'error-callback'?: () => void;
	theme?: 'auto' | 'light' | 'dark';
}

declare global {
	interface Window {
		turnstile?: {
			render: (el: HTMLElement, options: TurnstileOptions) => string | undefined;
			reset: (widgetId?: string) => void;
			remove: (widgetId: string) => void;
		};
		onTurnstileLoad?: () => void;
	}
}

function formatCommentDate(value: string): string {
	const date = new Date(value.includes('T') ? value : `${value.replace(' ', 'T')}Z`);
	if (Number.isNaN(date.getTime())) return value;
	return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export default function Comments({ slug }: { slug: string }) {
	const sectionRef = useRef<HTMLElement>(null);
	const turnstileRef = useRef<HTMLDivElement>(null);
	const widgetIdRef = useRef<string | undefined>(undefined);

	const [comments, setComments] = useState<Comment[]>([]);
	const [loadState, setLoadState] = useState<LoadState>('idle');
	const [token, setToken] = useState<string | null>(null);
	const [posting, setPosting] = useState(false);
	const [feedback, setFeedback] = useState<Feedback | null>(null);

	const loadComments = useCallback(async () => {
		setLoadState((state) => (state === 'ready' ? state : 'loading'));
		try {
			const response = await fetch(`${API_BASE}/api/comments?slug=${encodeURIComponent(slug)}`);
			if (!response.ok) throw new Error(`Status ${response.status}`);
			const data = (await response.json()) as { comments?: Comment[] };
			setComments(data.comments ?? []);
			setLoadState('ready');
		} catch {
			setLoadState('error');
		}
	}, [slug]);

	// Defer the fetch until the section is close to the viewport. Posts nobody
	// scrolls to the bottom of never fire a comments request at all.
	useEffect(() => {
		const section = sectionRef.current;
		if (!section) return;

		if (!('IntersectionObserver' in window)) {
			void loadComments();
			return;
		}

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((entry) => entry.isIntersecting)) {
					observer.disconnect();
					void loadComments();
				}
			},
			{ rootMargin: '200px' }
		);
		observer.observe(section);
		return () => observer.disconnect();
	}, [loadComments]);

	// Turnstile widget: explicit-mode render, script loaded only by this
	// component so the rest of the page never touches third-party JS.
	useEffect(() => {
		if (!SITE_KEY) return;
		const container = turnstileRef.current;
		if (!container) return;

		const render = () => {
			if (!window.turnstile || widgetIdRef.current !== undefined) return;
			widgetIdRef.current = window.turnstile.render(container, {
				sitekey: SITE_KEY,
				callback: (value) => setToken(value),
				'expired-callback': () => setToken(null),
				'error-callback': () => setToken(null),
				theme: 'auto'
			});
		};

		if (window.turnstile) {
			render();
		} else {
			window.onTurnstileLoad = render;
			const script = document.createElement('script');
			script.src =
				'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileLoad';
			script.async = true;
			document.head.appendChild(script);
		}

		return () => {
			if (widgetIdRef.current !== undefined) {
				window.turnstile?.remove(widgetIdRef.current);
				widgetIdRef.current = undefined;
			}
		};
	}, []);

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!token || posting) return;

		const form = event.currentTarget;
		const data = new FormData(form);

		setPosting(true);
		setFeedback(null);
		try {
			const response = await fetch(`${API_BASE}/api/comments`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					slug,
					name: data.get('name'),
					email: data.get('email'),
					body: data.get('body'),
					turnstileToken: token
				})
			});

			if (response.status === 201) {
				const result = (await response.json()) as { comment?: Comment };
				if (result.comment) setComments((current) => [result.comment as Comment, ...current]);
				form.reset();
				setFeedback({ type: 'success', text: 'Comment posted.' });
			} else {
				const result = (await response.json().catch(() => null)) as { error?: string } | null;
				setFeedback({
					type: 'error',
					text: result?.error ?? 'Something went wrong. Please try again.'
				});
			}
		} catch {
			setFeedback({ type: 'error', text: "Couldn't reach the server. Please try again." });
		} finally {
			setPosting(false);
			setToken(null);
			if (widgetIdRef.current !== undefined) window.turnstile?.reset(widgetIdRef.current);
		}
	}

	const inputClasses =
		'w-full rounded-lg border border-line-soft bg-bg px-3 py-2 text-sm text-fg placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent';

	return (
		<section ref={sectionRef} aria-label="Comments" className="mx-auto max-w-3xl px-6 pb-16">
			<h2 className="mb-6 border-t border-line-soft pt-8 text-2xl font-bold tracking-tight">
				Comments{' '}
				{loadState === 'ready' && comments.length > 0 && (
					<span className="text-muted">({comments.length})</span>
				)}
			</h2>

			{/* List — loading skeleton, inline retry on failure; the page never
			    waits on or breaks with this. */}
			{loadState === 'idle' || loadState === 'loading' ? (
				<div className="mb-10 space-y-4" aria-hidden="true">
					{[0, 1, 2].map((row) => (
						<div
							key={row}
							className="animate-pulse space-y-2 rounded-lg border border-line-soft p-4"
						>
							<div className="h-3 w-32 rounded bg-hover" />
							<div className="h-3 w-full rounded bg-hover" />
							<div className="h-3 w-2/3 rounded bg-hover" />
						</div>
					))}
				</div>
			) : loadState === 'error' ? (
				<div className="mb-10 flex items-center gap-3 rounded-lg border border-line-soft p-4 text-sm text-muted">
					<span>Couldn&rsquo;t load comments.</span>
					<button
						onClick={() => void loadComments()}
						className="text-accent underline underline-offset-2 hover:opacity-80"
					>
						Retry
					</button>
				</div>
			) : comments.length > 0 ? (
				<ul className="mb-10 space-y-4">
					{comments.map((comment) => (
						<li key={comment.id} className="rounded-lg border border-line-soft p-4">
							<div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
								<span className="font-medium text-fg">{comment.name}</span>
								<time dateTime={comment.created_at} className="text-xs text-muted">
									{formatCommentDate(comment.created_at)}
								</time>
							</div>
							<p className="text-sm whitespace-pre-wrap text-muted">{comment.body}</p>
						</li>
					))}
				</ul>
			) : (
				<p className="mb-10 text-sm text-muted">No comments yet. Be the first to reply.</p>
			)}

			{/* Form */}
			<form onSubmit={handleSubmit} className="space-y-4">
				<div className="grid gap-4 sm:grid-cols-2">
					<div>
						<label htmlFor="comment-name" className="mb-1 block text-sm text-muted">
							Name <span className="text-accent">*</span>
						</label>
						<input
							id="comment-name"
							name="name"
							type="text"
							required
							maxLength={100}
							autoComplete="name"
							placeholder="Your name"
							className={inputClasses}
						/>
					</div>
					<div>
						<label htmlFor="comment-email" className="mb-1 block text-sm text-muted">
							Email <span className="text-xs">(optional, never shown publicly)</span>
						</label>
						<input
							id="comment-email"
							name="email"
							type="email"
							maxLength={200}
							autoComplete="email"
							placeholder="you@example.com"
							className={inputClasses}
						/>
					</div>
				</div>

				<div>
					<label htmlFor="comment-body" className="mb-1 block text-sm text-muted">
						Comment <span className="text-accent">*</span>
					</label>
					<textarea
						id="comment-body"
						name="body"
						required
						maxLength={5000}
						rows={4}
						placeholder="Share your thoughts…"
						className={`${inputClasses} resize-y`}
					/>
				</div>

				{SITE_KEY ? (
					<div ref={turnstileRef} />
				) : (
					<p className="text-sm text-muted">Comments are temporarily unavailable.</p>
				)}

				<div className="flex items-center gap-4">
					<button
						type="submit"
						disabled={!token || posting}
						className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{posting ? 'Posting…' : 'Post comment'}
					</button>
					<p aria-live="polite" className="text-sm" role="status">
						{feedback && (
							<span className={feedback.type === 'success' ? 'text-accent' : 'text-red-500'}>
								{feedback.text}
							</span>
						)}
					</p>
				</div>
			</form>
		</section>
	);
}
