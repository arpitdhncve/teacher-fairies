import {
	CreateDuoTaskAction,
	Streaming,
	createAgentActionInfo,
	toTaskId,
} from '@tldraw/fairy-shared'
import { AgentHelpers } from '../fairy-agent/AgentHelpers'
import { AgentActionUtil } from './AgentActionUtil'

// Creates a task for a duo project with a specifiable assignedTo id
export class CreateDuoTaskActionUtil extends AgentActionUtil<CreateDuoTaskAction> {
	static override type = 'create-duo-task' as const

	override getInfo(action: Streaming<CreateDuoTaskAction>) {
		return createAgentActionInfo({
			icon: 'note',
			description: action.complete
				? `Planned task: ${action.title}`
				: `Planning task${action.title ? `: ${action.title}` : ''}${action.text ? `\n\n${action.text}` : ''}`,
			ircMessage: action.complete ? `I created a task: ${action.title}` : null,
			pose: 'writing',
		})
	}

	override applyAction(action: Streaming<CreateDuoTaskAction>, helpers: AgentHelpers) {
		if (!action.complete) return

		const project = this.agent.getProject()
		if (!project) {
			this.agent.interrupt({
				input: 'You are not currently part of a project. You must be in a project to create tasks.',
			})
			return
		}

		const assignedToId = action.assignedTo
		const assignedAgentsProject = this.agent.fairyApp.projects.getProjectByAgentId(assignedToId)
		if (!assignedAgentsProject || assignedAgentsProject.id !== project.id) {
			this.agent.interrupt({
				input: `Fairy ${assignedToId} is not in the same project as you. You may only assign tasks to your partner in the same duo project.`,
			})
			return
		}

		// todo don't allow them to assign to themselves for now

		const bounds = helpers.removeOffsetFromBox({
			x: action.x,
			y: action.y,
			w: action.w,
			h: action.h,
		})

		this.agent.fairyApp.tasks.createTask({
			id: action.taskId,
			title: action.title,
			text: action.text,
			assignedTo: action.assignedTo,
			projectId: project.id,
			status: 'todo',
			pageId: this.agent.editor.getCurrentPageId(),
			x: bounds.x,
			y: bounds.y,
			w: bounds.w,
			h: bounds.h,
		})

		// Increment the task counter
		const currentCount = project.createdTasksCount ?? 0
		const newCount = currentCount + 1
		this.agent.fairyApp.projects.updateProject(project.id, {
			createdTasksCount: newCount,
		})

		// Auto-insert review task after every 2 tasks
		if (newCount % 2 === 0) {
			const reviewNumber = newCount / 2
			const reviewTaskId = toTaskId(`review-${reviewNumber}`)

			// Use the fixed viewport/canvas bounds
			const viewportBounds = this.agent.editor.getViewportPageBounds()
			const canvasBounds = {
				x: viewportBounds.x,
				y: viewportBounds.y,
				w: viewportBounds.w,
				h: viewportBounds.h,
			}

			// Create the review task
			this.agent.fairyApp.tasks.createTask({
				id: reviewTaskId,
				title: 'Review and Fix Canvas Layout',
				text: "Improve the canvas layout if shapes are overlapping or text is vertically broken. Fix readability issues: ensure text is not vertically wrapped, shapes don't overlap unnecessarily, and the canvas is well-organized.",
				assignedTo: assignedToId, // Assign to the same agent (drone)
				projectId: project.id,
				status: 'todo',
				pageId: this.agent.editor.getCurrentPageId(),
				x: canvasBounds.x,
				y: canvasBounds.y,
				w: canvasBounds.w,
				h: canvasBounds.h,
			})

			console.log(
				`[AUTO-REVIEW] Created review task: "${reviewTaskId}" - Title: "Review and Fix Canvas Layout"`
			)
		}
	}
}
