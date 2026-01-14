import { AgentPrompt } from './AgentPrompt'
import { FairyTask } from './FairyTask'
import { FairyRole } from '../FairyBatchConfig'

/**
 * Metadata sent alongside the prompt for model selection.
 */
export interface StreamActionsMetadata {
	/** The role of this fairy agent */
	fairyRole: FairyRole
	/** The current task being worked on (if any) */
	currentTask: FairyTask | null
}

/**
 * Request body for the /stream-actions endpoint.
 */
export interface StreamActionsRequest {
	/** The full agent prompt */
	prompt: AgentPrompt
	/** Metadata for model selection */
	metadata: StreamActionsMetadata
}
