import styles from '../styles/dialog.module.css'

interface DesktopRequiredDialogProps {
	onClose: () => void
}

/**
 * Dialog shown when mobile users try to access learning content
 * that requires a desktop experience.
 */
export function DesktopRequiredDialog({ onClose }: DesktopRequiredDialogProps) {
	return (
		<div className={styles.overlay} onClick={onClose}>
			<div className={styles.container} onClick={(e) => e.stopPropagation()}>
				{/* Icon */}
				<div className={styles.icon}>🖥️</div>

				{/* Title */}
				<h2 className={styles.title}>Desktop Experience Required</h2>

				{/* Description */}
				<p className={styles.description}>
					This learning experience uses an interactive canvas that works best on desktop.
					Please open this page on a desktop or laptop to continue.
				</p>

				{/* Button */}
				<button className={styles.buttonPrimary} onClick={onClose}>
					Got it
				</button>
			</div>
		</div>
	)
}
