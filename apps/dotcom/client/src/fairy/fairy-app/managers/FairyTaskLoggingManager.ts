import { FairyTask, FocusedShape, convertTldrawShapeToFocusedShape } from '@tldraw/fairy-shared'
import { uniqueId } from 'tldraw'
import { BaseFairyAppManager } from './BaseFairyAppManager'
import { AgentHelpers } from '../../fairy-agent/AgentHelpers'

const TASK_LOGS_API_URL = 'http://localhost:3001'

interface PendingTaskLog {
	id: string
	taskId: string
	sessionId: string | null
	canvasStateBefore: FocusedShape[]
	canvasImageBefore: string | null
	taskPrompt: string
	createdAt: Date
}

/**
 * Manager for logging fairy task execution.
 * Only logs tasks executed by follower fairies (drone role).
 */
export class FairyTaskLoggingManager extends BaseFairyAppManager {
	/**
	 * Map of task ID to pending log data (tasks that have started but not finished)
	 */
	private pendingLogs: Map<string, PendingTaskLog> = new Map()

	/**
	 * Get the current session ID from localStorage
	 */
	private getSessionId(): string | null {
		if (typeof window === 'undefined') return null
		return localStorage.getItem('agent_session_id')
	}

	/**
	 * Capture the current canvas state (normalized shapes and image)
	 */
	private async captureCanvasState(): Promise<{
		shapes: FocusedShape[]
		image: string | null
	}> {
		const firstAgent = this.fairyApp.agents.getAgents()[0]
		if (!firstAgent) {
			return { shapes: [], image: null }
		}

		const { editor } = firstAgent
		const shapes = editor.getCurrentPageShapes()
		const helpers = new AgentHelpers(firstAgent)

		// Normalize shapes
		const simpleShapes: FocusedShape[] = shapes.map((s) =>
			convertTldrawShapeToFocusedShape(editor, s)
		)
		const normalizedShapes = simpleShapes.map((s) =>
			helpers.roundShape(helpers.applyOffsetToShape(s))
		)

		// Capture image
		let imageDataUrl: string | null = null
		const shapeIds = Array.from(editor.getCurrentPageShapeIds())

		if (shapeIds.length > 0) {
			try {
				const viewportBounds = editor.getViewportPageBounds()
				const { blob } = await editor.toImage(shapeIds, {
					format: 'png',
					background: true,
					scale: 1,
					padding: 0,
					...(viewportBounds ? { bounds: viewportBounds } : {}),
				})

				imageDataUrl = await new Promise<string>((resolve, reject) => {
					const fr = new FileReader()
					fr.onload = () => resolve(fr.result as string)
					fr.onerror = () => reject(fr.error ?? new Error('Failed to read image'))
					fr.readAsDataURL(blob)
				})
			} catch (e) {
				console.warn('[TaskLogging] Failed to capture canvas image:', e)
			}
		}

		return { shapes: normalizedShapes, image: imageDataUrl }
	}

	/**
	 * Build the complete task prompt from task fields
	 */
	private buildTaskPrompt(task: FairyTask): string {
		const parts: string[] = []
		
		if (task.title) {
			parts.push(`Task: ${task.title}`)
		}
		if (task.text) {
			parts.push(`Description: ${task.text}`)
		}
		if (task.x !== undefined && task.y !== undefined) {
			parts.push(`Location: (${task.x}, ${task.y})`)
		}
		if (task.w !== undefined && task.h !== undefined) {
			parts.push(`Bounds: ${task.w}x${task.h}`)
		}
		if (task.color) {
			parts.push(`Color: ${task.color}`)
		}
		if (task.fill) {
			parts.push(`Fill: ${task.fill}`)
		}
		if (task.successCriteria) {
			parts.push(`Success Criteria: ${task.successCriteria}`)
		}

		return parts.join('\n')
	}

	/**
	 * Check if the assigned agent is a drone (follower)
	 */
	isDroneAgent(task: FairyTask): boolean {
		if (!task.assignedTo) return false
		
		const project = task.projectId 
			? this.fairyApp.projects.getProjectById(task.projectId)
			: null
		
		if (!project) return false
		
		const member = project.members.find((m) => m.id === task.assignedTo)
		return member?.role === 'drone'
	}

	/**
	 * Start logging a task (called when task status changes to 'in-progress')
	 */
	async startTaskLog(task: FairyTask): Promise<void> {
		// Only log drone tasks
		if (!this.isDroneAgent(task)) {
			console.log('[TaskLogging] Skipping non-drone task:', task.id)
			return
		}

		console.log('[TaskLogging] Starting task log for:', task.id)
		
		const logId = uniqueId()
		const sessionId = this.getSessionId()
		const { shapes, image } = await this.captureCanvasState()
		const taskPrompt = this.buildTaskPrompt(task)

		const pendingLog: PendingTaskLog = {
			id: logId,
			taskId: task.id,
			sessionId,
			canvasStateBefore: shapes,
			canvasImageBefore: image,
			taskPrompt,
			createdAt: new Date(),
		}

		this.pendingLogs.set(task.id, pendingLog)

		// Send initial log to server
		try {
			const response = await fetch(`${TASK_LOGS_API_URL}/task-logs`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					id: logId,
					sessionId,
					taskId: task.id,
					taskTitle: task.title,
					taskDescription: task.text,
					taskPrompt,
					status: 'in-progress',
					canvasStateBefore: shapes,
					canvasScreenshotBefore: image,
					projectId: task.projectId,
					agentId: task.assignedTo,
				}),
			})

			if (!response.ok) {
				console.error('[TaskLogging] Failed to create task log:', await response.text())
			}
		} catch (error) {
			console.error('[TaskLogging] Error sending task log:', error)
		}
	}

	/**
	 * Complete a task log (called when task status changes to 'done')
	 */
	async completeTaskLog(
		task: FairyTask,
		llmPrompt?: string,
		llmOutput?: any
	): Promise<void> {
		const pendingLog = this.pendingLogs.get(task.id)
		if (!pendingLog) {
			console.log('[TaskLogging] No pending log found for task:', task.id)
			return
		}

		console.log('[TaskLogging] Completing task log for:', task.id)

		const { shapes, image } = await this.captureCanvasState()

		// Update log on server
		try {
			const response = await fetch(`${TASK_LOGS_API_URL}/task-logs/${pendingLog.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					status: 'done',
					canvasStateAfter: shapes,
					canvasScreenshotAfter: image,
					prompt: llmPrompt || null,
					output: llmOutput || null,
				}),
			})

			if (!response.ok) {
				console.error('[TaskLogging] Failed to update task log:', await response.text())
			}
		} catch (error) {
			console.error('[TaskLogging] Error updating task log:', error)
		}

		// Clean up pending log
		this.pendingLogs.delete(task.id)
	}

	/**
	 * Reset the manager
	 */
	reset(): void {
		this.pendingLogs.clear()
	}
}
