/**
 * Course Types
 * Defines the structure of course data from the API
 */

// ============ API Response Types ============

export interface ApiCaseStudy {
	id: string
	title: string
	url: string
	source: string | null
}

export interface ApiLearningOutcome {
	id: string
	description: string
}

export interface ApiConcept {
	id: string
	orderIndex: number
	name: string
	description: string
	conceptUrl: string | null
	caseStudies: ApiCaseStudy[]
	learningOutcomes: ApiLearningOutcome[]
}

export interface ApiModule {
	id: string
	name: string
	description: string | null
	concepts: ApiConcept[]
}

// ============ Course Types ============

export interface Course {
	id: string
	name: string
	description: string
	idealFor: string
	duration: string
	isDeleted: boolean
	createdAt: string
	updatedAt: string
}

export interface CourseWithCurriculum extends Course {
	modules: ApiModule[]
}

export interface CourseResponse {
	status: 'success' | 'error'
	course?: CourseWithCurriculum
	message?: string
}
