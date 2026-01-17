import { FairyProject, FairyTask } from '@tldraw/fairy-shared'
import { uniqueId } from 'tldraw'
import { FairyAgent } from '../fairy-agent/FairyAgent'
import { FairyApp } from '../fairy-app/FairyApp'

export class CleanupTaskFactory {
	/**
	 * Creates a cleanup task with context about what tasks need review.
	 * Uses canvas viewport bounds for consistent SafeMinX/SafeMaxX.
	 * Returns null if no unreviewed tasks to cleanup.
	 */
	static createCleanupTask(
		project: FairyProject,
		assignee: FairyAgent,
		fairyApp: FairyApp,
		followerAgent: FairyAgent
	): FairyTask | null {
		// Get tasks completed since last review
		const unreviewedTasks = fairyApp.tasks.getUnreviewedCompletedTasks(
			project.id,
			project.lastBatchReviewedAt ?? null
		)

		// Use canvas viewport bounds (consistent SafeMinX/SafeMaxX)
		const viewportBounds = followerAgent.editor.getViewportPageBounds()
		const bounds = {
			x: Math.round(viewportBounds.x),
			y: Math.round(viewportBounds.y),
			w: Math.round(viewportBounds.w),
			h: Math.round(viewportBounds.h),
		}

		const taskId = uniqueId()
		const prompt = this.buildCleanupPrompt(bounds, unreviewedTasks)

		// Create the task in the system
		fairyApp.tasks.createTask({
			id: taskId as any,
			title: 'Final Cleanup',
			text: prompt,
			assignedTo: assignee.id,
			projectId: project.id,
			status: 'in-progress',
			pageId: assignee.editor.getCurrentPageId(),
			...bounds,
		})

		return fairyApp.tasks.getTaskById(taskId as any)!
	}

	private static buildCleanupPrompt(
		bounds: { x: number; y: number; w: number; h: number },
		tasks: FairyTask[]
	) {
		const { x, y, w, h } = bounds
		const maxX = x + w
		const maxY = y + h

		// Build context about what tasks were done
		const taskContext = tasks.length > 0
			? `\nTasks completed since last review:\n${tasks.map(t => 
				`- "${t.title}"${t.text ? `: ${t.text}` : ''}`
			  ).join('\n')}\n`
			: ''

		return `FINAL CLEANUP TASK - DO NOT CREATE NEW CONTENT
${taskContext}
Review and fix issues in the work area:
1. REMOVE overlapping text - delete one if two elements overlap
2. ENSURE shapes within bounds x=[${x}, ${maxX}]
3. REMOVE duplicate text - delete if same text appears twice
4. IMPROVE visibility - ensure clear contrast

When done, call mark-my-task-done. DO NOT add new content.
Fixed bounds: x=[${x}, ${maxX}], y=[${y}, ${maxY}]`
	}
}
