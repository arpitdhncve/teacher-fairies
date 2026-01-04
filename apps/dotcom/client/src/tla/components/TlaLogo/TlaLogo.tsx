import classNames from 'classnames'
import { HTMLAttributes } from 'react'
import styles from './logo.module.css'

export function TlaLogo(props: HTMLAttributes<HTMLDivElement>) {
	return (
		<span
			role="img"
			{...props}
			aria-label="DrawIt"
			className={classNames(styles.logo, styles.textLogo, props.className)}
		>
			DrawIt
		</span>
	)
}
