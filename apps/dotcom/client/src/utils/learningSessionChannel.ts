/**
 * Learning Session Channel
 * 
 * Cross-tab communication for enforcing single learnspace using BroadcastChannel API.
 * - Check if a learnspace exists and if it's actively learning
 * - Navigate existing learnspace to new content
 */

const CHANNEL_NAME = 'learning_session_channel'

// Generate a unique tab ID
const TAB_ID = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

// Message types
type CheckSessionMessage = { type: 'check_session'; requestId: string }
type SessionStatusMessage = { type: 'session_status'; isLearning: boolean; tabId: string; requestId: string }
type NavigateMessage = { type: 'navigate_to'; createSource: string; url: string }

type ChannelMessage = CheckSessionMessage | SessionStatusMessage | NavigateMessage

/**
 * Check if a learnspace tab exists and whether it's actively learning
 */
export function checkLearnspaceStatus(): Promise<{ exists: boolean; isLearning: boolean }> {
	return new Promise((resolve) => {
		const channel = new BroadcastChannel(CHANNEL_NAME)
		const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
		let responded = false

		channel.onmessage = (event: MessageEvent<ChannelMessage>) => {
			if (event.data.type === 'session_status' && event.data.requestId === requestId) {
				responded = true
				channel.close()
				resolve({ exists: true, isLearning: event.data.isLearning })
			}
		}

		// Ask all tabs if they have a learnspace open
		channel.postMessage({ type: 'check_session', requestId } as CheckSessionMessage)

		// Timeout - if no response in 150ms, no learnspace exists
		setTimeout(() => {
			if (!responded) {
				channel.close()
				resolve({ exists: false, isLearning: false })
			}
		}, 150)
	})
}

/**
 * Send navigation request to existing learnspace tab
 */
export function navigateLearnspace(createSource: string, url: string): void {
	const channel = new BroadcastChannel(CHANNEL_NAME)
	channel.postMessage({ type: 'navigate_to', createSource, url } as NavigateMessage)
	// Close after a brief delay to ensure message is sent
	setTimeout(() => channel.close(), 50)
}

/**
 * Create a listener for the learnspace tab to respond to check requests and navigation
 */
export function createLearnspaceListener(callbacks: {
	isLearning: () => boolean
	onNavigate: (createSource: string, url: string) => void
}): () => void {
	const channel = new BroadcastChannel(CHANNEL_NAME)

	channel.onmessage = (event: MessageEvent<ChannelMessage>) => {
		const data = event.data

		if (data.type === 'check_session') {
			// Respond with our status
			channel.postMessage({
				type: 'session_status',
				isLearning: callbacks.isLearning(),
				tabId: TAB_ID,
				requestId: data.requestId,
			} as SessionStatusMessage)
		}

		if (data.type === 'navigate_to') {
			// Only navigate if not actively learning
			if (!callbacks.isLearning()) {
				callbacks.onNavigate(data.createSource, data.url)
				// Focus this tab so user sees the change
				window.focus()
			}
		}
	}

	// Return cleanup function
	return () => {
		channel.close()
	}
}
