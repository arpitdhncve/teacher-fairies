import { EndDuoProjectAction, Streaming, createAgentActionInfo } from '@tldraw/fairy-shared'
import { uniqueId } from 'tldraw'
import { AgentHelpers } from '../fairy-agent/AgentHelpers'
import { FairyAgent } from '../fairy-agent/FairyAgent'
import { AgentActionUtil } from './AgentActionUtil'

export class EndDuoProjectActionUtil extends AgentActionUtil<EndDuoProjectAction> {
	static override type = 'end-duo-project' as const

	override getInfo(action: Streaming<EndDuoProjectAction>) {
		return createAgentActionInfo({
			icon: 'flag',
			description: action.complete ? 'Ended project' : 'Ending project...',
			ircMessage: action.complete ? `I ended the project.` : null,
			pose: 'reviewing',
			canGroup: () => false,
		})
	}

	override applyAction(action: Streaming<EndDuoProjectAction>, _helpers: AgentHelpers) {
		if (!action.complete) return
		if (!this.agent) return

		const project = this.agent.getProject()
		if (!project) {
			this.agent.interrupt({
				input:
					'You are not currently part of a project. You cannot end a project you are not part of.',
			})
			return
		}

		// Two-phase end mechanism: first end-duo-project schedules a review, second one actually ends
		if (!project.hasPendingFinalReview) {
			// First time receiving end-duo-project: schedule a final review
			this.agent.fairyApp.projects.updateProject(project.id, {
				hasPendingFinalReview: true,
			})

			// Schedule review for the leader to examine the completed work
			const viewportBounds = this.agent.editor.getViewportPageBounds()
			this.agent.schedule({
				bounds: {
					x: viewportBounds.x,
					y: viewportBounds.y,
					w: viewportBounds.w,
					h: viewportBounds.h,
				},
				agentMessages: [
					`Before ending the project, perform a final review of the completed work on the canvas.

Review checklist:
1. COMPLETENESS: Verify that everything asked in the original prompt has been done. Nothing should be missing.
2. NO EXTRAS: Ensure nothing extra was added beyond what was asked. Only what was requested should be present.
3. LAYOUT QUALITY: Check for overlapping elements, text readability problems, or layout issues.

If you find any problems:
- Create a correction task for your partner using create-duo-task
- Direct them to fix the issues using direct-to-start-duo-task
- Wait for them to complete the fix

If everything looks good and matches the original request exactly, proceed to end the project.`,
				],
			})

			// Return early - don't end the project yet, let the review happen first
			return
		}

		// If we reach here, hasPendingFinalReview is true - the review has been done
		// Proceed with actual project ending

		const membersIds = project.members.map((member) => member.id)
		const memberAgents = this.agent.fairyApp.agents
			.getAgents()
			.filter((agent: FairyAgent) => membersIds.includes(agent.id))

		const droneAgent = memberAgents.find((agent: FairyAgent) => agent.getRole() === 'drone')

		if (!droneAgent) {
			// If feed dialog is open, soft delete instead of hard delete
			if (this.agent.fairyApp.getIsFeedDialogOpen()) {
				this.agent.fairyApp.projects.softDeleteProjectAndAssociatedTasks(project.id)
			} else {
				this.agent.fairyApp.projects.deleteProjectAndAssociatedTasks(project.id)
			}
			return
		}

		const completedTasks = this.agent.fairyApp.tasks
			.getTasksByProjectId(project.id)
			.filter((task) => task.status === 'done')

		// Handle duo-orchestrator
		const duoOrchestratorCompletedTasks = completedTasks.filter(
			(task) => task.assignedTo === this.agent.id
		)
		const duoOrchestratorTaskCount = duoOrchestratorCompletedTasks.length
		const duoOrchestratorTaskWord = duoOrchestratorTaskCount === 1 ? 'task' : 'tasks'
		this.agent.chat.push(
			{
				id: uniqueId(),
				type: 'memory-transition',
				memoryLevel: 'fairy',
				agentFacingMessage: `[ACTIONS]: <Project actions filtered for brevity>`,
				userFacingMessage: null,
			},
			{
				id: uniqueId(),
				type: 'prompt',
				promptSource: 'self',
				memoryLevel: 'fairy',
				agentFacingMessage: `I led and completed the "${project.title}" project with my partner, ${droneAgent.getConfig().name}. I completed ${duoOrchestratorTaskCount} ${duoOrchestratorTaskWord} as part of the project.`,
				userFacingMessage: null,
			}
		)
		this.agent.interrupt({ mode: 'idling', input: null })

		// Handle drone
		const droneCompletedTasks = completedTasks.filter((task) => task.assignedTo === droneAgent.id)
		if (droneCompletedTasks.length > 0) {
			const droneTaskCount = droneCompletedTasks.length
			const droneTaskWord = droneTaskCount === 1 ? 'task' : 'tasks'
			droneAgent.chat.push(
				{
					id: uniqueId(),
					type: 'memory-transition',
					memoryLevel: 'fairy',
					agentFacingMessage: `[ACTIONS]: <Project actions filtered for brevity>`,
					userFacingMessage: null,
				},
				{
					id: uniqueId(),
					type: 'prompt',
					promptSource: 'self',
					memoryLevel: 'fairy',
					agentFacingMessage: `I completed ${droneTaskCount} ${droneTaskWord} as part of the "${project.title}" project with my partner, ${this.agent.getConfig().name}.`,
					userFacingMessage: `I completed ${droneTaskCount} ${droneTaskWord} as part of the "${project.title}" project.`,
				}
			)
		}
		droneAgent.interrupt({ mode: 'idling', input: null })

		// If feed dialog is open, soft delete instead of hard delete
		if (this.agent.fairyApp.getIsFeedDialogOpen()) {
			this.agent.fairyApp.projects.softDeleteProjectAndAssociatedTasks(project.id)
		} else {
			this.agent.fairyApp.projects.deleteProjectAndAssociatedTasks(project.id)
		}

		// Select self after project deletion
		const allAgents = this.agent.fairyApp.agents.getAgents()
		allAgents.forEach((agent) => {
			const shouldSelect = agent.id === this.agent.id
			agent.updateEntity((f) => (f ? { ...f, isSelected: shouldSelect } : f))
		})
	}
}
