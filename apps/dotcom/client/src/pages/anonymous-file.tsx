import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAnonymousUserId } from '../utils/anonymousUserId'

/**
 * Landing page component that creates an anonymous file and redirects to it.
 * 
 * Flow:
 * 1. Get or create anonymous user ID from localStorage
 * 2. Call API to ensure file exists for this ID
 * 3. Redirect to /f/{anonymousId}
 */
export function Component() {
	const navigate = useNavigate()
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		const createAndRedirect = async () => {
			try {
				// Get or create the anonymous user ID from localStorage
				const anonymousId = getAnonymousUserId()

				// Ensure the file exists on the server
				const response = await fetch('/api/app/anonymous/create-file', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ fileId: anonymousId }),
				})

				if (!response.ok) {
					const data = await response.json().catch(() => ({}))
					throw new Error(data.message || 'Failed to create file')
				}

				// Redirect to the file
				navigate(`/f/${anonymousId}`, { replace: true })
			} catch (err) {
				console.error('Error creating anonymous file:', err)
				setError('Failed to create your canvas. Please try again.')
			}
		}

		createAndRedirect()
	}, [navigate])

	if (error) {
		return (
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					justifyContent: 'center',
					height: '100vh',
					gap: '16px',
					fontFamily: 'system-ui, sans-serif',
				}}
			>
				<p style={{ color: '#666' }}>{error}</p>
				<button
					onClick={() => window.location.reload()}
					style={{
						padding: '8px 16px',
						fontSize: '14px',
						cursor: 'pointer',
						borderRadius: '4px',
						border: '1px solid #ccc',
						background: '#fff',
					}}
				>
					Retry
				</button>
			</div>
		)
	}

	return (
		<div
			style={{
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				height: '100vh',
				fontFamily: 'system-ui, sans-serif',
			}}
		>
			<p style={{ color: '#666' }}>Creating your canvas...</p>
		</div>
	)
}
