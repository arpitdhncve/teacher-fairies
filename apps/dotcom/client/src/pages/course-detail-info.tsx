import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useDialogs } from 'tldraw'
import { useClerk, useUser } from '@clerk/clerk-react'
import {
	MODULES as FALLBACK_MODULES,
	getFaviconUrl,
	getTotalArchitectureQuestions as getFallbackTotalArchitectureQuestions,
	getTotalCaseStudies as getFallbackTotalCaseStudies,
	getTotalConcepts as getFallbackTotalConcepts,
} from './courseData'
import { useCourseData } from './hooks/useCourseData'
import type { ApiConcept, ApiModule, CourseWithCurriculum } from './types/courseTypes'

// Import New Modular Styles
import curriculumStyles from './styles/course-curriculum.module.css'
import headerStyles from './styles/course-header.module.css'
import pricingStyles from './styles/course-pricing.module.css'
import './styles/course-variables.module.css' // Load variables

// We keep the old styles for basic page layout until we fully migrate global layout if needed
// reusing page layout from old module or creating a minimal new one inline if simple
import oldStyles from './course-detail-info.module.css'
import { TimeLeft } from '../components/TimeLeft'
import { LoginRequiredDialog } from './components/LoginRequiredDialog'

type TabType = 'curriculum' | 'pricing'

const COURSE_ID = 'system-design-101'

// ============ Utility Functions for Dynamic Stats ============

function computeTotalModules(course: CourseWithCurriculum | null): number {
	return course?.modules?.length ?? FALLBACK_MODULES.length
}

function computeTotalConcepts(course: CourseWithCurriculum | null): number {
	if (!course?.modules) return getFallbackTotalConcepts()
	return course.modules.reduce((total, mod) => total + mod.concepts.length, 0)
}

function computeTotalCaseStudies(course: CourseWithCurriculum | null): number {
	if (!course?.modules) return getFallbackTotalCaseStudies()
	return course.modules.reduce(
		(total, mod) =>
			total + mod.concepts.reduce((cTotal, concept) => cTotal + concept.caseStudies.length, 0),
		0
	)
}

function computeTotalLearningOutcomes(course: CourseWithCurriculum | null): number {
	if (!course?.modules) return getFallbackTotalArchitectureQuestions()
	return course.modules.reduce(
		(total, mod) =>
			total + mod.concepts.reduce((cTotal, concept) => cTotal + concept.learningOutcomes.length, 0),
		0
	)
}

// ============ Main Component ============

