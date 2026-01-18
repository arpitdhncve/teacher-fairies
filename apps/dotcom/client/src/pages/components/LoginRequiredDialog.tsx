import { useClerk } from '@clerk/clerk-react'
import { broadcastUserLoggedIn } from '../../utils/learningSessionChannel'
import styles from '../styles/dialog.module.css'

interface LoginRequiredDialogProps {
	onClose: () => void
}

export function LoginRequiredDialog({ onClose }: LoginRequiredDialogProps) {
	const { client } = useClerk()

	const handleLogin = () => {
		broadcastUserLoggedIn()
		client.signIn.authenticateWithRedirect({
			strategy: 'oauth_google',
			redirectUrl: '/sso-callback',
			redirectUrlComplete: '/course-detail-info?tab=curriculum',
		})
	}

	return (
		<div className={styles.overlay} onClick={onClose}>
			<div className={styles.container} onClick={(e) => e.stopPropagation()}>
				{/* Icon */}
				<div className={`${styles.icon} ${styles.iconWarning}`}>🔒</div>

				{/* Title */}
				<h2 className={styles.title}>Login Required</h2>

				{/* Description */}
				<p className={styles.description}>
					Please login to start learning. Your progress will be saved and you can continue
					from where you left off.
				</p>

				{/* Buttons */}
				<div className={styles.buttonGroup}>
					<button className={styles.buttonSecondary} onClick={onClose}>
						Cancel
					</button>
					<button className={styles.buttonSpotlight} onClick={handleLogin}>
						<GoogleIcon />
						Enroll Now
					</button>
				</div>
			</div>
		</div>
	)
}

function GoogleIcon() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			width="16"
			height="16"
			style={{ display: 'inline-block', verticalAlign: 'middle' }}
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
