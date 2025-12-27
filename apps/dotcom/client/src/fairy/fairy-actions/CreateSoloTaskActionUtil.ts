import {
	CreateTaskAction as CreateSoloTaskAction,
	Streaming,
	createAgentActionInfo,
	toTaskId,
} from '@tldraw/fairy-shared'
import { AgentHelpers } from '../fairy-agent/AgentHelpers'
import { AgentActionUtil } from './AgentActionUtil'

// Creates a task for themselves
export class CreateSoloTaskActionUtil extends AgentActionUtil<CreateSoloTaskAction> {
	static override type = 'create-task' as const

	override getInfo(_action: Streaming<CreateSoloTaskAction>) {
		return createAgentActionInfo({
			description: null,
			pose: 'writing',
		})
	}

	override applyAction(action: Streaming<CreateSoloTaskAction>, helpers: AgentHelpers) {
		if (!action.complete) return

		const bounds = helpers.removeOffsetFromBox({
			x: action.x,
			y: action.y,
			w: action.w,
			h: action.h,
		})

		// Create the main task
		this.agent.fairyApp.tasks.createTask({
			id: action.taskId,
			title: action.title,
			text: action.text,
			assignedTo: this.agent.id,
			status: 'todo',
			pageId: this.agent.editor.getCurrentPageId(),
			x: bounds.x,
			y: bounds.y,
			w: bounds.w,
			h: bounds.h,
		})

		// Increment the solo task counter
		const currentCount = this.agent.$soloCreatedTasksCount.get()
		const newCount = currentCount + 1
		this.agent.$soloCreatedTasksCount.set(newCount)

		console.log(
			`[SOLO-COUNTER] Task created: "${action.title}", counter: ${currentCount} → ${newCount}`
		)

		// Auto-inject review task after every 2 tasks
		console.log(`[SOLO-COUNTER] Check review: newCount=${newCount}, newCount % 2 = ${newCount % 2}`)
		if (newCount % 2 === 0) {
			const reviewNumber = newCount / 2
			const reviewTaskId = toTaskId(`solo-review-${reviewNumber}`)

			// Get full viewport page bounds for the review task
			const viewportBounds = this.agent.editor.getViewportPageBounds()

			this.agent.fairyApp.tasks.createTask({
				id: reviewTaskId,
				title: 'Review and Fix Canvas Layout',
				text: `Review the canvas layout and fix any visual issues:
- Fix text that is vertically broken or split across lines within shapes
- Resolve overlapping shapes or text elements
- Ensure all text fits properly within its container
- Improve overall readability and organization
- Adjust shape sizes if text is cut off`,
				assignedTo: this.agent.id,
				status: 'todo',
				pageId: this.agent.editor.getCurrentPageId(),
				x: viewportBounds.x,
				y: viewportBounds.y,
				w: viewportBounds.w,
				h: viewportBounds.h,
			})

			console.log(
				`[AUTO-REVIEW] Created solo review task: "${reviewTaskId}" after ${newCount} tasks`
			)
		}

		// Print the task list after every task creation
		console.log('[TASK LIST]', JSON.stringify(this.agent.fairyApp.tasks.getTasks(), null, 2))
	}
}
