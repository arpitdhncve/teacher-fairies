import {
	MarkDroneTaskDoneAction,
	Streaming,
	createAgentActionInfo,
	toTaskId,
} from '@tldraw/fairy-shared'
import { uniqueId } from 'tldraw'
import { AgentHelpers } from '../fairy-agent/AgentHelpers'
import { AgentActionUtil } from './AgentActionUtil'

export class MarkDroneTaskDoneActionUtil extends AgentActionUtil<MarkDroneTaskDoneAction> {
	static override type = 'mark-my-task-done' as const

	override getInfo(action: Streaming<MarkDroneTaskDoneAction>) {
		// Look for in-progress tasks first, then fall back to done tasks
		// (getInfo may be called after applyAction has already marked the tasks done)
		const currentWork = this.agent.getWork()
		const inProgressTasks = currentWork.tasks.filter((task) => task.status === 'in-progress')
		const doneTasks = currentWork.tasks.filter((task) => task.status === 'done')
		const tasks = inProgressTasks.length > 0 ? inProgressTasks : doneTasks

		const isReviewTask = tasks.some((t) => t.title.startsWith('Self-Review'))
		const taskCount = tasks.length
		const isPlural = taskCount !== 1
		const taskTitle = tasks[0]?.title

		if (isReviewTask) {
			return createAgentActionInfo({
				icon: 'search',
				description: action.complete ? 'Review complete' : 'Reviewing work...',
				ircMessage: action.complete ? 'I finished reviewing my work.' : null,
				pose: 'reviewing',
				canGroup: () => false,
			})
		}

		return createAgentActionInfo({
			icon: 'note',
			description: action.complete
				? `Completed ${taskCount} task${isPlural ? 's' : ''}`
				: `Completing task${isPlural ? 's' : ''}...`,
			ircMessage: action.complete
				? taskCount === 1 && taskTitle
					? `I completed a task: ${taskTitle}`
					: `I completed ${taskCount} task${isPlural ? 's' : ''}.`
				: null,
			pose: 'writing',
			canGroup: () => false,
		})
	}

