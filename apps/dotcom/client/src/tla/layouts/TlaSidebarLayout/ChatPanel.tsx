import { SignInButton, useAuth } from '@clerk/clerk-react'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
// ✅ swap TldrawAgent -> FairyAgent
import { FairyAgent } from '../../../fairy/fairy-agent/FairyAgent'
import { clearLocalSessionState } from '../../utils/local-session-state'

import {
	LiveKitRoom,
	RoomAudioRenderer,
	RoomContext,
	StartAudio,
	useConnectionState,
	useLocalParticipant,
	useTranscriptions,
} from '@livekit/components-react'
import '@livekit/components-styles'
import { ConnectionState, RoomEvent } from 'livekit-client'

function ConnectionStatus() {
	const s = useConnectionState()
	const label =
		s === ConnectionState.Connected
			? 'Connected'
			: s === ConnectionState.Connecting
				? 'Connecting…'
				: s === ConnectionState.Disconnected
					? 'Disconnected'
					: String(s)

	return <div style={{ fontSize: 12, opacity: 0.8 }}>{label}</div>
}

/**
 * Push-to-talk mic controller:
 * - default mic is MUTED after connect
 * - hold Space to unmute, release to mute
 * - publishes ptt.start / ptt.end
 */
function MicPushToTalk({ hotkey = 'Space' }: { hotkey?: string }) {
	const { localParticipant } = useLocalParticipant()
	const connection = useConnectionState()
	const room = React.useContext(RoomContext)

	const [micEnabled, setMicEnabled] = useState(false)

	const publishPtt = useCallback(
		(topic: 'ptt.start' | 'ptt.end') => {
			if (!room?.localParticipant) return
			const payload = { ts: new Date().toISOString() }
			room.localParticipant.publishData(new TextEncoder().encode(JSON.stringify(payload)), {
				topic,
			})
		},
		[room]
	)

	const setMic = useCallback(
		async (enabled: boolean) => {
			if (!localParticipant) return
			try {
				await localParticipant.setMicrophoneEnabled(enabled)
				setMicEnabled(enabled)
			} catch (e) {
				console.error('Failed to set microphone:', e)
			}
		},
		[localParticipant]
	)

	// Ensure microphone is muted on initial connection
	useEffect(() => {
		if (!localParticipant) return
		if (connection !== ConnectionState.Connected) return

		// Mute the microphone when first connected
		setMic(false)
	}, [localParticipant, connection, setMic])

	useEffect(() => {
		if (!localParticipant) return
		if (connection !== ConnectionState.Connected) return

		const down = (e: KeyboardEvent) => {
			if (e.code !== hotkey) return
			if (e.repeat) return
			e.preventDefault()

			publishPtt('ptt.start')
			setMic(true)
		}

		const up = (e: KeyboardEvent) => {
			if (e.code !== hotkey) return
			e.preventDefault()

			setMic(false)
			publishPtt('ptt.end')
		}

		const blur = () => {
			if (micEnabled) {
				setMic(false)
				publishPtt('ptt.end')
			}
		}

		window.addEventListener('keydown', down, { passive: false })
		window.addEventListener('keyup', up, { passive: false })
		window.addEventListener('blur', blur)

		return () => {
			window.removeEventListener('keydown', down as any)
			window.removeEventListener('keyup', up as any)
			window.removeEventListener('blur', blur)
		}
	}, [localParticipant, connection, hotkey, setMic, publishPtt, micEnabled])

	return (
		<div
			style={{
				display: 'flex',
				alignItems: 'center',
				gap: 10,
				marginTop: 8,
				flexWrap: 'wrap',
			}}
		>
			<div
				style={{
					fontSize: 12,
					padding: '4px 10px',
					borderRadius: 999,
					border: '1px solid rgba(255,255,255,0.12)',
					background: micEnabled ? 'rgba(34, 197, 94, 0.18)' : 'rgba(239, 68, 68, 0.18)',
					color: '#fff',
				}}
				title={`Hold ${hotkey} to talk`}
			>
				Mic: {micEnabled ? 'Unmuted (talking)' : 'Muted'}
			</div>

			<button
				onClick={() => setMic(!micEnabled)}
				style={{ padding: '6px 10px', borderRadius: 10 }}
				disabled={connection !== ConnectionState.Connected}
				title="Manual toggle"
			>
				{micEnabled ? 'Mute' : 'Unmute'}
			</button>

			<div style={{ fontSize: 12, opacity: 0.75 }}>
				Hold <b>{hotkey}</b> to speak
			</div>
		</div>
	)
}

