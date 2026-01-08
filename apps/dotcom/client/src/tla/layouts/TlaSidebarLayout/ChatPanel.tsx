import { SignInButton, useAuth } from '@clerk/clerk-react'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
// ✅ swap TldrawAgent -> FairyAgent
import { FairyAgent } from '../../../fairy/fairy-agent/FairyAgent'
import { useViewportContext } from '../../hooks/useViewportContext'
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

	// Don't show anything if connected, or maybe a subtle dot?
	// Let's go with a subtle status indicator used in the Control Deck instead.
	// For now, let's make it a standalone small badge if not connected.

	if (s === ConnectionState.Connected) {
		return (
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					gap: 6,
					fontSize: 11,
					color: 'rgba(255,255,255,0.4)',
					fontWeight: 500,
					letterSpacing: '0.05em',
					textTransform: 'uppercase',
				}}
			>
				<div
					style={{
						width: 6,
						height: 6,
						borderRadius: '50%',
						background: '#10b981',
						boxShadow: '0 0 8px #10b981',
					}}
				/>
				Session Active
			</div>
		)
	}

	const label =
		s === ConnectionState.Connecting
			? 'Connecting...'
			: s === ConnectionState.Disconnected
				? 'Disconnected'
				: String(s)

	return (
		<div
			style={{
				display: 'inline-flex',
				alignItems: 'center',
				gap: 8,
				fontSize: 12,
				color: '#fbbf24', // Amber for non-connected states
				background: 'rgba(251, 191, 36, 0.1)',
				padding: '4px 10px',
				borderRadius: 99,
				border: '1px solid rgba(251, 191, 36, 0.2)',
			}}
		>
			<div
				style={{
					width: 6,
					height: 6,
					borderRadius: '50%',
					background: 'currentColor',
					animation: 'pulse 1.5s infinite',
				}}
			/>
			{label}
		</div>
	)
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
				flexDirection: 'column',
				gap: 8,
				marginTop: 8,
			}}
		>
			<style>
				{`
					@keyframes mic-pulse {
						0% { box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.4); }
						70% { box-shadow: 0 0 0 10px rgba(74, 222, 128, 0); }
						100% { box-shadow: 0 0 0 0 rgba(74, 222, 128, 0); }
					}
					@keyframes mic-wave {
						0%, 100% { transform: scaleY(1); }
						50% { transform: scaleY(1.5); }
					}
				`}
			</style>

			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					padding: '6px 8px 6px 16px',
					borderRadius: 16,
					background: 'rgba(255, 255, 255, 0.03)',
					border: '1px solid rgba(255, 255, 255, 0.08)',
					backdropFilter: 'blur(10px)',
				}}
			>
				{/* Status Indicator */}
				<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
					<div
						style={{
							width: 10,
							height: 10,
							borderRadius: '50%',
							background: micEnabled ? '#4ade80' : '#ef4444',
							boxShadow: micEnabled ? '0 0 12px #4ade80' : 'none',
							animation: micEnabled ? 'mic-pulse 2s infinite' : 'none',
							transition: 'all 0.3s ease',
						}}
					/>
					<div
						style={{
							fontSize: 13,
							fontWeight: 500,
							color: micEnabled ? '#ffffff' : 'rgba(255,255,255,0.6)',
							letterSpacing: '0.02em',
							width: 80, // Fixed width to prevent layout jump
						}}
					>
						{micEnabled ? 'Standard' : 'Muted'}
					</div>
				</div>

				{/* Action Button */}
				<button
					onClick={() => setMic(!micEnabled)}
					disabled={connection !== ConnectionState.Connected}
					style={{
						padding: '8px 16px',
						borderRadius: 10,
						fontSize: 13,
						fontWeight: 600,
						border: 'none',
						background: micEnabled
							? 'rgba(255,255,255,0.1)'
							: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
						color: '#ffffff',
						cursor: 'pointer',
						transition: 'all 0.2s ease',
						boxShadow: micEnabled ? 'none' : '0 2px 6px rgba(59, 130, 246, 0.3)',
					}}
					onMouseEnter={(e) => {
						if (!micEnabled && !e.currentTarget.disabled) {
							e.currentTarget.style.filter = 'brightness(1.1)'
						}
					}}
					onMouseLeave={(e) => {
						e.currentTarget.style.filter = 'brightness(1)'
					}}
				>
					{micEnabled ? 'Mute' : 'Unmute'}
				</button>
			</div>

			{/* Footnote */}
			<div
				style={{
					fontSize: 11,
					color: 'rgba(255,255,255,0.4)',
					textAlign: 'center',
					letterSpacing: '0.03em',
				}}
			>
				Hold{' '}
				<b
					style={{
						color: 'rgba(255,255,255,0.7)',
						borderBottom: '1px dotted rgba(255,255,255,0.3)',
					}}
				>
					{hotkey}
				</b>{' '}
				to speak temporarily
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
				marginTop: 16,
				width: '100%',
				flex: 1,
				minHeight: 0,
				overflowY: 'auto',
				display: 'flex',
				flexDirection: 'column',
				gap: 16,
				paddingRight: 8,
				paddingLeft: 4,
				// Custom scrollbar styling via CSS would be ideal, but inline for now:
				scrollbarWidth: 'thin',
				scrollbarColor: 'rgba(255,255,255,0.1) transparent',
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
							padding: '0 4px',
						}}
					>
						<div
							style={{
								maxWidth: '85%',
								padding: '12px 16px',
								borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
								fontSize: '14.5px',
								lineHeight: 1.5,
								letterSpacing: '0.01em',
								whiteSpace: 'pre-wrap',
								wordBreak: 'break-word',
								color: isMe ? '#ffffff' : '#f3f4f6', // Slightly softer white for AI text

								// Premium Styling
								background: isMe
									? 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' // Indigo to Violet
									: isCurriculum
										? 'linear-gradient(145deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.8))' // Deep Slate
										: isQuestion
											? 'linear-gradient(145deg, rgba(31, 41, 55, 0.7), rgba(17, 24, 39, 0.8))' // Gray
											: 'rgba(255, 255, 255, 0.04)', // Glassy default

								border: isMe
									? 'none'
									: isCurriculum
										? '1px solid rgba(59, 130, 246, 0.3)'
										: isQuestion
											? '1px solid rgba(234, 179, 8, 0.3)'
											: '1px solid rgba(255, 255, 255, 0.08)',

								boxShadow: isMe
									? '0 4px 12px rgba(124, 58, 237, 0.25)' // Purple glow for user
									: '0 2px 10px rgba(0, 0, 0, 0.1)', // Subtle shadow for AI

								backdropFilter: isMe ? 'none' : 'blur(10px)',
							}}
						>
							{isCurriculum ? (
								<div
									style={{
										display: 'flex',
										alignItems: 'center',
										gap: 6,
										fontSize: 11,
										textTransform: 'uppercase',
										letterSpacing: '0.05em',
										fontWeight: 600,
										color: '#60a5fa',
										marginBottom: 8,
									}}
								>
									<span>📚</span> Course Curriculum
								</div>
							) : isQuestion ? (
								<div
									style={{
										display: 'flex',
										alignItems: 'center',
										gap: 6,
										fontSize: 11,
										textTransform: 'uppercase',
										letterSpacing: '0.05em',
										fontWeight: 600,
										color: '#facc15',
										marginBottom: 8,
									}}
								>
									<span>❓</span> Question
								</div>
							) : null}

							<div style={{ position: 'relative', zIndex: 1 }}>{m.text}</div>

							{isCurriculum && (
								<button
									onClick={onViewCourseDetails}
									style={{
										marginTop: 14,
										width: '100%',
										padding: '10px 16px',
										borderRadius: 12,
										border: 'none',
										// Vibrant gradient button
										background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
										boxShadow:
											'0 4px 6px -1px rgba(59, 130, 246, 0.4), 0 2px 4px -1px rgba(59, 130, 246, 0.2)',
										color: '#fff',
										fontSize: 13,
										fontWeight: 600,
										cursor: 'pointer',
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
										gap: 6,
										transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
									}}
									onMouseEnter={(e) => {
										e.currentTarget.style.transform = 'translateY(-1px)'
										e.currentTarget.style.boxShadow = '0 6px 12px rgba(59, 130, 246, 0.5)'
										e.currentTarget.style.filter = 'brightness(1.05)'
									}}
									onMouseLeave={(e) => {
										e.currentTarget.style.transform = 'translateY(0)'
										e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(59, 130, 246, 0.4)'
										e.currentTarget.style.filter = 'brightness(1)'
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
		// Stop the LiveKit/agent session
		setLkConnect(false)
		// Open course details page in new tab
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

	const viewportContext = useViewportContext()

	const handleStartLiveKit = useCallback(async () => {
		if (lkConnect) {
			setLkConnect(false)
			return
		}

		setError(null)
		setLkLoading(true)
		console.log('Starting LiveKit session')

		// Use different prompts based on authentication status and viewport
		const isLoggedIn = auth.isSignedIn
		const { isMobile, isCanvasVisible, deviceType } = viewportContext

		// Add mobile context to the prompt so the AI knows user can't see canvas
		const mobileContextNote = isMobile
			? ' Note: The user is on a mobile device and cannot see the canvas/whiteboard. Focus on verbal explanations and avoid references to visual elements on the canvas.'
			: ''

		const prompt = isLoggedIn
			? `start teaching me the below content, cover the complete content and don't divert much${mobileContextNote}`
			: `I want to talk you about the course and how can you help me in learning?${mobileContextNote}`

		try {
			const response = await fetch('http://localhost:3001/start-learning', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					prompt,
					viewportContext: {
						isMobile,
						isCanvasVisible,
						deviceType,
					},
				}),
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
			setLkUrl('wss://adweew-jcas7wmr.livekit.cloud')
			setLkConnect(true)
		} catch {
			setError('Failed to start learning session')
		} finally {
			setLkLoading(false)
		}
	}, [lkConnect, auth.isSignedIn, viewportContext])

	// Show loading state if agent is not available yet
	if (!agent) {
		return (
			<div
				className="chat-panel tl-theme__dark"
				style={{
					display: 'flex',
					flexDirection: 'column',
					gap: 16,
					padding: 20,
					height: '100%',
					minHeight: 0,
					alignItems: 'center',
					justifyContent: 'center',
				}}
			>
				<div style={{ position: 'relative', width: 60, height: 60 }}>
					<div
						style={{
							position: 'absolute',
							inset: 0,
							borderRadius: '50%',
							border: '2px solid rgba(99, 102, 241, 0.2)',
						}}
					/>
					<div
						style={{
							position: 'absolute',
							inset: 0,
							borderRadius: '50%',
							border: '2px solid transparent',
							borderTopColor: '#6366f1',
							animation: 'spin 1s linear infinite',
						}}
					/>
					<style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
				</div>
				<div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.02em' }}>
					Initializing Teacher...
				</div>
			</div>
		)
	}

	return (
		<div
			className="chat-panel tl-theme__dark"
			style={{
				display: 'flex',
				flexDirection: 'column',
				gap: 16,
				padding: '20px 24px',
				height: '100%',
				minHeight: 0,
			}}
		>
			<div
				style={{
					display: 'flex',
					gap: 12,
					alignItems: 'center',
					justifyContent: 'space-between',
					paddingBottom: 16,
					borderBottom: '1px solid rgba(255,255,255,0.06)',
					marginBottom: 4,
				}}
			>
				<button
					onClick={handleStartLiveKit}
					disabled={lkLoading}
					style={{
						padding: '10px 16px',
						borderRadius: 12,
						background: lkConnect
							? 'rgba(239, 68, 68, 0.15)' // Subtle Red for Stop
							: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', // Premium Gradient
						color: lkConnect ? '#fca5a5' : '#ffffff',
						border: lkConnect ? '1px solid rgba(239, 68, 68, 0.3)' : 'none',
						fontSize: 14,
						fontWeight: 600,
						cursor: 'pointer',
						flex: 1, // Take available space
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						boxShadow: lkConnect ? 'none' : '0 4px 14px rgba(124, 58, 237, 0.4)', // Glow
						transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
					}}
					onMouseEnter={(e) => {
						if (!e.currentTarget.disabled) {
							e.currentTarget.style.transform = 'translateY(-1px)'
							e.currentTarget.style.filter = 'brightness(1.1)'
						}
					}}
					onMouseLeave={(e) => {
						e.currentTarget.style.transform = 'translateY(0)'
						e.currentTarget.style.filter = 'brightness(1)'
					}}
				>
					{lkConnect ? 'Stop Session' : lkLoading ? 'Connecting...' : 'Start Learning'}
				</button>

				{auth.isSignedIn ? (
					<button
						onClick={handleLogout}
						style={{
							padding: '10px 14px',
							borderRadius: 12,
							background: 'transparent',
							color: 'rgba(255, 255, 255, 0.7)',
							border: '1px solid rgba(255, 255, 255, 0.15)',
							cursor: 'pointer',
							fontSize: 13,
							fontWeight: 500,
							transition: 'all 0.2s ease',
						}}
						title="Sign Out"
						onMouseEnter={(e) => {
							e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
							e.currentTarget.style.color = '#fff'
							e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)'
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.background = 'transparent'
							e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'
							e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)'
						}}
					>
						Logout
					</button>
				) : (
					<SignInButton mode="modal">
						<button
							style={{
								padding: '10px 16px',
								borderRadius: 12,
								background: 'transparent', // No grey background
								color: '#fff',
								border: '1px solid rgba(255, 255, 255, 0.2)',
								cursor: 'pointer',
								fontSize: 14,
								fontWeight: 600,
								backdropFilter: 'blur(10px)',
								transition: 'all 0.2s ease',
								boxShadow: '0 0 0 0 rgba(255,255,255,0)',
							}}
							onMouseEnter={(e) => {
								e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
								e.currentTarget.style.borderColor = '#fff'
								e.currentTarget.style.boxShadow = '0 0 15px rgba(255, 255, 255, 0.1)'
							}}
							onMouseLeave={(e) => {
								e.currentTarget.style.background = 'transparent'
								e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'
								e.currentTarget.style.boxShadow = '0 0 0 0 rgba(255,255,255,0)'
							}}
						>
							Login
						</button>
					</SignInButton>
				)}

				{error ? (
					<span style={{ color: '#f87171', fontSize: 12, position: 'absolute', bottom: -20 }}>
						{error}
					</span>
				) : null}
			</div>

			{lkToken && lkUrl ? (
				<div
					style={{
						display: 'flex',
						flexDirection: 'column',
						gap: 16,
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
									gap: 16,
								}}
							>
								<RoomAudioRenderer />
								<StartAudio label="Enable audio" />
								{/* ConnectionStatus removed from here, integrated into visual design elsewhere or just kept minimal if needed */}
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
