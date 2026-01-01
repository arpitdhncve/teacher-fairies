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
					`<final_review mode="EXTREMELY_STRICT">
<instruction>
Before ending the project, perform an EXTREMELY STRICT final review.
You MUST examine EVERY element on the canvas and identify ALL issues.
Do NOT proceed until you have verified each checklist item.
</instruction>

${
	originalPromptReminder
		? `<original_user_request critical="true">
${originalPromptReminder}
Verify the drawing matches this request EXACTLY. Missing or extra elements = FAIL.
</original_user_request>`
		: ''
}

<review_checklist note="ALL categories must pass. Any failure requires correction.">

<category name="EXACT_MATCH" priority="high">
<description>The canvas must contain exactly what the user requested - nothing more, nothing less.</description>
<fail_condition>Anything is missing from what the user asked for</fail_condition>
<fail_condition>Extra elements were added that were not requested</fail_condition>
<fail_condition>The user's intent was misinterpreted</fail_condition>
</category>

<category name="OVERLAP_AND_COLLISION" priority="critical">
<description>No elements should overlap or collide. Every element must have breathing room.</description>
<fail_condition>ANY shapes overlap unintentionally</fail_condition>
<fail_condition>ANY text overlaps other text</fail_condition>
<fail_condition>ANY text overlaps shapes or images</fail_condition>
<fail_condition>Elements are touching or too close (minimum 10px gap required)</fail_condition>
<fail_condition>Elements are cut off or extend beyond the visible canvas area</fail_condition>
</category>

<category name="TEXT_READABILITY" priority="critical" tolerance="zero">
<description>All text must be immediately readable at first glance. This is non-negotiable.</description>
<fail_condition>Any text is smaller than 16px font size</fail_condition>
<fail_condition>Text color is too similar to background (HIGH contrast required)</fail_condition>
<fail_condition>Text appears cramped or squeezed</fail_condition>
<fail_condition>Line spacing is too tight</fail_condition>
<fail_condition>Headings are not clearly larger than body text</fail_condition>
<fail_condition>Important text is not immediately readable at first glance</fail_condition>
</category>

<category name="COLOR_AND_VISUAL_CLARITY" priority="high">
<description>Colors should be harmonious, limited, and provide good contrast.</description>
<fail_condition>More than 4 colors used (creates visual chaos)</fail_condition>
<fail_condition>Colors clash or do not harmonize</fail_condition>
<fail_condition>Low contrast makes elements hard to see</fail_condition>
<fail_condition>Inconsistent color usage (same meaning should use same color)</fail_condition>
</category>

<category name="ALIGNMENT_AND_SPACING" priority="high">
<description>Elements should be aligned consistently and have proper spacing.</description>
<fail_condition>Elements are misaligned (pick left, center, or right and be consistent)</fail_condition>
<fail_condition>Uneven spacing between similar elements</fail_condition>
<fail_condition>Canvas looks cramped (needs more whitespace)</fail_condition>
<fail_condition>Elements are randomly placed without clear structure</fail_condition>
</category>

<category name="VISUAL_BALANCE_AND_HIERARCHY" priority="medium">
<description>The canvas should have visual balance and clear importance hierarchy.</description>
<fail_condition>One side of the canvas is visually heavier than the other</fail_condition>
<fail_condition>No clear focal point exists</fail_condition>
<fail_condition>Important elements do not stand out</fail_condition>
<fail_condition>Size relationships do not make logical sense</fail_condition>
</category>

<category name="POLISH_AND_PROFESSIONALISM" priority="medium">
<description>The overall appearance should be clean, consistent, and professional.</description>
<fail_condition>Similar elements are styled differently (inconsistent)</fail_condition>
<fail_condition>Edges appear rough or unfinished</fail_condition>
<fail_condition>Overall appearance is not clean and professional</fail_condition>
</category>

</review_checklist>

<required_output_format>
<instruction>You MUST output your findings in one of these two formats:</instruction>

<if_issues_found>
<format>
ISSUES THAT MUST BE FIXED:
1. [CATEGORY_NAME] Description of the specific issue
2. [CATEGORY_NAME] Description of the specific issue
3. [CATEGORY_NAME] Description of the specific issue
(continue for all issues found)
</format>
<then_action>Create ONE task for EACH issue using create-duo-task action</then_action>
</if_issues_found>

<if_no_issues_found>
<statement>State exactly: "All checks passed. Canvas is visually clear and complete."</statement>
<then_action>Call end-duo-project action again to complete the project</then_action>
</if_no_issues_found>
</required_output_format>

</final_review>`,
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
