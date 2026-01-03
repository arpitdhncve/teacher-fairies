import { AgentId, ProjectId, TaskId } from '../schema/id-schemas'

/**
 * Base task definition containing common fields shared by all task types.
 * Used as parent for FairyTask, PlannedTaskDefinition, etc.
 */
export interface BaseTaskDefinition {
	title: string
	text: string
	x: number
	y: number
	w: number
	h: number
	// Optional structured style hints for better task accuracy
	color?: string
	fill?: 'solid' | 'none' | 'semi'
	successCriteria?: string
}

/**
 * A full task that exists in the task management system.
 */
export interface FairyTask extends BaseTaskDefinition {
	id: TaskId
	projectId: ProjectId | null
	assignedTo: AgentId | null
	status: FairyTaskStatus
	pageId?: string
}

export type FairyTaskStatus = 'todo' | 'in-progress' | 'done'

// todos are personal, tasks are high level
export type FairyTodoItem = Pick<FairyTask, 'id' | 'text' | 'status'>
