import { ProjectColor } from '../format/FocusColor'
import { AgentId, ProjectId } from '../schema/id-schemas'
import { BaseTaskDefinition } from './FairyTask'

/**
 * A task definition from the planning phase, before it becomes an actual FairyTask.
 * Extends BaseTaskDefinition with a temporary ID used during planning.
 */
export interface PlannedTaskDefinition extends BaseTaskDefinition {
	tempId: string // Temporary ID used during planning
}

export interface FairyProject {
	id: ProjectId
	title: string
	description: string
	color: ProjectColor | ''
	members: FairyProjectMember[]
	plan: string
	softDeleted: boolean
	hasPendingFinalReview?: boolean // Flag to track if final review has been scheduled before ending project
	plannedTasks?: PlannedTaskDefinition[] // Queue of planned tasks for two-phase execution
	currentPlanIndex?: number // Index of next task to create from plannedTasks
	planningComplete?: boolean // Flag to indicate all tasks are planned and ready for distribution
}

export interface FairyProjectMember {
	id: AgentId
	role: FairyProjectRole
}

export type FairyProjectRole = 'orchestrator' | 'duo-orchestrator' | 'drone'
