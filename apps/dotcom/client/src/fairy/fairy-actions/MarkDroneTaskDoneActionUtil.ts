import {
	MarkDroneTaskDoneAction,
	Streaming,
	createAgentActionInfo,
	FairyBatchConfig,
} from '@tldraw/fairy-shared'
import { uniqueId } from 'tldraw'
import { AgentHelpers } from '../fairy-agent/AgentHelpers'
import { AgentActionUtil } from './AgentActionUtil'
import { ReviewStrategyExecutor } from '../fairy-review/ReviewStrategyExecutor'

export class MarkDroneTaskDoneActionUtil extends AgentActionUtil<MarkDroneTaskDoneAction> {
	static override type = 'mark-my-task-done' as const

	/**
	 * Move fairy to the center of the given tasks' combined bounds.
	 * This keeps the camera focused on the work area when fairy enters idle state.
	 */
	private moveToTaskCenter(tasks: Array<{ x: number; y: number; w: number; h: number }>) {
		if (tasks.length === 0) return
		
		// Calculate bounding box of all tasks
		const minX = Math.min(...tasks.map(t => t.x))
		const minY = Math.min(...tasks.map(t => t.y))
		const maxX = Math.max(...tasks.map(t => t.x + t.w))
		const maxY = Math.max(...tasks.map(t => t.y + t.h))
		
		// Move to center of combined bounds
		this.agent.position.moveTo({
			x: (minX + maxX) / 2,
			y: (minY + maxY) / 2,
		})
	}

	override getInfo(action: Streaming<MarkDroneTaskDoneAction>) {
		const currentWork = this.agent.getWork()
		const inProgressTasks = currentWork.tasks.filter((task) => task.status === 'in-progress')
		const doneTasks = currentWork.tasks.filter((task) => task.status === 'done')
		const tasks = inProgressTasks.length > 0 ? inProgressTasks : doneTasks

		const taskCount = tasks.length
		const isPlural = taskCount !== 1
		const taskTitle = tasks[0]?.title

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

		const project = this.agent.getProject()
		const wasCleanupTask = inProgressTasks.some(ReviewStrategyExecutor.isCleanupTask)
		
		if (project && wasCleanupTask) {
			const executor = new ReviewStrategyExecutor()
			// Find leader (duo-orchestrator)
			const leaderMember = project.members.find((m) => m.role === 'duo-orchestrator')
			if (leaderMember) {
				const leaderAgent = this.agent.fairyApp.agents
					.getAgents()
					.find((a) => a.id === leaderMember.id)
				if (leaderAgent) {
					// Mark review as complete
					executor.onReviewComplete(project, leaderAgent, this.agent)
					
					// Check if there are remaining TODO tasks for this follower
					const allMyTasks = this.agent.fairyApp.tasks
						.getTasksByProjectId(project.id)
						.filter((task) => task.assignedTo === this.agent.id)
					const remainingTodoTasks = allMyTasks.filter((task) => task.status === 'todo')
					
					if (remainingTodoTasks.length === 0) {
						// No more TODO tasks - wake the leader to assess and continue
						console.log('[MarkTaskDone] Cleanup complete, no TODO tasks remaining - waking leader')
						// Move fairy to center of completed tasks before going idle
						this.moveToTaskCenter(inProgressTasks)
						this.agent.interrupt({ mode: 'standing-by', input: null })
						
						if (leaderAgent.mode.getMode() === 'duo-orchestrating-waiting') {
							leaderAgent.schedule({
								agentMessages: [
									`Your partner has completed the batch review/cleanup. All assigned tasks are done. Review if more work is needed, create next batch of tasks, or call end-duo-project if the project is complete.`,
								],
							})
						}
						return // Exit early - don't continue with normal flow
					}
					// If there are remaining TODO tasks, continue to the normal flow below
				}
			}
		}

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

		const proj = this.agent.getProject()
		if (!proj) {
			// Move fairy to center of completed tasks before going idle
			this.moveToTaskCenter(inProgressTasks)
			this.agent.interrupt({ mode: 'standing-by', input: null })
			return
		}

		// Check for remaining TODO tasks and pick next batch
		const allMyTasks = this.agent.fairyApp.tasks
			.getTasksByProjectId(proj.id)
			.filter((task) => task.assignedTo === this.agent.id)
		const remainingTodoTasks = allMyTasks.filter((task) => task.status === 'todo')

		const BATCH_SIZE = FairyBatchConfig.FOLLOWER_BATCH_SIZE

		// Check if we should do a batch review AFTER completing this batch
		// This check happens BEFORE checking for remaining tasks, so review triggers
		// even when there are no more TODO tasks (e.g., leader created 2, follower completed 2)
		const executor = new ReviewStrategyExecutor()
		const leaderMember = proj.members.find((m) => m.role === 'duo-orchestrator')
		if (leaderMember) {
			const leaderAgent = this.agent.fairyApp.agents
				.getAgents()
				.find((a) => a.id === leaderMember.id)
			if (leaderAgent && executor.shouldReviewAfterBatch(proj, leaderAgent, this.agent)) {
				// Trigger batch review before picking next batch or waking leader
				console.log('[MarkTaskDone] Triggering batch review after completing batch')
				executor.executeReview(proj, leaderAgent, this.agent)
				return
			}
		}

		// No batch review needed, check for remaining tasks
		if (remainingTodoTasks.length > 0) {
			// Pick next batch of tasks
			const nextBatch = remainingTodoTasks.slice(0, BATCH_SIZE)

			// Mark them as in-progress
			nextBatch.forEach((task) => {
				this.agent.fairyApp.tasks.setTaskStatusAndNotify(task.id, 'in-progress')
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
		// Move fairy to center of completed tasks before going idle
		this.moveToTaskCenter(inProgressTasks)
		this.agent.interrupt({ mode: 'standing-by', input: null })

		// Wake up the leader (duo-orchestrating-waiting) - reuse leaderMember from above
		if (leaderMember) {
			const leaderAgentForWakeup = this.agent.fairyApp.agents
				.getAgents()
				.find((a) => a.id === leaderMember.id)
			if (leaderAgentForWakeup && leaderAgentForWakeup.mode.getMode() === 'duo-orchestrating-waiting') {
				const completionMessage =
					inProgressTasks.length === 1
						? `Task "${inProgressTasks[0].title}" has been completed by your partner.`
						: `${inProgressTasks.length} tasks have been completed by your partner.`

				// Move leader to the bottom of the just-completed batch
				// This ensures the leader's next screenshot shows the latest work area for this batch
				// Use the tasks we just marked as done (inProgressTasks), not all completed tasks
				if (inProgressTasks.length > 0) {
					// Find the task with the bottom-most position in the just-completed batch
					const bottomMostTask = inProgressTasks.reduce((bottom, task) => {
						const taskBottom = task.y + task.h
						const currentBottom = bottom.y + bottom.h
						return taskBottom > currentBottom ? task : bottom
					})
					// Position leader at the bottom of the bottom-most task in the batch
					const workArea = {
						x: bottomMostTask.x,
						y: bottomMostTask.y + bottomMostTask.h,
					}
					leaderAgentForWakeup.position.moveTo(workArea)
				}

				leaderAgentForWakeup.schedule({
					agentMessages: [completionMessage],
				})
			}
		}
	}
}
