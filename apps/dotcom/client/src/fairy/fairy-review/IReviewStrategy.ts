import { FairyProject } from '@tldraw/fairy-shared'
import { FairyAgent } from '../fairy-agent/FairyAgent'

export interface ReviewContext {
	project: FairyProject
	leaderAgent: FairyAgent
	followerAgent: FairyAgent
}

export interface IReviewStrategy {
	/** Unique identifier for this strategy */
	readonly type: string

	/** Should review be performed now? */
	shouldReview(context: ReviewContext): boolean

	/** Execute the review (assign task, update state, etc) */
	executeReview(context: ReviewContext): void

	/** Called when review task is completed */
	onReviewComplete(context: ReviewContext): void
}
