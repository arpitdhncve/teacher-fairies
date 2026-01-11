import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useDialogs } from 'tldraw'
import { TlaSignInDialog } from '../tla/components/dialogs/TlaSignInDialog'
import { useClerk } from '@clerk/clerk-react'
import {
	MODULES,
	getFaviconUrl,
	getTotalArchitectureQuestions,
	getTotalCaseStudies,
	getTotalConcepts,
	type Concept,
	type Module,
} from './courseData'

// Import New Modular Styles
import curriculumStyles from './styles/course-curriculum.module.css'
import headerStyles from './styles/course-header.module.css'
import pricingStyles from './styles/course-pricing.module.css'
import './styles/course-variables.module.css' // Load variables

// We keep the old styles for basic page layout until we fully migrate global layout if needed
// reusing page layout from old module or creating a minimal new one inline if simple
import oldStyles from './course-detail-info.module.css'

type TabType = 'curriculum' | 'pricing'

export function Component() {
	const [activeTab, setActiveTab] = useState<TabType>('curriculum')
	// Removed initial expanded state for premium "clean" look
	const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set())
	const { addDialog } = useDialogs()
	const { client } = useClerk()

	const toggleModule = (moduleId: number) => {
		setExpandedModules((prev) => {
			const next = new Set(prev)
			if (next.has(moduleId)) {
				next.delete(moduleId)
			} else {
				next.add(moduleId)
			}
			return next
		})
	}

	const openLoginDialog = () => {
		client.signIn.authenticateWithRedirect({
			strategy: 'oauth_google',
			redirectUrl: '/sso-callback',
			redirectUrlComplete: '/',
		})
	}

	return (
		<div className={oldStyles.page}>
			{/* New Premium Header */}
			<header className={`${headerStyles.header} ${headerStyles.glassEffect}`}>
				<div className={headerStyles.container}>
					{/* Left - Logo */}
					<div className={headerStyles.navGroup}>
						<Link to="/" className={headerStyles.logo}>
							Eazit
						</Link>
					</div>

					{/* Center - Navigation Tabs */}
					<div className={headerStyles.tabNavContainer}>
						<nav className={headerStyles.tabNav}>
							<button
								className={`${headerStyles.tab} ${activeTab === 'curriculum' ? headerStyles.activeTab : ''}`}
								onClick={() => setActiveTab('curriculum')}
							>
								Curriculum
							</button>
							<button
								className={`${headerStyles.tab} ${activeTab === 'pricing' ? headerStyles.activeTab : ''}`}
								onClick={() => setActiveTab('pricing')}
							>
								Pricing
							</button>
						</nav>
					</div>

					{/* Right - CTA */}
					<div className={headerStyles.ctaGroup}>
						<div className={headerStyles.spotlightBadge} onClick={openLoginDialog}>
							<GoogleIcon className={headerStyles.sparkleIcon} /> Enroll Now · 1 Hour Free
						</div>
					</div>
				</div>
			</header>

			{/* Main Content */}
			<main className={oldStyles.main}>
				<div className={oldStyles.container}>
					{/* Content Area */}
					<div>
						{activeTab === 'curriculum' ? (
							<CurriculumSection expandedModules={expandedModules} toggleModule={toggleModule} />
						) : (
							<PricingSection />
						)}
					</div>
				</div>
			</main>

			{/* Footer */}
			<footer className={oldStyles.footer}>
				<div className={oldStyles.footerContent}>
					<p className={oldStyles.footerText}>© 2024 Eazit. All rights reserved.</p>
					<div className={oldStyles.footerLinks}>
						<a href="#" className={oldStyles.footerLink}>
							Privacy
						</a>
						<a href="#" className={oldStyles.footerLink}>
							Terms
						</a>
						<a href="#" className={oldStyles.footerLink}>
							Contact
						</a>
					</div>
				</div>
			</footer>
		</div>
	)
}

