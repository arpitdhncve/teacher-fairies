import { useClerk } from '@clerk/clerk-react'

interface LoginRequiredDialogProps {
	onClose: () => void
}

export function LoginRequiredDialog({ onClose }: LoginRequiredDialogProps) {
	const { client } = useClerk()

	const handleLogin = () => {
		client.signIn.authenticateWithRedirect({
			strategy: 'oauth_google',
			redirectUrl: '/sso-callback',
			redirectUrlComplete: '/course-detail-info?tab=curriculum',
		})
	}

	return (
		<div
			style={{
				position: 'fixed',
				inset: 0,
				background: 'rgba(0, 0, 0, 0.5)',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				zIndex: 9999,
			}}
			onClick={onClose}
		>
			<div
				onClick={(e) => e.stopPropagation()}
				style={{
					background: 'linear-gradient(145deg, #1a1a2e, #16213e)',
					borderRadius: 16,
					padding: 32,
					maxWidth: 400,
					textAlign: 'center',
					boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
					border: '1px solid rgba(255, 255, 255, 0.1)',
				}}
			>
				{/* Warning Icon */}
				<div
					style={{
						fontSize: 48,
						marginBottom: 16,
					}}
				>
					⚠️
				</div>

				{/* Title */}
				<h2
					style={{
						color: '#fff',
						fontSize: 20,
						fontWeight: 600,
						marginBottom: 12,
					}}
				>
					Login Required
				</h2>

				{/* Description */}
				<p
					style={{
						color: 'rgba(255, 255, 255, 0.7)',
						fontSize: 14,
						lineHeight: 1.6,
						marginBottom: 24,
					}}
				>
					Please login to start learning. Your progress will be saved and you can continue from where you left off.
				</p>

				{/* Buttons */}
				<div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
					<button
						onClick={onClose}
						style={{
							padding: '10px 20px',
							borderRadius: 8,
							background: 'transparent',
							color: 'rgba(255, 255, 255, 0.7)',
							border: '1px solid rgba(255, 255, 255, 0.2)',
							cursor: 'pointer',
							fontSize: 14,
							fontWeight: 500,
							transition: 'all 0.2s ease',
						}}
					>
						Cancel
					</button>
					<button
						onClick={handleLogin}
						style={{
							padding: '10px 24px',
							borderRadius: 8,
							background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
							color: '#fff',
							border: 'none',
							cursor: 'pointer',
							fontSize: 14,
							fontWeight: 600,
							boxShadow: '0 4px 14px rgba(124, 58, 237, 0.4)',
							transition: 'all 0.2s ease',
						}}
					>
						Login with Google
					</button>
				</div>
			</div>
		</div>
	)
}
