import { useUser } from '@clerk/clerk-react'
import { useValue } from 'tldraw'
import { useMaybeApp } from './useAppState'
import { useFeatureFlags } from './useFeatureFlags'

/**
 * Hook that returns whether the current user has active fairy access.
 * Returns true for all logged-in users when the feature flag is enabled.
 */
export function useFairyAccess(): boolean {
	const app = useMaybeApp()
	const { user: clerkUser } = useUser()
	const { flags } = useFeatureFlags()
	return useValue(
		'fairy_access',
		() => {
			if (!flags.fairies.enabled) return false
			if (!app) return false
			const user = app.getUser()
			if (!clerkUser || !user) return false
			// Give all logged-in users fairy access
			return true
		},
		[app, clerkUser, flags.fairies.enabled]
	)
}

/**
 * Hook that returns whether fairies should be visible.
 * For logged-in users, checks fairy access. For guests, just checks the feature flag.
 * This allows guests to see fairies on shared files without requiring login.
 */
export function useShouldShowFairies(): boolean {
	const { flags } = useFeatureFlags()
	return useValue('should_show_fairies', () => flags.fairies.enabled, [flags.fairies.enabled])
}

/**
 * Hook that returns the user's fairy limit.
 * Returns null if the user has no fairy access at all.
 */
export function useFairyLimit(): number | null {
	const app = useMaybeApp()
	return useValue(
		'fairy_limit',
		() => {
			if (!app) return null
			const user = app.getUser()
			return user?.fairyLimit
		},
		[app]
	)
}
