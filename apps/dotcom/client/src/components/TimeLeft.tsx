import React from 'react'
import styles from '../pages/styles/course-pricing.module.css'

export const TimeLeft = () => {
	return (
		<div className={styles.timeLeftContainer}>
			<div className={styles.timeLeftLabel}>Time left</div>
			<div className={styles.timeLeftValue}>60 mins</div>
			<div className={styles.timeLeftSubtext}>of AI tutor</div>
		</div>
	)
}
