/**
 * useCourseData Hook
 * Manages course data fetching and state
 */

import { useEffect, useState } from 'react'
import type { CourseWithCurriculum } from '../types/courseTypes'
import { fetchCourse } from '../api/courseApi'

interface UseCourseDataResult {
	course: CourseWithCurriculum | null
	loading: boolean
	error: Error | null
}

/**
 * Custom hook for fetching and managing course data with full curriculum
 * @param courseId - The course identifier to fetch
 */
export function useCourseData(courseId: string): UseCourseDataResult {
	const [course, setCourse] = useState<CourseWithCurriculum | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<Error | null>(null)

	useEffect(() => {
		let cancelled = false

		async function loadCourse() {
			try {
				setLoading(true)
				setError(null)
				const data = await fetchCourse(courseId)
				if (!cancelled) {
					setCourse(data)
				}
			} catch (err) {
				if (!cancelled) {
					setError(err instanceof Error ? err : new Error('Failed to load course'))
				}
			} finally {
				if (!cancelled) {
					setLoading(false)
				}
			}
		}

		loadCourse()

		return () => {
			cancelled = true
		}
	}, [courseId])

	return { course, loading, error }
}
