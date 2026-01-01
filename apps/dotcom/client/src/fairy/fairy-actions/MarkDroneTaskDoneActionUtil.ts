import { MarkDroneTaskDoneAction, Streaming, createAgentActionInfo } from '@tldraw/fairy-shared'
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

		// Check for remaining TODO tasks and notify leader
		const project = this.agent.getProject()
		if (!project) {
			this.agent.interrupt({ mode: 'standing-by', input: null })
			return
		}

		// Check for remaining TODO tasks assigned to this follower
		const allMyTasks = this.agent.fairyApp.tasks
			.getTasksByProjectId(project.id)
			.filter((task) => task.assignedTo === this.agent.id)
		const remainingTodoTasks = allMyTasks.filter((task) => task.status === 'todo')

		if (remainingTodoTasks.length > 0) {
			// Mark all remaining TODO tasks as in-progress and continue working
			remainingTodoTasks.forEach((task) => {
				this.agent.fairyApp.tasks.setTaskStatus(task.id, 'in-progress')
			})

			// Build task list for the message
			const taskDescriptions = remainingTodoTasks
				.map((task) => `- ${task.title}${task.text ? `: ${task.text}` : ''}`)
				.join('\n')

			console.log(`[MarkTaskDone] Continuing with ${remainingTodoTasks.length} remaining tasks`)

			// Continue working on remaining tasks
			this.agent.schedule({
				agentMessages: [
					`Completed previous tasks. Continue with remaining ${remainingTodoTasks.length} task(s):\n\n${taskDescriptions}`,
				],
				bounds: {
					x: remainingTodoTasks[0].x,
					y: remainingTodoTasks[0].y,
					w: remainingTodoTasks[0].w,
					h: remainingTodoTasks[0].h,
				},
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
						completionMessage +
							' All assigned tasks complete. Your partner is ready for more work if needed, or call end-duo-project if all work is complete.',
					],
				})
			}
		}
	}
}