type ChatMsg =
	| { id: string; kind: 'user_transcript'; text: string; ts: number }
	| { id: string; kind: 'ai_speak'; text: string; ts: number }
	| { id: string; kind: 'ai_question'; text: string; ts: number }
	| { id: string; kind: 'ai_curriculum'; text: string; ts: number }

function TranscriptionCollector({ onUser }: { onUser: (m: ChatMsg) => void }) {
	const { localParticipant } = useLocalParticipant()
	const transcriptions = useTranscriptions()

	const lastTextRef = useRef<Map<string, string>>(new Map())

	useEffect(() => {
		if (!localParticipant) return

		const mySid = (localParticipant as any)?.sid ?? ''
		const myIdentity = (localParticipant as any)?.identity ?? ''

		for (let i = 0; i < transcriptions.length; i++) {
			const t: any = transcriptions[i]
			const attrs = t?.attributes ?? t?.info?.attributes ?? t?.segment?.attributes ?? {}

			const segmentId = attrs['lk.segment_id'] ?? t?.segmentId ?? t?.id ?? `${i}`

			const text = (t?.text ?? t?.segment?.text ?? '').trim()
			if (!text) continue

			const participantInfo = t?.participantInfo ?? {}
			const sid =
				t?.participantSid ?? t?.participant?.sid ?? t?.from?.sid ?? participantInfo?.sid ?? ''

			const identity =
				t?.participantIdentity ??
				t?.from?.identity ??
				t?.participant?.identity ??
				participantInfo?.identity ??
				''

			let isMe = false
			if (mySid && sid) isMe = sid === mySid
			if (!isMe && myIdentity && identity) isMe = identity === myIdentity
			if (!isMe) continue // ✅ ONLY user mic

			const id = `user:${sid || identity || 'p'}:${segmentId}`
			const prevText = lastTextRef.current.get(id)

			if (prevText === text) continue
			lastTextRef.current.set(id, text)

			const ts = Number(t?.timestamp ?? t?.receivedAt ?? Date.now())

			onUser({ id, kind: 'user_transcript', text, ts })
		}
	}, [transcriptions, localParticipant, onUser])

	return null
}

