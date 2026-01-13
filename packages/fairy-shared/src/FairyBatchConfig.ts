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
	LEADER_BATCH_SIZE: 2,

	/** Number of tasks the follower picks up after completing a batch */
	FOLLOWER_BATCH_SIZE: 2,
} as const

export type FairyBatchConfigType = typeof FairyBatchConfig
