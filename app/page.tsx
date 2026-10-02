import type { Metadata } from 'next';
import FloatingNav from '@/components/FloatingNav';
import SocialLinks from '@/components/SocialLinks';
import TiltImage from '@/components/TiltImage';
import { CURRENT_STATUS, SITE_ROLE, SITE_TITLE, SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
	alternates: { canonical: '/' }
};

/** Person schema for search engines, mirroring the visible page content. */
const personJsonLd = {
	'@context': 'https://schema.org',
	'@type': 'Person',
	name: SITE_TITLE,
	jobTitle: SITE_ROLE,
	url: SITE_URL,
	email: 'mailto:iamdibakardipu@gmail.com',
	sameAs: [
		'https://github.com/dibakarsutradhar',
		'https://www.linkedin.com/in/dibakarsutradhar',
		'https://medium.com/@imdibakar'
	]
};

export default function HomePage() {
	return (
		<>
			<FloatingNav />
			<main className="flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 py-24 text-center md:px-8">
				<script
					type="application/ld+json"
					dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
				/>

				{/* Generated from public/images/dino.gif by `bun run dino` — the
				    theme-matched variants carry the night sky; TiltImage adds the
				    pointer 3D tilt and glow on top (pointer devices only). */}
				<TiltImage
					src="/images/dino-light.gif"
					darkSrc="/images/dino-dark.gif"
					alt="Animated pixel dinosaur running through a desert"
				/>

				<h1 className="m-0 mt-6 animate-[fadeIn_0.6s_ease-out_0.15s_both] text-[clamp(1.5rem,5.5vw,3.5rem)] leading-tight font-bold tracking-tight md:mt-10">
					{SITE_TITLE}
				</h1>

				<p className="mt-4 animate-[fadeIn_0.6s_ease-out_0.25s_both] text-base font-medium tracking-wide text-muted md:text-lg">
					{SITE_ROLE}
				</p>

				<div className="mt-5 flex animate-[fadeIn_0.6s_ease-out_0.3s_both] justify-center">
					<a
						href={CURRENT_STATUS.url}
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex items-center gap-2.5 rounded-full px-4 py-1.5 text-sm text-muted glass transition-colors hover:text-fg"
					>
						<span className="relative flex h-2 w-2" aria-hidden="true">
							<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
							<span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
						</span>
						<span>
							{CURRENT_STATUS.prefix}{' '}
							<span className="font-medium text-fg">{CURRENT_STATUS.project}</span>
						</span>
					</a>
				</div>

				<div className="mt-8 flex w-full animate-[fadeIn_0.6s_ease-out_0.35s_both] justify-center md:mt-10">
					<SocialLinks />
				</div>
			</main>
		</>
	);
}
