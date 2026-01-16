import { AgentModelName } from './models'

/**
 * Role of the fairy agent in the current context.
 * - 'leader': Orchestrator agent that creates and manages tasks
 * - 'follower': Drone agent that executes assigned tasks
 * - 'default': Non-duo mode (solo, one-shot, etc.)
 */
export type FairyRole = 'leader' | 'follower' | 'default'

/**
 * Model configuration for different roles and task types.
 * These are OpenRouter model names.
 */
export const FairyModelConfig = {
	/** Model for leader agent (orchestrator) - planning and coordination */
	LEADER_MODEL: 'google/gemini-3-flash-preview' as AgentModelName,

	/** Model for follower agent (drone) - task execution */
	FOLLOWER_MODEL: 'google/gemini-3-flash-preview' as AgentModelName,

	/** Model for review tasks - higher quality for cleanup */
	REVIEW_MODEL: 'anthropic/claude-sonnet-4.5' as AgentModelName,

	/** Default model when role is not specified */
	DEFAULT_MODEL: 'google/gemini-3-flash-preview' as AgentModelName,
} as const

export type FairyModelConfigType = typeof FairyModelConfig

/**
 * Configuration for batch task management between leader and follower agents.
 *
 * LEADER_BATCH_SIZE: Maximum number of tasks the leader creates and assigns
 *                    to the follower's todo list at one time.
 *
 * FOLLOWER_BATCH_SIZE: How many tasks the follower picks up (marks in-progress)
 *                      at once to work on.
 */
export const FairyBatchConfig = {
	/** Number of tasks the leader marks in-progress when distributing */
	LEADER_BATCH_SIZE: 4,

	/** Number of tasks the follower picks up after completing a batch */
	FOLLOWER_BATCH_SIZE: 4,
} as const

export type FairyBatchConfigType = typeof FairyBatchConfig

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
