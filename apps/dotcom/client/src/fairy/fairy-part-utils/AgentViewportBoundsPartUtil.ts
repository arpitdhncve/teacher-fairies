import { AgentRequest, AgentViewportBoundsPart } from '@tldraw/fairy-shared'
import { AgentHelpers } from '../fairy-agent/AgentHelpers'
import { PromptPartUtil } from './PromptPartUtil'

export class AgentViewportBoundsPartUtil extends PromptPartUtil<AgentViewportBoundsPart> {
	static override type = 'agentViewportBounds' as const

	override getPart(request: AgentRequest, helpers: AgentHelpers): AgentViewportBoundsPart {
		// Use the user's viewport bounds for SafeMinX/SafeMaxX calculations
		// Task bounds (request.bounds) vary per task, but the visible canvas is constant
		const userBounds = this.agent.editor.getViewportPageBounds()
		const offsetAgentBounds = helpers.applyOffsetToBox(userBounds)

		return {
			type: 'agentViewportBounds',
			agentBounds: helpers.roundBox(offsetAgentBounds),
		}
	}
}
