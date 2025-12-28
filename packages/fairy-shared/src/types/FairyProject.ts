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
	hasPendingFinalReview?: boolean // Flag to track if final review has been scheduled before ending project
}

export interface FairyProjectMember {
	id: AgentId
	role: FairyProjectRole
}

export type FairyProjectRole = 'orchestrator' | 'duo-orchestrator' | 'drone'
