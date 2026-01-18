interface DesktopRequiredDialogProps {
	onClose: () => void
}

/**
 * Dialog shown when mobile users try to access learning content
 * that requires a desktop experience.
 */
export function DesktopRequiredDialog({ onClose }: DesktopRequiredDialogProps) {
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
				{/* Icon */}
				<div style={{ fontSize: 48, marginBottom: 16 }}>🖥️</div>

				{/* Title */}
				<h2
					style={{
						color: '#fff',
						fontSize: 20,
						fontWeight: 600,
						marginBottom: 12,
					}}
				>
					Desktop Experience Required
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
					This learning experience uses an interactive canvas that works best on desktop.
					Please open this page on a desktop or laptop to continue.
				</p>

				{/* Button */}
				<button
					onClick={onClose}
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
					Close
				</button>
			</div>
		</div>
	)
}
