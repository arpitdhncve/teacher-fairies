import { uniqueId } from 'tldraw'

const ANONYMOUS_USER_ID_KEY = 'tldraw_anonymous_user_id'

/**
 * Get or create a persistent anonymous user ID.
 * This ID is used for:
 * - File identification (as the fileSlug)
 * - start-learning API (as the userId)
 * - Any other user identification needs
 */
export function getAnonymousUserId(): string {
	// Check localStorage first
	let userId = localStorage.getItem(ANONYMOUS_USER_ID_KEY)

	if (!userId) {
		// Generate a new unique ID
		userId = uniqueId(21)
		localStorage.setItem(ANONYMOUS_USER_ID_KEY, userId)
	}

	return userId
}

/**
 * Clear the anonymous user ID (useful for testing or "new session")
 */
export function clearAnonymousUserId(): void {
	localStorage.removeItem(ANONYMOUS_USER_ID_KEY)
}
