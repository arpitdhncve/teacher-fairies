/**
 * Course API Client
 * Single responsibility: Fetching course data from the server
 */

import type { CourseWithCurriculum, CourseResponse } from '../types/courseTypes'

const API_BASE_URL = 'http://localhost:3001'

/**
 * Fetches a course with full curriculum by its ID
 * @param courseId - The course identifier
 * @returns The course object with modules, concepts, etc. or null if not found
 */
export async function fetchCourse(courseId: string): Promise<CourseWithCurriculum | null> {
	try {
		const response = await fetch(`${API_BASE_URL}/course/${courseId}`)

		if (!response.ok) {
			if (response.status === 404) {
				return null
			}
			throw new Error(`Failed to fetch course: ${response.status}`)
		}

		const data: CourseResponse = await response.json()

		if (data.status === 'success' && data.course) {
			return data.course
		}

		return null
	} catch (error) {
		console.error('[courseApi] Error fetching course:', error)
		throw error
	}
}
