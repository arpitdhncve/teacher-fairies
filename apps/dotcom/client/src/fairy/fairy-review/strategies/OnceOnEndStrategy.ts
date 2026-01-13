import { IReviewStrategy, ReviewContext } from '../IReviewStrategy'
import { CleanupTaskFactory } from '../CleanupTaskFactory'

export class OnceOnEndStrategy implements IReviewStrategy {
	readonly type = 'once-on-end'

	shouldReview(context: ReviewContext): boolean {
		// Review only if cleanup hasn't been completed yet
		return !context.project.cleanupCompleted
	}

	executeReview(context: ReviewContext): void {
		const { project, leaderAgent, followerAgent } = context

		// Create and assign cleanup task
		const cleanupTask = CleanupTaskFactory.createCleanupTask(
			project,
			followerAgent,
			leaderAgent.fairyApp
		)

		if (!cleanupTask) {
			// No tasks to review, mark complete
			leaderAgent.fairyApp.projects.updateProject(project.id, {
				cleanupCompleted: true,
			})
			return
		}

		// Move follower to cleanup area
		followerAgent.position.moveTo({ x: cleanupTask.x, y: cleanupTask.y })

		// Interrupt follower with cleanup task
		followerAgent.interrupt({
			mode: 'working-drone',
			input: {
				agentMessages: [cleanupTask.text],
				bounds: { x: cleanupTask.x, y: cleanupTask.y, w: cleanupTask.w, h: cleanupTask.h },
				source: 'other-agent',
			},
		})

		// Leader waits
		leaderAgent.mode.setMode('duo-orchestrating-waiting')
	}

	onReviewComplete(context: ReviewContext): void {
		// Mark cleanup as done to prevent loops
		context.leaderAgent.fairyApp.projects.updateProject(context.project.id, {
			cleanupCompleted: true,
		})
	}
}