export function Component() {
	const [searchParams] = useSearchParams()
	const initialTab = (searchParams.get('tab') as TabType) || 'curriculum'
	const [activeTab, setActiveTab] = useState<TabType>(initialTab)

	useEffect(() => {
		const tabParam = searchParams.get('tab') as TabType
		if (tabParam && (tabParam === 'curriculum' || tabParam === 'pricing')) {
			setActiveTab(tabParam)
		}
	}, [searchParams])

	// Removed initial expanded state for premium "clean" look
	const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())
	const { addDialog } = useDialogs()
	const { client, signOut } = useClerk()
	const { user, isSignedIn } = useUser()

	// Fetch course data from API
	const { course, loading: courseLoading } = useCourseData(COURSE_ID)

	const toggleModule = (moduleId: string) => {
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
			redirectUrlComplete: '/course-detail-info?tab=curriculum',
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

					{/* Center - Navigation Tabs (commented out for now) */}
					{/* <div className={headerStyles.tabNavContainer}>
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
					</div> */}

					{/* Right - CTA */}
					<div className={headerStyles.ctaGroup}>
						{isSignedIn && user ? (
							<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
								<img
									src={user.imageUrl}
									alt={user.fullName || 'User'}
									style={{ width: '32px', height: '32px', borderRadius: '50%' }}
								/>
								<div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
									<span style={{ fontSize: '14px', fontWeight: 500 }}>
										{user.firstName || user.fullName}
									</span>
									<span
										onClick={() => signOut()}
										style={{
											fontSize: '12px',
											color: '#666',
											cursor: 'pointer',
											textDecoration: 'underline',
										}}
									>
										Logout
									</span>
								</div>
							</div>
						) : (
							<div className={headerStyles.spotlightBadge} onClick={openLoginDialog}>
								<GoogleIcon className={headerStyles.sparkleIcon} /> Enroll Now
							</div>
						)}
					</div>
				</div>
			</header>

			{/* Main Content */}
			<main className={oldStyles.main}>
				<div className={oldStyles.container}>
					{/* Content Area - Always show curriculum (pricing toggle commented out) */}
					<div>
						<CurriculumSection
							expandedModules={expandedModules}
							toggleModule={toggleModule}
							course={course}
							isSignedIn={isSignedIn ?? false}
						/>
						{/* Pricing section (commented out for now)
						{activeTab === 'pricing' && <PricingSection />}
						*/}
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

// ============ Curriculum Section ============

function CurriculumSection({
	expandedModules,
	toggleModule,
	course,
	isSignedIn,
}: {
	expandedModules: Set<string>
	toggleModule: (id: string) => void
	course: CourseWithCurriculum | null
	isSignedIn: boolean
}) {
	const [showLoginDialog, setShowLoginDialog] = useState(false)

	// Handler for learning material clicks (concepts and case studies)
	const handleLearningMaterialClick = (
		type: 'concept' | 'case_study',
		id: string,
		url: string
	) => {
		if (!isSignedIn) {
			setShowLoginDialog(true)
			return
		}

		// Build the createSource for file lookup/creation
		const createSource = `${type}_${id}`
		// Navigate to the file creation/lookup page with params
		window.open(`/q/learning?createSource=${encodeURIComponent(createSource)}&url=${encodeURIComponent(url)}`, '_blank')
	}
	// Fallback values if course data is not yet loaded
	const title = course?.name || 'Scalable Architectures'
	const description =
		course?.description ||
		'Master system design with our interactive AI tutor. Prepare for senior engineering interviews with real-world case studies.'
	const idealFor = course?.idealFor
	const duration = course?.duration

	// Use dynamic modules from API or fallback to hardcoded data
	const modules: ApiModule[] = course?.modules ?? mapFallbackModules()

	// Compute stats dynamically
	const totalModules = computeTotalModules(course)
	const totalConcepts = computeTotalConcepts(course)
	const totalCaseStudies = computeTotalCaseStudies(course)
	const totalQuestions = computeTotalLearningOutcomes(course)

	return (
		<div className={curriculumStyles.curriculum}>
			{/* Hero */}
			<div className={curriculumStyles.hero}>
				<h1 className={curriculumStyles.title}>{title}</h1>
				<p className={curriculumStyles.subtitle}>{description}</p>

				{/* Meta Badges: Ideal For & Duration */}
				{(idealFor || duration) && (
					<div className={curriculumStyles.metaContainer}>
						{idealFor && (
							<span className={curriculumStyles.metaBadge}>
								<span className={curriculumStyles.metaBadgeIcon}>🎯</span>
								<span className={curriculumStyles.metaBadgeLabel}>Best for:</span>
								{idealFor}
							</span>
						)}
						{idealFor && duration && <span className={curriculumStyles.metaDivider} />}
						{duration && (
							<span className={curriculumStyles.metaBadge}>
								<span className={curriculumStyles.metaBadgeIcon}>⏱️</span>
								<span className={curriculumStyles.metaBadgeLabel}>Approx Duration:</span>
								{duration}
							</span>
						)}
					</div>
				)}

				{/* Stats */}
				<div className={curriculumStyles.statsContainer}>
					<div className={curriculumStyles.statItem}>
						<span className={curriculumStyles.statValue}>{totalModules}</span>
						<span className={curriculumStyles.statLabel}>Modules</span>
					</div>
					<div className={curriculumStyles.statItem}>
						<span className={curriculumStyles.statValue}>{totalConcepts}</span>
						<span className={curriculumStyles.statLabel}>Concepts</span>
					</div>
					<div className={curriculumStyles.statItem}>
						<span className={curriculumStyles.statValue}>{totalCaseStudies}</span>
						<span className={curriculumStyles.statLabel}>Case Studies</span>
					</div>
					<div className={curriculumStyles.statItem}>
						<span className={curriculumStyles.statValue}>{totalQuestions}</span>
						<span className={curriculumStyles.statLabel}>Questions</span>
					</div>
				</div>
			</div>

			{/* Modules */}
			<div className={curriculumStyles.moduleList}>
				{modules.map((module, index) => (
					<ModuleAccordion
						key={module.id}
						module={module}
						moduleIndex={index + 1}
						isExpanded={expandedModules.has(module.id)}
						onToggle={() => toggleModule(module.id)}
						onLearningMaterialClick={handleLearningMaterialClick}
					/>
				))}
			</div>

			{/* Login Required Dialog */}
			{showLoginDialog && (
				<LoginRequiredDialog onClose={() => setShowLoginDialog(false)} />
			)}
		</div>
	)
}

// ============ Fallback Mapper ============

/**
 * Maps the hardcoded MODULES to ApiModule format for fallback
 */
function mapFallbackModules(): ApiModule[] {
	return FALLBACK_MODULES.map((mod) => ({
		id: String(mod.id),
		name: mod.topicName,
		description: mod.description,
		concepts: mod.concepts.map((concept) => ({
			id: String(concept.id),
			orderIndex: concept.id,
			name: concept.name,
			description: concept.description,
			conceptUrl: concept.conceptUrl || null,
			caseStudies: concept.caseStudies.map((cs, idx) => ({
				id: `${concept.id}-cs-${idx}`,
				title: cs.title,
				url: cs.url,
				source: cs.source,
			})),
			learningOutcomes: concept.architectureQuestions.map((q, idx) => ({
				id: `${concept.id}-lo-${idx}`,
				description: q,
			})),
		})),
	}))
}

// ============ Module Accordion ============

function ModuleAccordion({
	module,
	moduleIndex,
	isExpanded,
	onToggle,
	onLearningMaterialClick,
}: {
	module: ApiModule
	moduleIndex: number
	isExpanded: boolean
	onToggle: () => void
	onLearningMaterialClick: (type: 'concept' | 'case_study', id: string, url: string) => void
}) {
	const caseStudyCount = module.concepts.reduce((acc, concept) => acc + concept.caseStudies.length, 0)

	return (
		<div
			className={`${curriculumStyles.moduleCard} ${isExpanded ? curriculumStyles.expanded : ''}`}
		>
			<button className={curriculumStyles.moduleHeader} onClick={onToggle}>
				<div className={curriculumStyles.moduleInfo}>
					<span className={curriculumStyles.moduleNumber}>Module {moduleIndex}</span>
					<h3 className={curriculumStyles.moduleTitle}>{module.name}</h3>
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
						<ConceptCard 
							key={concept.id} 
							concept={concept} 
							onLearningMaterialClick={onLearningMaterialClick}
						/>
					))}
				</div>
			)}
		</div>
	)
}