// Curriculum Section
function CurriculumSection({
	expandedModules,
	toggleModule,
}: {
	expandedModules: Set<number>
	toggleModule: (id: number) => void
}) {
	return (
		<div className={curriculumStyles.curriculum}>
			{/* Hero */}
			<div className={curriculumStyles.hero}>
				<h1 className={curriculumStyles.title}>Scalable Architectures</h1>
				<p className={curriculumStyles.subtitle}>
					Master system design with our interactive AI tutor. <br />
					Prepare for senior engineering interviews with real-world case studies.
				</p>

				{/* Stats */}
				<div className={curriculumStyles.statsContainer}>
					<div className={curriculumStyles.statItem}>
						<span className={curriculumStyles.statValue}>{MODULES.length}</span>
						<span className={curriculumStyles.statLabel}>Modules</span>
					</div>
					<div className={curriculumStyles.statItem}>
						<span className={curriculumStyles.statValue}>{getTotalConcepts()}</span>
						<span className={curriculumStyles.statLabel}>Concepts</span>
					</div>
					<div className={curriculumStyles.statItem}>
						<span className={curriculumStyles.statValue}>{getTotalCaseStudies()}</span>
						<span className={curriculumStyles.statLabel}>Case Studies</span>
					</div>
					<div className={curriculumStyles.statItem}>
						<span className={curriculumStyles.statValue}>{getTotalArchitectureQuestions()}</span>
						<span className={curriculumStyles.statLabel}>Questions</span>
					</div>
				</div>
			</div>

			{/* Modules */}
			<div className={curriculumStyles.moduleList}>
				{MODULES.map((module) => (
					<ModuleAccordion
						key={module.id}
						module={module}
						isExpanded={expandedModules.has(module.id)}
						onToggle={() => toggleModule(module.id)}
					/>
				))}
			</div>
		</div>
	)
}

// Helper to count case studies in a module
function getCaseStudyCount(module: Module): number {
	return module.concepts.reduce((acc, concept) => acc + concept.caseStudies.length, 0)
}

// Module Accordion
function ModuleAccordion({
	module,
	isExpanded,
	onToggle,
}: {
	module: Module
	isExpanded: boolean
	onToggle: () => void
}) {
	const caseStudyCount = getCaseStudyCount(module)

	return (
		<div
			className={`${curriculumStyles.moduleCard} ${isExpanded ? curriculumStyles.expanded : ''}`}
		>
			<button className={curriculumStyles.moduleHeader} onClick={onToggle}>
				<div className={curriculumStyles.moduleInfo}>
					<span className={curriculumStyles.moduleNumber}>Module {module.id}</span>
					<h3 className={curriculumStyles.moduleTitle}>{module.topicName}</h3>
					<p className={curriculumStyles.moduleDesc}>{module.description}</p>
				</div>
				<div className={curriculumStyles.moduleBadges}>
					<span className={curriculumStyles.badge}>📚 {module.concepts.length} Concepts</span>
					{caseStudyCount > 0 && (
						<span className={`${curriculumStyles.badge} ${curriculumStyles.badgeHighlight}`}>
							🏢 {caseStudyCount} Case Studies
						</span>
					)}
					<svg
						className={`${curriculumStyles.chevron} ${isExpanded ? curriculumStyles.chevronRotated : ''}`}
						viewBox="0 0 20 20"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
					>
						<path d="M6 8l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
					</svg>
				</div>
			</button>

			{isExpanded && (
				<div className={curriculumStyles.moduleContent}>
					{module.concepts.map((concept) => (
						<ConceptCard key={concept.id} concept={concept} />
					))}
				</div>
			)}
		</div>
	)
}

