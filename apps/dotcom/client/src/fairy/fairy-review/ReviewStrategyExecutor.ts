import { FairyProject } from '@tldraw/fairy-shared'
import { FairyAgent } from '../fairy-agent/FairyAgent'
import { IReviewStrategy, ReviewContext } from './IReviewStrategy'
import { NoReviewStrategy } from './strategies/NoReviewStrategy'
import { OnceOnEndStrategy } from './strategies/OnceOnEndStrategy'
import { AfterEveryBatchStrategy } from './strategies/AfterEveryBatchStrategy'
import { FairyReviewConfig } from '@tldraw/fairy-shared'

// Strategy registry (easily extensible)
const STRATEGIES: Record<string, IReviewStrategy> = {
	'none': new NoReviewStrategy(),
	'once-on-end': new OnceOnEndStrategy(),
	'after-every-batch': new AfterEveryBatchStrategy(),
}

export class ReviewStrategyExecutor {
	private strategy: IReviewStrategy

	constructor() {
		this.strategy = STRATEGIES[FairyReviewConfig.REVIEW_STRATEGY] ?? STRATEGIES['none']
	}

	/** Check if review should happen before ending project */
	shouldReviewBeforeEnd(
		project: FairyProject,
		leaderAgent: FairyAgent,
		followerAgent: FairyAgent
	): boolean {
		return this.strategy.shouldReview({ project, leaderAgent, followerAgent })
	}

	/** Check if review should happen after batch completion (for after-every-batch strategy) */
	shouldReviewAfterBatch(
		project: FairyProject,
		leaderAgent: FairyAgent,
		followerAgent: FairyAgent
	): boolean {
		// Only AfterEveryBatchStrategy has this method
		if ('shouldReviewAfterBatch' in this.strategy) {
			return (this.strategy as AfterEveryBatchStrategy).shouldReviewAfterBatch({
				project,
				leaderAgent,
				followerAgent,
			})
		}
		return false
	}

	/** Execute the review flow */
	executeReview(
		project: FairyProject,
		leaderAgent: FairyAgent,
		followerAgent: FairyAgent
	): void {
		this.strategy.executeReview({ project, leaderAgent, followerAgent })
	}

	/** Called when cleanup task is completed */
	onReviewComplete(
		project: FairyProject,
		leaderAgent: FairyAgent,
		followerAgent: FairyAgent
	): void {
		this.strategy.onReviewComplete({ project, leaderAgent, followerAgent })
	}

	/** Check if a task is a cleanup task */
	static isCleanupTask(task: { title: string }): boolean {
		return task.title === 'Final Cleanup'
	}

	/** Get current strategy type */
	getStrategyType(): string {
		return this.strategy.type
	}
}

