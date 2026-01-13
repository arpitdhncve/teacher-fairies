/**
 * Configuration for review behavior in duo-orchestrator mode.
 * 
 * REVIEW_STRATEGY: Controls when/if the follower performs a cleanup review
 *   - 'none': No review, project ends immediately when leader calls end-duo-project
 *   - 'once-on-end': Follower performs ONE cleanup task after first end-duo-project call
 *   - 'after-every-batch': Follower reviews after completing each batch (future)
 */
export const FairyReviewConfig = {
	/** 
	 * Current review strategy 
	 * Change this value to switch between strategies
	 */
	REVIEW_STRATEGY: 'after-every-batch' as 'none' | 'once-on-end' | 'after-every-batch',
} as const

export type ReviewStrategy = typeof FairyReviewConfig.REVIEW_STRATEGY
export type FairyReviewConfigType = typeof FairyReviewConfig