// ============ Concept Card ============

function ConceptCard({ 
	concept, 
	onLearningMaterialClick 
}: { 
	concept: ApiConcept
	onLearningMaterialClick: (type: 'concept' | 'case_study', id: string, url: string) => void
}) {
	return (
		<div className={curriculumStyles.conceptItem}>
			<div className={curriculumStyles.conceptHeader}>
				<h4 className={curriculumStyles.conceptTitle}>{concept.name}</h4>
				{concept.conceptUrl && (
					<button
						onClick={() => onLearningMaterialClick('concept', concept.id, concept.conceptUrl!)}
						className={curriculumStyles.readButton}
					>
						Learn Concept
					</button>
				)}
			</div>
			<p className={curriculumStyles.moduleDesc}>{concept.description}</p>{' '}
			{/* Reusing desc style */}
			{/* Case Studies */}
			{concept.caseStudies.length > 0 && (
				<div className={curriculumStyles.caseStudiesSection}>
					<div className={curriculumStyles.sectionLabel}>Real World Case Studies</div>
					<div className={curriculumStyles.caseStudyGrid}>
						{concept.caseStudies.map((cs) => (
							<button
								key={cs.id}
								onClick={() => onLearningMaterialClick('case_study', cs.id, cs.url)}
								className={curriculumStyles.caseStudyCard}
								style={{ cursor: 'pointer', border: 'none', textAlign: 'left' }}
							>
								{/* Assuming getFaviconUrl works */}
								<img
									src={getFaviconUrl(cs.url)}
									alt={cs.source || 'Source'}
									className={curriculumStyles.companyLogo}
									onError={(e) => {
										// Fallback if favicon fails (optional)
										;(e.target as HTMLImageElement).style.visibility = 'hidden'
									}}
								/>
								<span className={curriculumStyles.csTitle}>{cs.title}</span>
							</button>
						))}
					</div>
				</div>
			)}
			{/* Learning Outcomes / Interview Questions */}
			{concept.learningOutcomes.length > 0 && (
				<div className={curriculumStyles.interviewSection}>
					<div className={curriculumStyles.sectionLabel}>
						<span style={{ color: '#d97706' }}>⚡</span> Interview Prep
					</div>
					<div>
						{concept.learningOutcomes.map((outcome) => (
							<div key={outcome.id} className={curriculumStyles.questionItem}>
								<span className={curriculumStyles.qIcon}>?</span>
								<span>{outcome.description}</span>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	)
}

// ============ Pricing Section ============

function PricingSection() {
	const { addDialog } = useDialogs()
	const { client } = useClerk()
	const { isSignedIn } = useUser()

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
				{isSignedIn ? (
					<TimeLeft />
				) : (
					<>
						<button className={pricingStyles.tryFreeButton} onClick={handleTryFree}>
							<GoogleIcon className={pricingStyles.googleIcon} /> Enroll Now · 1 Hour Free
						</button>
						<span className={pricingStyles.tryFreeNote}>No credit card required</span>
					</>
				)}
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

					</ul>
					<button className={pricingStyles.button}>Purchase</button>
				</div>

				{/* 20 Hours Pack with 10% discount */}
				<div className={`${pricingStyles.card} ${pricingStyles.cardHighlight}`}>
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

					</ul>
					<button className={`${pricingStyles.button} ${pricingStyles.buttonPrimary}`}>Purchase</button>
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
