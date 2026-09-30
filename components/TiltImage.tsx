'use client';

import { useEffect, useRef, useState } from 'react';

const MAX_TILT_DEG = 8;
const PERSPECTIVE_PX = 900;

/**
 * The hero picture with a pointer-tracked 3D tilt: the image rotates toward
 * the cursor and a soft highlight follows it, giving the static asset some
 * depth. Swapping this for a gif or a real 3D scene later means replacing
 * this component (or just its <img>) — nothing else touches the effect.
 *
 * The tilt is pointer-only by design: it stays off for touch devices and for
 * readers with prefers-reduced-motion, where the image is simply shown.
 */
export default function TiltImage({ src, alt }: { src: string; alt: string }) {
	const frameRef = useRef<HTMLDivElement>(null);
	const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
	const [glow, setGlow] = useState({ x: 50, y: 50, opacity: 0 });
	const [enabled, setEnabled] = useState(false);

	useEffect(() => {
		const motionOk = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		// Fine pointer = mouse/trackpad. Touch screens get the plain image.
		const finePointer = window.matchMedia('(pointer: fine)').matches;
		setEnabled(motionOk && finePointer);
	}, []);

	function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
		const frame = frameRef.current;
		if (!frame || !enabled) return;

		const rect = frame.getBoundingClientRect();
		const px = (event.clientX - rect.left) / rect.width;
		const py = (event.clientY - rect.top) / rect.height;

		setTilt({
			rx: (0.5 - py) * MAX_TILT_DEG,
			ry: (px - 0.5) * MAX_TILT_DEG
		});
		setGlow({ x: px * 100, y: py * 100, opacity: 1 });
	}

	function handlePointerLeave() {
		setTilt({ rx: 0, ry: 0 });
		setGlow((prev) => ({ ...prev, opacity: 0 }));
	}

	return (
		<div
			ref={frameRef}
			onPointerMove={handlePointerMove}
			onPointerLeave={handlePointerLeave}
			className="relative animate-[fadeIn_0.6s_ease-out_both]"
			style={{ perspective: `${PERSPECTIVE_PX}px` }}
		>
			<div
				className="animate-float relative"
				style={{
					transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
					transition: 'transform 0.25s ease-out',
					transformStyle: 'preserve-3d'
				}}
			>
				{/* Rounded frame with a layered shadow so the picture reads as an
				    object floating above the page, not a flat rectangle. */}
				<img
					src={src}
					alt={alt}
					width={480}
					height={480}
					className="h-auto w-[min(60vw,16rem)] rounded-3xl object-cover shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] ring-1 ring-line select-none md:w-[19rem]"
					draggable={false}
				/>
				{/* Pointer-following highlight, masked so it never shows a hard edge. */}
				<div
					aria-hidden="true"
					className="pointer-events-none absolute inset-0 rounded-3xl transition-opacity duration-300"
					style={{
						opacity: glow.opacity,
						background: `radial-gradient(45% 45% at ${glow.x}% ${glow.y}%, rgba(255,255,255,0.22), transparent 100%)`,
						maskImage: 'radial-gradient(closest-side, black 60%, transparent)',
						WebkitMaskImage: 'radial-gradient(closest-side, black 60%, transparent)'
					}}
				/>
			</div>
		</div>
	);
}
