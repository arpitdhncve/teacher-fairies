import * as Clerk from '@clerk/elements/common'
import * as SignIn from '@clerk/elements/sign-in'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getFromSessionStorage } from 'tldraw'
import { routes } from '../../routeDefs'
import { useMaybeApp } from '../hooks/useAppState'
import { clearRedirectOnSignIn, setRedirectOnSignIn } from '../utils/redirect'
import { SESSION_STORAGE_KEYS } from '../utils/session-storage'
import styles from './landing.module.css'

export function Component() {
	const app = useMaybeApp()
	const navigate = useNavigate()

	useEffect(() => {
		const handleSignedInUser = async () => {
			if (!app) return

			// Check for redirect-to first (set by OAuth sign-in)
			const redirectTo = getFromSessionStorage(SESSION_STORAGE_KEYS.REDIRECT)
			if (redirectTo) {
				clearRedirectOnSignIn()
				navigate(redirectTo, { replace: true })
				return
			}

			// Redirect signed-in users to home page
			navigate(routes.tlaHome(), { replace: true })
		}

		handleSignedInUser()
	}, [app, navigate])

	// If logged in, navigation will be handled by useEffect above
	if (app) return null

	// Show landing page for logged-out users
	return <LandingPage />
}

function GoogleSignInButton({ className }: { className?: string }) {
	return (
		<SignIn.Root routing="virtual">
			<SignIn.Step name="start">
				{/* @ts-ignore this is fine */}
				<Clerk.Connection name="google" asChild>
					<button
						className={className}
						onClick={() => {
							setRedirectOnSignIn()
						}}
					>
						<svg viewBox="0 0 24 24" width="20" height="20" style={{ marginRight: '8px' }}>
							<path
								fill="#4285F4"
								d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
							/>
							<path
								fill="#34A853"
								d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
							/>
							<path
								fill="#FBBC05"
								d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
							/>
							<path
								fill="#EA4335"
								d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
							/>
						</svg>
						Sign in with Google
					</button>
				</Clerk.Connection>
			</SignIn.Step>
		</SignIn.Root>
	)
}

// Words to display in sequence (outside component to prevent re-creation)
const HERO_WORDS = [
	'Imagine,',
	'you',
	'are',
	'learning',
	'from',
	'a',
	'teacher',
	'in',
	'a',
	'classroom.',
]

function AnimatedHeroTitle() {
	const [displayedWords, setDisplayedWords] = useState<string[]>([])
	const [showCursor, setShowCursor] = useState(true)

	useEffect(() => {
		let wordIndex = 0
		const addNextWord = () => {
			if (wordIndex < HERO_WORDS.length) {
				setDisplayedWords((prev) => [...prev, HERO_WORDS[wordIndex]])
				wordIndex++
				setTimeout(addNextWord, 400)
			}
		}
		// Start the animation
		setTimeout(addNextWord, 300)
	}, [])

	// Blinking cursor effect
	useEffect(() => {
		const interval = setInterval(() => {
			setShowCursor((prev) => !prev)
		}, 530)
		return () => clearInterval(interval)
	}, [])

	return (
		<h1 className={styles.heroTitle}>
			<span className={styles.animatedText}>
				{displayedWords.map((word, index) => (
					<span key={index} className={styles.word}>
						{word}{' '}
					</span>
				))}
			</span>
			<span className={`${styles.cursor} ${showCursor ? styles.cursorVisible : ''}`}>|</span>
		</h1>
	)
}

function LandingPage() {
	return (
		<div className={styles.landingContainer}>
			{/* Header */}
			<header className={styles.header}>
				<a href="/" className={styles.logo}>
					<span className={styles.logoIcon}>✏️</span>
					<span>DrawIt</span>
				</a>
				<GoogleSignInButton className={styles.signInBtn} />
			</header>

			{/* Hero Section */}
			<section className={styles.hero}>
				<div className={styles.heroBackground}>
					<div className={`${styles.orb} ${styles.orb1}`} />
					<div className={`${styles.orb} ${styles.orb2}`} />
					<div className={`${styles.orb} ${styles.orb3}`} />
				</div>
				<div className={styles.heroContent}>
					<AnimatedHeroTitle />
					<div className={styles.heroCta}>
						<GoogleSignInButton className={styles.primaryBtn} />
						<button className={styles.secondaryBtn}>Watch Demo</button>
					</div>
				</div>
			</section>

			{/* Features Section */}
			<section className={styles.features}>
				<h2 className={styles.featuresTitle}>Why DrawIt?</h2>
				<p className={styles.featuresSubtitle}>
					A revolutionary way to learn with AI that truly understands how to teach.
				</p>
				<div className={styles.featuresGrid}>
					<div className={styles.featureCard}>
						<div className={styles.featureIcon}>🤖</div>
						<h3 className={styles.featureTitle}>AI-Powered Teacher</h3>
						<p className={styles.featureDesc}>
							Intelligent tutoring that adapts to your learning style and pace. Get explanations
							that make sense to you.
						</p>
					</div>
					<div className={styles.featureCard}>
						<div className={styles.featureIcon}>🎨</div>
						<h3 className={styles.featureTitle}>Interactive Canvas</h3>
						<p className={styles.featureDesc}>
							Watch concepts come to life on an interactive whiteboard. Visual learning at its best.
						</p>
					</div>
					<div className={styles.featureCard}>
						<div className={styles.featureIcon}>💬</div>
						<h3 className={styles.featureTitle}>Real-time Feedback</h3>
						<p className={styles.featureDesc}>
							Ask questions anytime and get instant, helpful responses. Never feel stuck again.
						</p>
					</div>
					<div className={styles.featureCard}>
						<div className={styles.featureIcon}>📚</div>
						<h3 className={styles.featureTitle}>Learn Any Subject</h3>
						<p className={styles.featureDesc}>
							From math and science to languages and coding. Your AI tutor covers it all.
						</p>
					</div>
				</div>
			</section>

			{/* CTA Section */}
			<section className={styles.cta}>
				<div className={styles.ctaCard}>
					<h2 className={styles.ctaTitle}>Ready to Transform Your Learning?</h2>
					<p className={styles.ctaText}>
						Join thousands of students who are learning smarter with DrawIt.
					</p>
					<GoogleSignInButton className={styles.primaryBtn} />
				</div>
			</section>

			{/* Footer */}
			<footer className={styles.footer}>
				<p>© {new Date().getFullYear()} DrawIt. Learn smarter, not harder.</p>
			</footer>
		</div>
	)
}
