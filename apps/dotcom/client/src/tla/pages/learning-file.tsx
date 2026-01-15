/**
 * Learning File Page
 * 
 * This page handles the createSource-based file lookup/creation for learning materials.
 * It receives createSource and url from query params, looks up or creates the file,
 * then redirects to the actual file editor.
 */

import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { useMaybeApp } from '../hooks/useAppState'
import { routes } from '../../routeDefs'

export function Component() {
	const [searchParams] = useSearchParams()
	const navigate = useNavigate()
	const auth = useAuth()
	const app = useMaybeApp()
	const [status, setStatus] = useState<'loading' | 'processing' | 'error'>('loading')
	const [error, setError] = useState<string | null>(null)

	const rawCreateSource = searchParams.get('createSource')
	const url = searchParams.get('url')

	// Convert createSource to use LOCAL_FILE_PREFIX (lf/)
	// Input format: concept_123 or case_study_456
	// Output format: lf/concept_123 or lf/case_study_456
	// The lf/ prefix is required for the sync worker to recognize and create an empty room
	const createSource = rawCreateSource 
		? `lf/${rawCreateSource}`
		: null

	useEffect(() => {
		if (!auth.isSignedIn) {
			// Redirect to course page if not signed in
			navigate('/course-detail-info?tab=curriculum')
			return
		}

		if (!app) {
			// Wait for app to be ready
			return
		}

		if (!createSource) {
			setError('Missing createSource parameter')
			setStatus('error')
			return
		}

		const handleFileCreation = async () => {
			setStatus('processing')

			try {
				// Store the learning material URL in localStorage for later retrieval
				// This is used by ChatPanel to pass the URL to the start-learning API
				if (url && createSource) {
					localStorage.setItem(`learning_material_url:${createSource}`, url)
					console.log('[LearningFile] Stored learning material URL:', url)
				}

				// Check if a file with this createSource already exists
				// This ensures one user + one learning material = one file
				const existingFile = app.getFileByCreateSource(createSource)

				// Extract learningMaterialId from createSource for friendly file name
				// Format: lf/concept_123 or lf/case_study_456
				const parts = createSource.split('/')
				const learningMaterialId = parts[1] || null

				if (existingFile) {
					// File exists, navigate to it
					console.log('[LearningFile] Found existing file:', existingFile.id)
					navigate(routes.tlaFile(existingFile.id))
				} else {
					// Create new file with this createSource
					console.log('[LearningFile] Creating new file with createSource:', createSource)
					
					// Extract a friendly name from the learningMaterialId
					const name = learningMaterialId
						? learningMaterialId
							.replace('concept_', 'Concept ')
							.replace('case_study_', 'Case Study ')
						: 'Learning Material'
					
					const result = await app.createFile({
						createSource,
						name,
					})

					if (result.ok) {
						console.log('[LearningFile] Created new file:', result.value.fileId)
						navigate(routes.tlaFile(result.value.fileId))
					} else {
						setError('Failed to create file: ' + result.error)
						setStatus('error')
					}
				}
			} catch (err) {
				console.error('[LearningFile] Error:', err)
				setError(err instanceof Error ? err.message : 'An error occurred')
				setStatus('error')
			}
		}

		handleFileCreation()
	}, [auth.isSignedIn, app, createSource, url, navigate])

	// Loading state UI
	if (status === 'loading' || status === 'processing') {
		return (
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					justifyContent: 'center',
					height: '100vh',
					background: '#0a0a0f',
					color: '#fff',
					gap: 16,
				}}
			>
				<div
					style={{
						width: 48,
						height: 48,
						borderRadius: '50%',
						border: '3px solid rgba(99, 102, 241, 0.2)',
						borderTopColor: '#6366f1',
						animation: 'spin 1s linear infinite',
					}}
				/>
				<style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
				<div style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)' }}>
					{status === 'loading' ? 'Loading...' : 'Preparing your learning space...'}
				</div>
			</div>
		)
	}

	// Error state UI
	if (status === 'error') {
		return (
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					justifyContent: 'center',
					height: '100vh',
					background: '#0a0a0f',
					color: '#fff',
					gap: 16,
				}}
			>
				<div style={{ fontSize: 48 }}>❌</div>
				<div style={{ fontSize: 18, fontWeight: 600 }}>Something went wrong</div>
				<div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>{error}</div>
				<button
					onClick={() => navigate('/course-detail-info?tab=curriculum')}
					style={{
						marginTop: 16,
						padding: '10px 24px',
						borderRadius: 8,
						background: '#6366f1',
						color: '#fff',
						border: 'none',
						cursor: 'pointer',
						fontSize: 14,
						fontWeight: 600,
					}}
				>
					Back to Course
				</button>
			</div>
		)
	}

	return null
}