function UnifiedChat({
	items,
	onViewCourseDetails,
}: {
	items: ChatMsg[]
	onViewCourseDetails: () => void
}) {
	const scrollRef = useRef<HTMLDivElement | null>(null)
	const bottomRef = useRef<HTMLDivElement | null>(null)
	const [stickToBottom, setStickToBottom] = useState(true)

	const onScroll = useCallback(() => {
		const el = scrollRef.current
		if (!el) return
		const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
		setStickToBottom(distanceFromBottom < 80)
	}, [])

	useEffect(() => {
		if (!stickToBottom) return
		bottomRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' })
	}, [items, stickToBottom])

	if (items.length === 0) return null

	return (
		<div
			ref={scrollRef}
			onScroll={onScroll}
			style={{
				marginTop: 12,
				width: '100%',
				flex: 1,
				minHeight: 0,
				overflowY: 'auto',
				display: 'flex',
				flexDirection: 'column',
				gap: 10,
				paddingRight: 6,
			}}
		>
			{items.map((m) => {
				const isMe = m.kind === 'user_transcript'
				const isQuestion = m.kind === 'ai_question'
				const isCurriculum = m.kind === 'ai_curriculum'

				return (
					<div
						key={m.id}
						style={{
							display: 'flex',
							justifyContent: isMe ? 'flex-end' : 'flex-start',
							width: '100%',
						}}
					>
						<div
							style={{
								maxWidth: '85%',
								padding: '10px 14px',
								borderRadius: 16,
								fontSize: 14,
								lineHeight: 1.4,
								whiteSpace: 'pre-wrap',
								wordBreak: 'break-word',
								color: '#fff',
								border: isCurriculum
									? '1px solid rgba(59, 130, 246, 0.5)'
									: isQuestion
										? '1px solid rgba(250, 204, 21, 0.45)'
										: '1px solid rgba(255,255,255,0.12)',
								background: isMe
									? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
									: isCurriculum
										? 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)'
										: isQuestion
											? 'linear-gradient(135deg, #1f2937 0%, #111827 100%)'
											: 'linear-gradient(135deg, #2d3748 0%, #1a202c 100%)',
							}}
						>
							{isCurriculum ? (
								<div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6, color: '#60a5fa' }}>
									📚 Course Curriculum
								</div>
							) : isQuestion ? (
								<div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>
									Please answer this Question
								</div>
							) : null}

							{m.text}

							{isCurriculum && (
								<button
									onClick={onViewCourseDetails}
									style={{
										marginTop: 12,
										width: '100%',
										padding: '10px 16px',
										borderRadius: 10,
										border: 'none',
										background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
										color: '#fff',
										fontSize: 14,
										fontWeight: 600,
										cursor: 'pointer',
										transition: 'transform 0.15s ease, box-shadow 0.15s ease',
									}}
									onMouseEnter={(e) => {
										e.currentTarget.style.transform = 'translateY(-1px)'
										e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)'
									}}
									onMouseLeave={(e) => {
										e.currentTarget.style.transform = 'translateY(0)'
										e.currentTarget.style.boxShadow = 'none'
									}}
								>
									View Course Details →
								</button>
							)}
						</div>
					</div>
				)
			})}

			<div ref={bottomRef} />
		</div>
	)
}

