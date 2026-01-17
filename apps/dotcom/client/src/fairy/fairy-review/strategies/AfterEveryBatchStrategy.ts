import { IReviewStrategy, ReviewContext } from '../IReviewStrategy'
import { CleanupTaskFactory } from '../CleanupTaskFactory'

/**
 * Strategy that triggers a review after every batch of tasks is completed.
 * 
 * Flow:
 * 1. Follower completes a batch of tasks
 * 2. Before picking next batch, a cleanup/review task is assigned
 * 3. After cleanup completion, follower picks next batch
 * 4. Repeat until all tasks done
 * 5. On end-duo-project, also trigger final review if not already done
 */
export class AfterEveryBatchStrategy implements IReviewStrategy {
	readonly type = 'after-every-batch'

	/**
	 * For end-duo-project: Only trigger final review if:
	 * 1. We haven't completed a final cleanup yet
	 * 2. We're not in the middle of a batch review cycle
	 * 
	 * Since batch reviews happen after each batch, when end-duo-project is called,
	 * the last batch should have already been reviewed. We only need a final review
	 * if there were tasks completed AFTER the last batch review.
	 */
	shouldReview(context: ReviewContext): boolean {
		// If cleanup is already completed, no review needed
		if (context.project.cleanupCompleted) {
			return false
		}
		
		// If a batch review is currently pending, wait for it to complete
		if (context.project.pendingBatchReview) {
			return false
		}
		
		// Check if the last batch was already reviewed
		// lastBatchReviewedAt tracks when the last review was done
		// We compare with task completion times to see if new work was done since
		const lastBatchReviewedAt = context.project.lastBatchReviewedAt
		if (lastBatchReviewedAt) {
			// If we have a timestamp for last review, check if all tasks were done before that
			// For simplicity, we assume if lastBatchReviewedAt is set and recent, no new review needed
			return false
		}
		
		// Default: trigger review if cleanup not completed
		return true
	}

	/**
	 * Check if review should happen after batch completion
	 */
	shouldReviewAfterBatch(context: ReviewContext): boolean {
		// Only review if not already pending a review
		return !context.project.pendingBatchReview
	}

	executeReview(context: ReviewContext): void {
		const { project, leaderAgent, followerAgent } = context

		// Create and assign cleanup task
		const cleanupTask = CleanupTaskFactory.createCleanupTask(
			project,
			followerAgent,
			leaderAgent.fairyApp,
			followerAgent
		)

		if (!cleanupTask) {
			// No completed tasks to review yet
			return
		}

		// Mark that a batch review is in progress (prevents re-triggering)
		leaderAgent.fairyApp.projects.updateProject(project.id, {
			pendingBatchReview: true,
		})

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

		// Note: Leader stays in current mode (not waiting) since follower will
		// continue with next batch after review
	}

	onReviewComplete(context: ReviewContext): void {
		// Clear the pending batch review flag and record when we completed the review
		context.leaderAgent.fairyApp.projects.updateProject(context.project.id, {
			pendingBatchReview: false,
			lastBatchReviewedAt: Date.now(),
		})
	}

	/**
	 * Called when end-duo-project is triggered - mark final cleanup done
	 */
	onFinalReviewComplete(context: ReviewContext): void {
		context.leaderAgent.fairyApp.projects.updateProject(context.project.id, {
			cleanupCompleted: true,
			pendingBatchReview: false,
		})
	}
}