// Concept Card
function ConceptCard({ concept }: { concept: Concept }) {
	return (
		<div className={curriculumStyles.conceptItem}>
			<div className={curriculumStyles.conceptHeader}>
				<h4 className={curriculumStyles.conceptTitle}>{concept.name}</h4>
				{concept.conceptUrl && (
					<a
						href={concept.conceptUrl}
						target="_blank"
						rel="noopener noreferrer"
						className={curriculumStyles.readButton}
					>
						Read Concept
					</a>
				)}
			</div>
			<p className={curriculumStyles.moduleDesc}>{concept.description}</p>{' '}
			{/* Reusing desc style */}
			{/* Case Studies */}
			{concept.caseStudies.length > 0 && (
				<div className={curriculumStyles.caseStudiesSection}>
					<div className={curriculumStyles.sectionLabel}>Real World Case Studies</div>
					<div className={curriculumStyles.caseStudyGrid}>
						{concept.caseStudies.map((cs, idx) => (
							<a
								key={idx}
								href={cs.url}
								target="_blank"
								rel="noopener noreferrer"
								className={curriculumStyles.caseStudyCard}
							>
								{/* Assuming getFaviconUrl works */}
								<img
									src={getFaviconUrl(cs.url)}
									alt={cs.source}
									className={curriculumStyles.companyLogo}
									onError={(e) => {
										// Fallback if favicon fails (optional)
										;(e.target as HTMLImageElement).style.visibility = 'hidden'
									}}
								/>
								<span className={curriculumStyles.csTitle}>{cs.title}</span>
							</a>
						))}
					</div>
				</div>
			)}
			{/* Architecture Questions */}
			{concept.architectureQuestions.length > 0 && (
				<div className={curriculumStyles.interviewSection}>
					<div className={curriculumStyles.sectionLabel}>
						<span style={{ color: '#d97706' }}>⚡</span> Interview Prep
					</div>
					<div>
						{concept.architectureQuestions.map((q, idx) => (
							<div key={idx} className={curriculumStyles.questionItem}>
								<span className={curriculumStyles.qIcon}>?</span>
								<span>{q}</span>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	)
}

// Pricing Section
function PricingSection() {
	const { addDialog } = useDialogs()
	const { client } = useClerk()

	const handleTryFree = () => {
		client.signIn.authenticateWithRedirect({
			strategy: 'oauth_google',
			redirectUrl: '/sso-callback',
			redirectUrlComplete: '/',
		})
	}

	return (
		<div className={pricingStyles.section}>
			<div className={pricingStyles.header}>
				<h2 className={pricingStyles.title}>Simple, Transparent Pricing</h2>
				<p className={pricingStyles.subtitle}>
					High quality system design education shouldn't cost a fortune.
				</p>
			</div>

			{/* Try Course CTA */}
			<div className={pricingStyles.tryFreeSection}>
				<button className={pricingStyles.tryFreeButton} onClick={handleTryFree}>
					<GoogleIcon className={pricingStyles.googleIcon} /> Enroll Now · 1 Hour Free
				</button>
				<span className={pricingStyles.tryFreeNote}>No credit card required</span>
			</div>

			<div className={pricingStyles.cardsContainer}>
				{/* 5 Hours Pack */}
				<div className={pricingStyles.card}>
					<h3 className={pricingStyles.cardTitle}>Starter Pack</h3>
					<div className={pricingStyles.price}>
						<span className={pricingStyles.amount}>$25</span>
						<span className={pricingStyles.unit}>total</span>
					</div>
					<ul className={pricingStyles.features}>
						<li className={pricingStyles.featureItem}>
							<span className={pricingStyles.checkIcon}>✓</span> 5 hours of AI tutoring
						</li>
						<li className={pricingStyles.featureItem}>
							<span className={pricingStyles.checkIcon}>✓</span> Full course access
						</li>
						<li className={pricingStyles.featureItem}>
							<span className={pricingStyles.checkIcon}>✓</span> All case studies
						</li>
					</ul>
					<button className={pricingStyles.button}>Purchase</button>
				</div>

				{/* 20 Hours Pack with 10% discount */}
				<div className={pricingStyles.card}>
					<div className={pricingStyles.discountBadge}>10% OFF</div>
					<h3 className={pricingStyles.cardTitle}>Pro Pack</h3>
					<div className={pricingStyles.price}>
						<span className={pricingStyles.originalPrice}>$100</span>
						<span className={pricingStyles.amount}>$90</span>
						<span className={pricingStyles.unit}>total</span>
					</div>
					<ul className={pricingStyles.features}>
						<li className={pricingStyles.featureItem}>
							<span className={pricingStyles.checkIcon}>✓</span> 20 hours of AI tutoring
						</li>
						<li className={pricingStyles.featureItem}>
							<span className={pricingStyles.checkIcon}>✓</span> All case studies
						</li>
						<li className={pricingStyles.featureItem}>
							<span className={pricingStyles.checkIcon}>✓</span> Priority support
						</li>
					</ul>
					<button className={pricingStyles.button}>Purchase</button>
				</div>
			</div>

			{/* Value Props Below Cards */}
			<div className={pricingProps}>
				<div className={pricingStyles.valuePropBadge}>
					<span className={pricingStyles.valuePropIcon}>💰</span>
					<span>10x Cheaper than Human Engineer</span>
				</div>
				<div className={pricingStyles.valuePropBadge}>
					<span className={pricingStyles.valuePropIcon}>🕐</span>
					<span>24/7 Available</span>
				</div>
				<div className={pricingStyles.valuePropBadge}>
					<span className={pricingStyles.valuePropIcon}>💬</span>
					<span>No Hesitation in Asking Anything</span>
				</div>
			</div>
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

const pricingProps = pricingStyles.valuePropsContainer