function DataHandler({
	agent,
	onUi,
	pendingDrawRequestsRef,
}: {
	agent: FairyAgent
	onUi: (m: ChatMsg) => void
	pendingDrawRequestsRef: React.MutableRefObject<
		Map<string, { request_id: string; previousMode: string }>
	>
}) {
	const room = React.useContext(RoomContext)

	useEffect(() => {
		if (!room) return

		const handleDataReceived = async (
			payload: Uint8Array,
			_participant?: any,
			_kind?: any,
			topic?: string
		) => {
			// --- SNAPSHOT: FairyAgent ---
			if (topic === 'snapshot.request') {
				const payloadText = new TextDecoder().decode(payload)
				let decoded: any

				try {
					decoded = JSON.parse(payloadText)
				} catch (parseErr) {
					console.error('Failed to parse snapshot.request payload:', parseErr)
					room.localParticipant.publishData(
						new TextEncoder().encode(
							JSON.stringify({
								error: `Parse error: ${String(parseErr)}`,
								state_uuid: null,
							})
						),
						{ topic: 'snapshot.response' }
					)
					return
				}

				const request_id = decoded?.request_id
				if (!request_id) {
					console.warn('snapshot.request: no valid request_id found')
					return
				}

				try {
					const state_uuid = await agent.snapshotCanvas()

					room.localParticipant.publishData(
						new TextEncoder().encode(JSON.stringify({ request_id, state_uuid })),
						{ topic: 'snapshot.response' }
					)
				} catch (err) {
					console.error('Snapshot request failed:', err)
					room.localParticipant.publishData(
						new TextEncoder().encode(
							JSON.stringify({
								request_id,
								error: String(err),
								state_uuid: null,
							})
						),
						{ topic: 'snapshot.response' }
					)
				}

				return
			}

			// --- DRAW: Send instruction to LEADER ONLY (orchestration mode) ---
			// The leader (index 0 - Alice Sparklewind) will receive the instruction,
			// create a project, and delegate tasks to followers (Bob & Charlie)
			if (topic === 'draw.request') {
				const payloadText = new TextDecoder().decode(payload)
				let decoded: any

				try {
					decoded = JSON.parse(payloadText)
				} catch (parseErr) {
					console.error('Failed to parse draw.request payload:', parseErr)
					return
				}

				const request_id = decoded?.request_id
				const instruction = decoded?.instruction
				console.log('draw.request', { request_id, instruction })

				if (!request_id) {
					console.warn('draw.request: no valid request_id found')
					return
				}
				if (!instruction || typeof instruction !== 'string') {
					room.localParticipant.publishData(
						new TextEncoder().encode(
							JSON.stringify({
								request_id,
								ok: false,
								error: 'Missing instruction',
							})
						),
						{ topic: 'draw.response' }
					)
					return
				}

				// Get all fairies from the FairyApp
				const fairyApp = (agent as any)?.fairyApp
				const allAgents = fairyApp?.agents?.getAgents() || [agent]

				if (allAgents.length === 0) {
					room.localParticipant.publishData(
						new TextEncoder().encode(
							JSON.stringify({
								request_id,
								ok: false,
								error: 'No fairies available',
							})
						),
						{ topic: 'draw.response' }
					)
					return
				}

				// Get the LEADER fairy (always index 0 - Alice Sparklewind)
				const leaderAgent = allAgents[0]

				// Verify leader has the drawFromLiveKitInstruction method
				if (typeof leaderAgent?.drawFromLiveKitInstruction !== 'function') {
					room.localParticipant.publishData(
						new TextEncoder().encode(
							JSON.stringify({
								request_id,
								ok: false,
								error: 'Leader fairy does not have drawFromLiveKitInstruction method',
							})
						),
						{ topic: 'draw.response' }
					)
					return
				}

				try {
					// Track the leader's current mode before starting
					const currentMode = leaderAgent.mode.getMode()
					console.log('[ChatPanel] Leader mode before draw:', currentMode)

					// Store this as a pending request - we'll send draw.response later
					// when the leader transitions to 'idling' mode (indicating project completion)
					pendingDrawRequestsRef.current.set(leaderAgent.id, {
						request_id,
						previousMode: currentMode,
					})

					// Send instruction ONLY to the leader
					// The leader will use orchestration mode to:
					// 1. Create a project (if not already in one)
					// 2. Plan the work and create tasks
					// 3. Delegate tasks to follower fairies (Bob & Charlie)
					await leaderAgent.drawFromLiveKitInstruction(instruction)

					// NOTE: We do NOT send draw.response here anymore!
					// It will be sent when the leader transitions to 'idling' mode
					// (see the useEffect hook that monitors mode changes)
					console.log('[ChatPanel] Draw instruction initiated, waiting for project completion...')
				} catch (err: any) {
					console.error('[ChatPanel] Error executing draw instruction:', err)
					// Remove from pending on error
					pendingDrawRequestsRef.current.delete(leaderAgent.id)
					room.localParticipant.publishData(
						new TextEncoder().encode(
							JSON.stringify({
								request_id,
								ok: false,
								error: err?.message ?? String(err),
							})
						),
						{ topic: 'draw.response' }
					)
				}

				return
			}

			// --- DRAW INTERRUPT: Stop current project when user speaks ---
			if (topic === 'draw.interrupt') {
				const payloadText = new TextDecoder().decode(payload)
				let decoded: any

				try {
					decoded = JSON.parse(payloadText)
				} catch (parseErr) {
					console.error('Failed to parse draw.interrupt payload:', parseErr)
					return
				}

				console.log('[ChatPanel] Received draw.interrupt:', decoded)

				// Get all fairies from the FairyApp
				const fairyApp = (agent as any)?.fairyApp
				const allAgents = fairyApp?.agents?.getAgents() || [agent]

				// Interrupt all agents and cancel their projects
				for (const agentInstance of allAgents) {
					try {
						// Get the agent's current project
						const project = agentInstance.getProject?.()

						// Interrupt the agent to idling mode
						if (typeof agentInstance.interrupt === 'function') {
							agentInstance.interrupt({ mode: 'idling', input: null })
							console.log(`[ChatPanel] Interrupted agent ${agentInstance.id} to idling mode`)
						}

						// Delete project if present
						if (project && fairyApp?.projects) {
							fairyApp.projects.deleteProjectAndAssociatedTasks(project.id)
							console.log(`[ChatPanel] Deleted project ${project.id}`)
						}
					} catch (err) {
						console.error(`[ChatPanel] Error interrupting agent ${agentInstance.id}:`, err)
					}
				}

				// Clear all pending draw requests and send cancelled response for each
				pendingDrawRequestsRef.current.forEach((pendingRequest, agentId) => {
					console.log(
						`[ChatPanel] Cancelling pending draw request ${pendingRequest.request_id} for agent ${agentId}`
					)
					room.localParticipant.publishData(
						new TextEncoder().encode(
							JSON.stringify({
								request_id: pendingRequest.request_id,
								ok: false,
								error: 'Interrupted by user',
								interrupted: true,
							})
						),
						{ topic: 'draw.response' }
					)
				})
				pendingDrawRequestsRef.current.clear()

				return
			}

			// --- RESET: Clear the canvas ---
			if (topic === 'reset.request') {
				const payloadText = new TextDecoder().decode(payload)
				let decoded: any

				try {
					decoded = JSON.parse(payloadText)
				} catch (parseErr) {
					console.error('Failed to parse reset.request payload:', parseErr)
					return
				}

				const requestId = decoded?.request_id
				console.log('[RESET] Received reset.request, request_id:', requestId)

				if (!requestId) {
					console.warn('reset.request: no valid request_id found')
					return
				}

				try {
					// Get the editor from the agent
					const editor = agent.editor

					// Clear the canvas by deleting all shapes on the current page
					const shapeIds = editor.getCurrentPageShapeIds()
					if (shapeIds.size > 0) {
						editor.deleteShapes([...shapeIds])
						console.log('[RESET] Cleared', shapeIds.size, 'shapes from canvas')
					} else {
						console.log('[RESET] Canvas was already empty')
					}

					// Send success response back to backend
					room.localParticipant.publishData(
						new TextEncoder().encode(
							JSON.stringify({
								request_id: requestId,
								ok: true,
							})
						),
						{ topic: 'reset.response' }
					)
					console.log('[RESET] Sent reset.response OK')
				} catch (e: any) {
					console.error('[RESET] Error clearing canvas:', e)
					// Send error response
					room.localParticipant.publishData(
						new TextEncoder().encode(
							JSON.stringify({
								request_id: requestId,
								ok: false,
								error: e?.message ?? String(e),
							})
						),
						{ topic: 'reset.response' }
					)
					console.log('[RESET] Sent reset.response ERROR:', e?.message)
				}

				return
			}

			// --- UI Messages (same) ---
			if (topic === 'ui.speak' || topic === 'ui.question') {
				const payloadText = new TextDecoder().decode(payload)
				let decoded: any
				try {
					decoded = JSON.parse(payloadText)
				} catch (e) {
					console.error('Failed to parse ui payload:', e)
					return
				}

				const text = (decoded?.text ?? '').trim()
				if (!text) return

				const ts = Date.parse(decoded?.ts ?? '') || Number(decoded?.timestamp ?? '') || Date.now()

				onUi({
					id: `${topic}:${decoded?.ts ?? ts}:${text.slice(0, 16)}`,
					kind: topic === 'ui.speak' ? 'ai_speak' : 'ai_question',
					text,
					ts,
				})

				return
			}

			// --- UI Curriculum Details ---
			if (topic === 'ui.curriculum_details') {
				const payloadText = new TextDecoder().decode(payload)
				let decoded: any
				try {
					decoded = JSON.parse(payloadText)
				} catch (e) {
					console.error('Failed to parse ui.curriculum_details payload:', e)
					return
				}

				const text = (decoded?.text ?? '').trim()
				if (!text) return

				const ts = Date.parse(decoded?.ts ?? '') || Number(decoded?.timestamp ?? '') || Date.now()

				onUi({
					id: `ui.curriculum_details:${decoded?.ts ?? ts}:${text.slice(0, 16)}`,
					kind: 'ai_curriculum',
					text,
					ts,
				})

				return
			}
		}

		room.on(RoomEvent.DataReceived, handleDataReceived)
		return () => {
			room.off(RoomEvent.DataReceived, handleDataReceived)
		}
	}, [room, agent, onUi])

	// Monitor agent mode changes to detect project completion
	useEffect(() => {
		if (!room || !agent) return

		// Poll for mode changes every 500ms
		const intervalId = setInterval(() => {
			const fairyApp = (agent as any)?.fairyApp
			if (!fairyApp) return

			const allAgents = fairyApp?.agents?.getAgents() || []

			allAgents.forEach((agentInstance: FairyAgent) => {
				const pendingRequest = pendingDrawRequestsRef.current.get(agentInstance.id)
				if (!pendingRequest) return

				const currentMode = agentInstance.mode.getMode()

				// Update the tracked mode if agent entered orchestration
				if (
					currentMode === 'duo-orchestrating-active' &&
					pendingRequest.previousMode === 'idling'
				) {
					console.log(`[ChatPanel] Agent ${agentInstance.id} entered duo-orchestrating-active mode`)
					pendingRequest.previousMode = 'duo-orchestrating-active'
				}

				// If the agent transitioned from orchestrating back to 'idling', the project is complete
				if (
					currentMode === 'idling' &&
					pendingRequest.previousMode === 'duo-orchestrating-active'
				) {
					console.log(
						`[ChatPanel] ✅ Project completed! Agent ${agentInstance.id} transitioned from duo-orchestrating-active to idling. Sending draw.response for request ${pendingRequest.request_id}`
					)

					// Send the success response
					room.localParticipant.publishData(
						new TextEncoder().encode(
							JSON.stringify({ request_id: pendingRequest.request_id, ok: true })
						),
						{ topic: 'draw.response' }
					)

					// Remove from pending
					pendingDrawRequestsRef.current.delete(agentInstance.id)
				}
			})
		}, 500)

		return () => {
			clearInterval(intervalId)
		}
	}, [room, agent])

	return null
}

