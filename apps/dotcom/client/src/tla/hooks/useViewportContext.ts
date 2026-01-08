import { useMemo } from 'react'
import { PORTRAIT_BREAKPOINT, useBreakpoint } from 'tldraw'

/**
 * Viewport context information for responsive behavior
 * Follows Single Responsibility Principle - handles only viewport detection
 */
export interface ViewportContext {
	/** Whether the current viewport is mobile-sized */
	isMobile: boolean
	/** Whether the canvas is visible (hidden on mobile) */
	isCanvasVisible: boolean
	/** Device type descriptor for API context */
	deviceType: 'mobile' | 'desktop'
	/** Raw breakpoint value from tldraw */
	breakpoint: number
}

/**
 * Custom hook for viewport detection and context
 * Provides a clean abstraction over raw breakpoint checks
 *
 * Uses tldraw's existing breakpoint system for consistency with the rest of the app
 */
export function useViewportContext(): ViewportContext {
	const breakpoint = useBreakpoint()

	return useMemo(() => {
		// Mobile is defined as anything below TABLET_SM breakpoint
		// This matches the pattern used in FairyHUD.tsx and other components
		const isMobile = breakpoint < PORTRAIT_BREAKPOINT.TABLET_SM

		return {
			isMobile,
			// Canvas is not visible on mobile - users only see the chat
			isCanvasVisible: !isMobile,
			deviceType: isMobile ? 'mobile' : 'desktop',
			breakpoint,
		}
	}, [breakpoint])
}

/**
 * Standalone function for viewport check (for use outside React components)
 * Uses window.innerWidth directly instead of the hook
 */
export function getIsMobileViewport(): boolean {
	if (typeof window === 'undefined') return false
	// TABLET_SM breakpoint is typically 580px in tldraw
	return window.innerWidth < 580
}
