import NavMenu from '@/components/NavMenu';
import ThemeToggle from '@/components/ThemeToggle';

/**
 * Floating top-right cluster used on every page. Mobile keeps the theme
 * toggle left of the hamburger; from `sm` up the nav links come first with
 * the toggle at the far right (via flex order).
 */
export default function FloatingNav() {
	return (
		<div className="fixed top-5 right-5 z-50 flex items-center gap-3 sm:gap-5">
			<div className="order-1 sm:order-2">
				<ThemeToggle />
			</div>
			<div className="order-2 sm:order-1">
				<NavMenu />
			</div>
		</div>
	);
}
