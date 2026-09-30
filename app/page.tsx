import type { Metadata } from 'next';
import SocialLinks from '@/components/SocialLinks';
import TiltImage from '@/components/TiltImage';
import { SITE_ROLE, SITE_TITLE, SITE_URL } from '@/lib/site';

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
		<main className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden px-8 text-center">
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
			/>

			{/* Swap /images/profile.svg for your gif or 3D asset when ready — the
			    tilt effect in TiltImage wraps whatever image lives here. */}
			<TiltImage src="/images/profile.svg" alt={`Portrait of ${SITE_TITLE}`} />

			<h1 className="animate-[fadeIn_0.6s_ease-out_0.15s_both] mt-10 m-0 text-[clamp(1.5rem,5.5vw,3.5rem)] leading-tight font-bold tracking-tight">
				<span className="text-gradient bg-gradient-to-r from-fg via-accent to-fg">
					dibakar sutra dhar
				</span>
			</h1>

			<p className="animate-[fadeIn_0.6s_ease-out_0.25s_both] mt-4 text-base font-medium tracking-wide text-muted md:text-lg">
				{SITE_ROLE}
			</p>

			<div className="animate-[fadeIn_0.6s_ease-out_0.35s_both] mt-8 flex justify-center">
				<SocialLinks />
			</div>
		</main>
	);
}
