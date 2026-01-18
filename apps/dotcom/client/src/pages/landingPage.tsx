import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth, useClerk, useUser } from '@clerk/clerk-react'
import { getAnonymousUserId } from '../utils/anonymousUserId'
import { listenForLogin, broadcastUserLoggedIn } from '../utils/learningSessionChannel'


// Import header styles from course-detail-info
import headerStyles from './styles/course-header.module.css'
import './styles/course-variables.module.css'
import styles from './landingPage.module.css'

// Permission states
type MicPermissionState = 'checking' | 'granted' | 'prompt' | 'denied'

// LocalStorage key for auto-start after reload
const MIC_PERMISSION_GRANTED_KEY = 'mic_permission_granted_for_session'

/**
 * Landing page for non-logged-in users.
 * Shows a centered "Understand the curriculum by talking to teacher" heading
 * with a "Talk to Teacher" button that starts the learning session.
 * Handles microphone permission flow before starting the session.
 */
export function Component() {
	const navigate = useNavigate()
	const { client } = useClerk()
	const { isSignedIn, userId } = useAuth()
	const { user } = useUser()
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	// Microphone permission state
	const [micPermission, setMicPermission] = useState<MicPermissionState>('checking')
	const [showPermissionUI, setShowPermissionUI] = useState(false)
	const [requestingPermission, setRequestingPermission] = useState(false)

	// Check microphone permission on mount
	useEffect(() => {
		const checkMicPermission = async () => {
			try {
				// Use Permissions API to check microphone status
				const result = await navigator.permissions.query({ name: 'microphone' as PermissionName })
				setMicPermission(result.state as MicPermissionState)

				// Listen for permission changes
				result.onchange = () => {
					setMicPermission(result.state as MicPermissionState)
				}
			} catch (err) {
				// Permissions API not supported, assume we need to prompt
				console.log('[LandingPage] Permissions API not supported, will prompt on click')
				setMicPermission('prompt')
			}
		}

		checkMicPermission()
	}, [])

	// Auto-start session after permission grant and reload
	useEffect(() => {
		const shouldAutoStart = localStorage.getItem(MIC_PERMISSION_GRANTED_KEY)
		if (shouldAutoStart === 'true' && micPermission === 'granted') {
			// Clear the flag
			localStorage.removeItem(MIC_PERMISSION_GRANTED_KEY)
			// Auto-trigger the learning session
			console.log('[LandingPage] Auto-starting session after permission grant')
			handleTalkToTeacher()
		}
	}, [micPermission])

	// If user is already signed in, redirect to course details
	useEffect(() => {
		if (isSignedIn) {
			navigate('/course-detail-info?tab=curriculum', { replace: true })
		}
	}, [isSignedIn, navigate])

	// Listen for cross-tab login
	useEffect(() => {
		const cleanup = listenForLogin(() => {
			console.log('[LandingPage] Detected login from another tab, redirecting...')
			navigate('/course-detail-info?tab=curriculum', { replace: true })
		})
		return cleanup
	}, [navigate])

	const startLearningSession = useCallback(async () => {
		setError(null)
		setLoading(true)

		try {
			// Get or create the anonymous user ID from localStorage
			const anonymousId = getAnonymousUserId()

			// Ensure the file exists on the server
			const createFileResponse = await fetch('/api/app/anonymous/create-file', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ fileId: anonymousId }),
			})

			if (!createFileResponse.ok) {
				const data = await createFileResponse.json().catch(() => ({}))
				throw new Error(data.message || 'Failed to create file')
			}

			// Set flag to auto-start learning session on the AI tutor page
			localStorage.setItem('auto_start_learning', 'true')

			// Navigate to the AI tutor page - ChatPanel will auto-trigger start-learning
			navigate(`/f/${anonymousId}`, { replace: true })
		} catch (err) {
			console.error('Error starting learning session:', err)
			setError('Failed to start learning session. Please try again.')
		} finally {
			setLoading(false)
		}
	}, [navigate])

	const handleTalkToTeacher = useCallback(async () => {
		// Check if we need to request permission first
		if (micPermission !== 'granted') {
			// Show permission UI overlay
			setShowPermissionUI(true)
			return
		}

		// Permission is granted, start the session
		await startLearningSession()
	}, [micPermission, startLearningSession])

	const handleRequestPermission = useCallback(async () => {
		setRequestingPermission(true)
		setError(null)

		try {
			// Request microphone access - this triggers the browser's native permission dialog
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
			
			// Permission granted! Stop the stream immediately (we just needed the permission)
			stream.getTracks().forEach(track => track.stop())

			// Store flag to auto-start after reload
			localStorage.setItem(MIC_PERMISSION_GRANTED_KEY, 'true')

			// Reload the page to ensure clean state
			window.location.reload()
		} catch (err: any) {
			console.error('[LandingPage] Permission request failed:', err)
			
			if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
				setMicPermission('denied')
				setError('Microphone access was denied. Please enable it in your browser settings.')
			} else {
				setError('Could not access microphone. Please check your device settings.')
			}
		} finally {
			setRequestingPermission(false)
		}
	}, [])

	const openLoginDialog = () => {
		broadcastUserLoggedIn()
		client.signIn.authenticateWithRedirect({
			strategy: 'oauth_google',
			redirectUrl: '/sso-callback',
			redirectUrlComplete: '/course-detail-info?tab=curriculum',
		})
	}

	return (
		<div className={styles.page}>
			{/* Header - reused from course-detail-info */}
			<header className={`${headerStyles.header} ${headerStyles.glassEffect}`}>
				<div className={headerStyles.container}>
					{/* Left - Logo */}
					<div className={headerStyles.navGroup}>
						<Link to="/" className={headerStyles.logo}>
							Eazit
						</Link>
					</div>

					{/* Right - CTA */}
					<div className={headerStyles.ctaGroup}>
						<div className={headerStyles.spotlightBadge} onClick={openLoginDialog}>
							<GoogleIcon className={headerStyles.sparkleIcon} /> Enroll Now
						</div>
					</div>
				</div>
			</header>

			{/* Main Content */}
			<main className={styles.main}>
				<div className={styles.content}>

					<h1 className={styles.heading}>
						Meet the AI Teacher Who Explains System Design Visually
					</h1>
					<button
						className={styles.talkButton}
						onClick={handleTalkToTeacher}
						disabled={loading}
					>
						{loading ? (
							<>
								<div className={styles.loadingSpinner} />
								Starting...
							</>
						) : (
							<>
								<MicIcon className={styles.buttonIcon} />
								Talk to AI Teacher
							</>
						)}
					</button>
					{error && (
						<p style={{ color: '#ef4444', marginTop: 16, fontSize: 14 }}>
							{error}
						</p>
					)}
				</div>
			</main>

			{/* Permission UI Overlay */}
			{showPermissionUI && (
				<div className={styles.permissionOverlay}>
					<div className={styles.permissionModal}>
						<div className={styles.permissionIcon}>
							<MicIconLarge />
						</div>
						
						{micPermission === 'denied' ? (
							<>
								<h2 className={styles.permissionTitle}>Microphone is blocked</h2>
								<p className={styles.permissionDescription}>
									Please enable microphone access in your browser to continue.
								</p>
								<button
									className={styles.permissionButton}
									onClick={() => window.location.reload()}
								>
									Refresh Page
								</button>
							</>
						) : (
							<>
								<h2 className={styles.permissionTitle}>Enable microphone to speak</h2>
								<p className={styles.permissionDescription}>
									This lets you ask questions out loud and interact with your AI tutor in real time.
								</p>
								<button
									className={styles.permissionButton}
									onClick={handleRequestPermission}
									disabled={requestingPermission}
								>
									{requestingPermission ? (
										<>
											<div className={styles.loadingSpinner} />
											Requesting...
										</>
									) : (
										'Give Permission'
									)}
								</button>
							</>
						)}
						
						<button
							className={styles.permissionClose}
							onClick={() => setShowPermissionUI(false)}
						>
							Cancel
						</button>
					</div>
				</div>
			)}
		</div>
	)
}




