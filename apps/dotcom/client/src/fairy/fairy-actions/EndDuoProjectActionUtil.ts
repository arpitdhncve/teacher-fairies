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

			// Add original prompt reminder
			const originalPromptReminder = project.originalPrompt
				? `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📋 ORIGINAL USER REQUEST:\n"${project.originalPrompt}"\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\nYou MUST verify the drawing matches this request EXACTLY.\n`
				: ''

			this.agent.schedule({
				bounds: {
					x: viewportBounds.x,
					y: viewportBounds.y,
					w: viewportBounds.w,
					h: viewportBounds.h,
				},
				agentMessages: [
					`Before ending the project, perform a STRICT final review focusing on AESTHETICS and READABILITY.
${originalPromptReminder}

━━━━━━━━━━━ AESTHETIC REVIEW CHECKLIST ━━━━━━━━━━━

🎯 1. EXACT MATCH TO REQUEST
   □ Contains EXACTLY what was asked - nothing extra, nothing missing
   □ All requested elements are present

📖 2. READABILITY (CRITICAL)
   □ ALL text is clearly legible - minimum 14px font size
   □ Strong contrast between text and background (dark on light or light on dark)
   □ Adequate line spacing (1.4-1.6x font size)
   □ No text overlapping other elements
   □ Clear visual hierarchy - headings larger than body text

🎨 3. COLOR & VISUAL HARMONY
   □ Color palette is cohesive (max 3-4 colors)
   □ Colors complement each other
   □ Sufficient contrast for accessibility
   □ Consistent color usage (same color = same meaning)

📐 4. ALIGNMENT & SPACING
   □ Elements are properly aligned (left, center, or right - be consistent)
   □ Equal spacing between similar elements
   □ Generous whitespace - elements should "breathe"
   □ No cramped or cluttered areas

⚖️ 5. VISUAL BALANCE & HIERARCHY
   □ Visual weight is balanced across the canvas
   □ Most important elements are most prominent
   □ Clear focal point exists
   □ Size relationships make sense

🔲 6. CONSISTENCY & POLISH
   □ Similar elements styled identically (all buttons same style, all headers same size)
   □ Consistent border widths and corner radii
   □ Clean, crisp edges - no rough or pixelated elements
   □ Professional, polished appearance

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

IF ANY AESTHETIC ISSUES FOUND:
→ Use create-duo-task to create a SPECIFIC correction task for each issue
→ Use direct-to-start-duo-task to assign to your partner
→ Wait for completion before ending

IF CANVAS IS BEAUTIFUL, READABLE, AND MATCHES REQUEST:
→ Call end-duo-project again to complete`,
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