export function ChatPanel({ agent }: { agent?: FairyAgent }) {
	const auth = useAuth()
	const navigate = useNavigate()
	const [lkConnect, setLkConnect] = useState(false)
	const [lkToken, setLkToken] = useState<string | undefined>()
	const [lkUrl, setLkUrl] = useState<string | undefined>()
	const [lkLoading, setLkLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const [messages, setMessages] = useState<ChatMsg[]>([])

	// Track pending draw requests: Map<leaderAgentId, { request_id, previousMode }>
	const pendingDrawRequestsRef = useRef<Map<string, { request_id: string; previousMode: string }>>(
		new Map()
	)

	const handleLogout = useCallback(() => {
		auth.signOut().then(() => {
			clearLocalSessionState()
			navigate('/')
		})
	}, [auth, navigate])

	const handleViewCourseDetails = useCallback(() => {
		window.open('/course-detail-info', '_blank')
	}, [])

	const pushMessage = useCallback((m: ChatMsg) => {
		setMessages((prev) => {
			const idx = prev.findIndex((x) => x.id === m.id)

			// update existing (streaming transcript / streaming ui message)
			if (idx !== -1) {
				const next = [...prev]
				const old = next[idx]

				if (old.text !== m.text) {
					next[idx] = { ...old, text: m.text, ts: Math.min(old.ts, m.ts) }
				}
				return next.sort((a, b) => a.ts - b.ts)
			}

			// insert new
			return [...prev, m].sort((a, b) => a.ts - b.ts)
		})
	}, [])

	const handleStartLiveKit = useCallback(async () => {
		if (lkConnect) {
			setLkConnect(false)
			return
		}

		setError(null)
		setLkLoading(true)
		console.log('Starting LiveKit session')

		// Use different prompts based on authentication status
		const isLoggedIn = auth.isSignedIn
		const prompt = isLoggedIn
			? "start teaching me the below content, cover the complete content and don't divert much"
			: 'I want to talk you about the course and how can you help me in learning?'

		try {
			const response = await fetch('http://localhost:3001/start-learning', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ prompt }),
			})

			const data: any = await response.json()

			if (data.status !== 'success') {
				setError(data.message || 'Failed to start learning session')
				return
			}

			const tokenToUse = data.livekit?.token
			if (!tokenToUse) {
				setError('Token missing in API response')
				return
			}

			setLkToken(tokenToUse)
			setLkUrl('wss://project-1234-6tcs93tg.livekit.cloud')
			setLkConnect(true)
		} catch {
			setError('Failed to start learning session')
		} finally {
			setLkLoading(false)
		}
	}, [lkConnect, auth.isSignedIn])

	// Show loading state if agent is not available yet
	if (!agent) {
		return (
			<div
				className="chat-panel tl-theme__dark"
				style={{
					display: 'flex',
					flexDirection: 'column',
					gap: 12,
					padding: 12,
					height: '100%',
					minHeight: 0,
					alignItems: 'center',
					justifyContent: 'center',
				}}
			>
				<div style={{ fontSize: 14, opacity: 0.6 }}>Initializing teacher...</div>
			</div>
		)
	}

	return (
		<div
			className="chat-panel tl-theme__dark"
			style={{
				display: 'flex',
				flexDirection: 'column',
				gap: 12,
				padding: 12,
				height: '100%',
				minHeight: 0,
			}}
		>
			<div
				style={{
					display: 'flex',
					gap: 10,
					alignItems: 'center',
					flexWrap: 'wrap',
				}}
			>
				<button
					onClick={handleStartLiveKit}
					disabled={lkLoading}
					style={{ padding: '8px 10px', borderRadius: 10 }}
				>
					{lkConnect ? 'Stop Learning' : lkLoading ? 'Starting…' : 'Start Learning'}
				</button>

				{auth.isSignedIn ? (
					<button
						onClick={handleLogout}
						style={{
							padding: '8px 10px',
							borderRadius: 10,
							background: '#ef4444',
							color: 'white',
							border: 'none',
							cursor: 'pointer',
						}}
					>
						Logout
					</button>
				) : (
					<SignInButton mode="modal">
						<button
							style={{
								padding: '8px 10px',
								borderRadius: 10,
								background: '#3b82f6',
								color: 'white',
								border: 'none',
								cursor: 'pointer',
							}}
						>
							Login
						</button>
					</SignInButton>
				)}

				{error ? <span style={{ color: 'salmon', fontSize: 12 }}>{error}</span> : null}
			</div>

			{lkToken && lkUrl ? (
				<div
					style={{
						display: 'flex',
						flexDirection: 'column',
						gap: 10,
						flex: 1,
						minHeight: 0,
					}}
				>
					<LiveKitRoom
						token={lkToken}
						serverUrl={lkUrl}
						connect={lkConnect}
						audio={true}
						video={false}
						options={{ publishDefaults: { simulcast: false } }}
						connectOptions={{ autoSubscribe: true }}
						style={{
							display: 'flex',
							flexDirection: 'column',
							flex: 1,
							minHeight: 0,
							width: '100%',
						}}
					>
						<div
							style={{
								display: 'flex',
								flexDirection: 'column',
								flex: 1,
								minHeight: 0,
								width: '100%',
								gap: 10,
							}}
						>
							{/* fixed-height controls */}
							<div
								style={{
									flex: '0 0 auto',
									display: 'flex',
									flexDirection: 'column',
									gap: 10,
								}}
							>
								<RoomAudioRenderer />
								<StartAudio label="Enable audio" />
								<ConnectionStatus />
								<MicPushToTalk hotkey="Space" />
							</div>

							{/* scrollable chat */}
							<div
								style={{
									flex: 1,
									minHeight: 0,
									display: 'flex',
									flexDirection: 'column',
								}}
							>
								<DataHandler
									agent={agent}
									onUi={pushMessage}
									pendingDrawRequestsRef={pendingDrawRequestsRef}
								/>
								<TranscriptionCollector onUser={pushMessage} />
								<UnifiedChat items={messages} onViewCourseDetails={handleViewCourseDetails} />
							</div>
						</div>
					</LiveKitRoom>
				</div>
			) : null}
		</div>
	)
}
