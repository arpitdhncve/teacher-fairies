import { ProjectColor } from '../format/FocusColor'
import { AgentId, ProjectId } from '../schema/id-schemas'

export interface FairyProject {
	id: ProjectId
	title: string
	description: string
	color: ProjectColor | ''
	members: FairyProjectMember[]
	plan: string
	softDeleted: boolean
	createdTasksCount?: number // Track leader-created tasks for auto-review insertion
}

export interface FairyProjectMember {
	id: AgentId
	role: FairyProjectRole
}

export type FairyProjectRole = 'orchestrator' | 'duo-orchestrator' | 'drone'
