import { IReviewStrategy, ReviewContext } from '../IReviewStrategy'

export class NoReviewStrategy implements IReviewStrategy {
	readonly type = 'none'

	shouldReview(_context: ReviewContext): boolean {
		return false // Never review
	}

	executeReview(_context: ReviewContext): void {
		// No-op
	}

	onReviewComplete(_context: ReviewContext): void {
		// No-op
	}
}
