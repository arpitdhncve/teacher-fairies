import { FairyProject, FairyTask } from '@tldraw/fairy-shared'
import { uniqueId } from 'tldraw'
import { FairyAgent } from '../fairy-agent/FairyAgent'
import { FairyApp } from '../fairy-app/FairyApp'

export class CleanupTaskFactory {
	/**
	 * Creates a cleanup task with hardcoded objectives
	 * Returns null if no tasks to cleanup
	 */
	static createCleanupTask(
		project: FairyProject,
		assignee: FairyAgent,
		fairyApp: FairyApp
	): FairyTask | null {
		const completedTasks = fairyApp.tasks
			.getTasksByProjectId(project.id)
			.filter((task) => task.status === 'done')

		if (completedTasks.length === 0) return null

		// Calculate FIXED bounds from completed tasks
		const bounds = this.calculateBounds(completedTasks)

		const taskId = uniqueId()
		const prompt = this.buildCleanupPrompt(bounds)

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

	private static calculateBounds(tasks: FairyTask[]) {
		const minX = Math.min(...tasks.map((t) => t.x))
		const minY = Math.min(...tasks.map((t) => t.y))
		const maxX = Math.max(...tasks.map((t) => t.x + t.w))
		const maxY = Math.max(...tasks.map((t) => t.y + t.h))

		return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
	}

	private static buildCleanupPrompt(bounds: { x: number; y: number; w: number; h: number }) {
		const { x, y, w, h } = bounds
		const maxX = x + w
		const maxY = y + h

		return `FINAL CLEANUP TASK - DO NOT CREATE NEW CONTENT

Review and fix issues in the work area:
1. REMOVE overlapping text - delete one if two elements overlap
2. ENSURE shapes within bounds x=[${x}, ${maxX}]
3. REMOVE duplicate text - delete if same text appears twice
4. IMPROVE visibility - ensure clear contrast

When done, call mark-my-task-done. DO NOT add new content.
Fixed bounds: x=[${x}, ${maxX}], y=[${y}, ${maxY}]`
	}
}
