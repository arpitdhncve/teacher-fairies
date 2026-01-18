import styles from '../styles/dialog.module.css'

interface SessionActiveDialogProps {
	onClose: () => void
}

/**
 * Dialog shown when user tries to start a new learning session
 * while an active learning session is already running in another tab.
 */
export function SessionActiveDialog({ onClose }: SessionActiveDialogProps) {
	return (
		<div className={styles.overlay} onClick={onClose}>
			<div className={styles.container} onClick={(e) => e.stopPropagation()}>
				{/* Icon */}
				<div className={`${styles.icon} ${styles.iconInfo}`}>📚</div>

				{/* Title */}
				<h2 className={styles.title}>Active Learning Session</h2>

				{/* Description */}
				<p className={styles.description}>
					You're in an active learning session. Please finish or stop the current session
					before starting a new one.
				</p>

				<p className={styles.descriptionMuted}>
					Only one learning session can be active at a time.
				</p>

				{/* Button */}
				<button className={styles.buttonPrimary} onClick={onClose}>
					Got it
				</button>
			</div>
		</div>
	)
}