	override applyAction(action: Streaming<MarkDroneTaskDoneAction>, _helpers: AgentHelpers) {
		if (!action.complete) return

		const currentWork = this.agent.getWork()
		// Mark ALL in-progress tasks as done (follower completes all assigned tasks in one session)
		const inProgressTasks = currentWork.tasks.filter((task) => task.status === 'in-progress')
		if (inProgressTasks.length === 0) {
			this.agent.interrupt({
				input:
					'You are not currently working on any task. You can only mark a task as done if you are actively working on it.',
			})
			return
		}

		// Mark all in-progress tasks as done
		inProgressTasks.forEach((task) => {
			this.agent.fairyApp.tasks.setTaskStatusAndNotify(task.id, 'done')
		})

		// Build completion message listing all completed tasks
		const taskSummary =
			inProgressTasks.length === 1
				? `I just finished the task.\nID: "${inProgressTasks[0].id}"\nTitle: "${inProgressTasks[0].title}"\nDescription: "${inProgressTasks[0].text}".`
				: `I just finished ${inProgressTasks.length} tasks:\n${inProgressTasks
						.map((t) => `- ID: "${t.id}" | Title: "${t.title}"`)
						.join('\n')}`

		this.agent.chat.push(
			{
				id: uniqueId(),
				type: 'memory-transition',
				memoryLevel: 'project',
				agentFacingMessage: `[ACTIONS]: <Task actions filtered for brevity>`,
				userFacingMessage: null,
			},
			{
				id: uniqueId(),
				type: 'prompt',
				promptSource: 'self',
				memoryLevel: 'project',
				agentFacingMessage: taskSummary,
				userFacingMessage: null,
			}
		)

		const project = this.agent.getProject()
		if (!project) {
			this.agent.interrupt({ mode: 'standing-by', input: null })
			return
		}

		// Check if we just finished the review task
		const isReviewTask = inProgressTasks.some((t) => t.title === 'Self-Review: Check your work')

		if (!isReviewTask) {
			// We just finished normal work. Create a self-review task!
			const reviewTaskId = toTaskId(uniqueId())
			const reviewTaskBounds = inProgressTasks[0] // Use bounds of first completed task
				? {
						x: inProgressTasks[0].x,
						y: inProgressTasks[0].y,
						w: inProgressTasks[0].w,
						h: inProgressTasks[0].h,
					}
				: { x: 0, y: 0, w: 100, h: 100 }

			this.agent.fairyApp.tasks.createTask({
				id: reviewTaskId,
				title: 'Self-Review: Check your work',
				text: 'Perform a strict review of the work you just completed. Check for: 1. Overlaps (no shapes should overlap unintentionally), 2. Readability (text must be legible/contrast), 3. Alignment (consistent spacing/alignment), 4. Completeness (did you fulfill requirements?). If you find issues, fix them immediately.',
				projectId: project.id,
				assignedTo: this.agent.id,
				status: 'todo',
				...reviewTaskBounds,
			})

			// Note: The existing logic below ("Check for remaining TODO tasks") will automatically
			// pick up this new task because we just created it with status 'todo' and assigned it to self.
		}

		// Check for remaining TODO tasks and pick next batch
		const BATCH_SIZE = 3

		// Check for remaining TODO tasks assigned to this follower
		const allMyTasks = this.agent.fairyApp.tasks
			.getTasksByProjectId(project.id)
			.filter((task) => task.assignedTo === this.agent.id)
		const remainingTodoTasks = allMyTasks.filter((task) => task.status === 'todo')

		if (remainingTodoTasks.length > 0) {
			// Pick next batch of tasks
			const nextBatch = remainingTodoTasks.slice(0, BATCH_SIZE)

			// Mark them as in-progress
			nextBatch.forEach((task) => {
				this.agent.fairyApp.tasks.setTaskStatus(task.id, 'in-progress')
			})

			// Build task list for the message
			const taskDescriptions = nextBatch
				.map((task) => `- ${task.title}${task.text ? `: ${task.text}` : ''}`)
				.join('\n')

			console.log(
				`[MarkTaskDone] Picking next batch of ${nextBatch.length} tasks ` +
					`(${remainingTodoTasks.length - nextBatch.length} remaining after this batch)`
			)

			// Continue working on next batch (don't go to standing-by)
			this.agent.schedule({
				agentMessages: [
					`Completed previous batch. Continue with next ${nextBatch.length} task(s):\n\n${taskDescriptions}`,
				],
				bounds: { x: nextBatch[0].x, y: nextBatch[0].y, w: nextBatch[0].w, h: nextBatch[0].h },
			})
			return
		}

		// No more tasks - go to standing-by and wake leader
		this.agent.interrupt({ mode: 'standing-by', input: null })

		// Wake up the leader (duo-orchestrator)
		const leaderMember = project.members.find((m) => m.role === 'duo-orchestrator')
		if (leaderMember) {
			const leaderAgent = this.agent.fairyApp.agents
				.getAgents()
				.find((a) => a.id === leaderMember.id)
			if (leaderAgent && leaderAgent.mode.getMode() === 'duo-orchestrating-waiting') {
				const completionMessage =
					inProgressTasks.length === 1
						? `Task "${inProgressTasks[0].title}" has been completed by your partner.`
						: `${inProgressTasks.length} tasks have been completed by your partner.`

				leaderAgent.schedule({
					agentMessages: [
						`${completionMessage}

<batch_complete>
The follower has completed their assigned tasks AND performed a self-review.
You do NOT need to review their work again.
</batch_complete>

<required_action>
- If more work needed for the original request: Create the next batch of tasks (max 3).
- If no issues AND all work is complete: Call end-duo-project.
</required_action>`,
					],
				})
			}
		}
	}
}
