import { useClerk } from '@clerk/clerk-react'
import { useNavigate } from 'react-router-dom'
import { routes } from '../../routeDefs'
import { useApp } from '../hooks/useAppState'
import styles from './home.module.css'

// Course sections available
const COURSES = [
	{
		id: 'bloom-filter',
		title: 'System Design Bloom Filter',
		description:
			'Learn about probabilistic data structures and their applications in system design',
		icon: '🎯',
	},
	// Add more courses here as needed
]

export function Component() {
	const app = useApp()
	const navigate = useNavigate()
	const clerk = useClerk()
	const user = app.getUser()

	const handleCourseClick = async (courseId: string) => {
		const course = COURSES.find((c) => c.id === courseId)
		const result = await app.createFile({
			name: course?.title ?? 'New Learning Session',
		})
		if (result.ok) {
			navigate(routes.tlaFile(result.value.fileId))
		}
	}

	const handleSignOut = () => {
		clerk.signOut()
	}

	return (
		<div className={styles.homeContainer}>
			{/* Header with Logo and User Profile */}
			<header className={styles.header}>
				<a href="/" className={styles.logo}>
					<span className={styles.logoIcon}>✏️</span>
					<span>DrawIt</span>
				</a>

				{/* User Profile Section */}
				<div className={styles.userProfile}>
					{user.avatar && <img src={user.avatar} alt={user.name} className={styles.avatar} />}
					<span className={styles.userName}>{user.name}</span>
					<button onClick={handleSignOut} className={styles.signOutBtn}>
						Sign Out
					</button>
				</div>
			</header>

			{/* Main Content */}
			<main className={styles.main}>
				{/* Personalized Greeting */}
				<div className={styles.greeting}>
					<h1 className={styles.title}>
						Welcome back, <span className={styles.highlight}>{user.name.split(' ')[0]}</span>! 👋
					</h1>
					<p className={styles.subtitle}>
						Choose a topic below to start your interactive learning session
					</p>
				</div>

				{/* Course Cards Grid */}
				<div className={styles.coursesGrid}>
					{COURSES.map((course) => (
						<button
							key={course.id}
							className={styles.courseCard}
							onClick={() => handleCourseClick(course.id)}
						>
							<span className={styles.courseIcon}>{course.icon}</span>
							<h3 className={styles.courseTitle}>{course.title}</h3>
							<p className={styles.courseDesc}>{course.description}</p>
							<span className={styles.startBtn}>Start Learning →</span>
						</button>
					))}
				</div>
			</main>
		</div>
	)
}