function GoogleIcon({ className }: { className?: string }) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			width="1em"
			height="1em"
			className={className}
			style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '8px' }}
		>
			<g fill="none" fillRule="evenodd">
				<path
					d="M20.64 12.2c0-.63-.06-1.25-.16-1.84H12v3.49h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.92c1.71-1.58 2.68-3.9 2.68-6.62z"
					fill="#4285F4"
				/>
				<path
					d="M12 21c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.85.86-3.05.86-2.34 0-4.32-1.58-5.03-3.71H3.85v2.33C5.33 18.97 8.48 21 12 21z"
					fill="#34A853"
				/>
				<path
					d="M6.97 13.71a5.17 5.17 0 0 1-.09-1.71c0-.59.1-1.18.28-1.71V7.96H3.85a9.2 9.2 0 0 0 0 8.08l3.12-2.33z"
					fill="#FBBC05"
				/>
				<path
					d="M12 5.38c1.32 0 2.5.45 3.44 1.35l2.58-2.59A9 9 0 0 0 3.85 7.96l3.12 2.33C7.68 7.94 9.66 6.36 12 5.38z"
					fill="#EA4335"
				/>
			</g>
		</svg>
	)
}

function MicIcon({ className }: { className?: string }) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="currentColor"
			className={className}
		>
			<path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
			<path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
		</svg>
	)
}

function MicIconLarge() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="currentColor"
			width="48"
			height="48"
		>
			<path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
			<path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
		</svg>
	)
}
