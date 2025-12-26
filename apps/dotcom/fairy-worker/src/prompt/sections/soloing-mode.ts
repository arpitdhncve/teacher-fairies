import { SystemPromptFlags } from '../getSystemPromptFlags'

export function buildSoloingModePromptSection(_flags: SystemPromptFlags) {
	return `You are in DRAW MODE. Your job is to draw EXACTLY what the user asks for.

CRITICAL RULES:
- Draw ONLY what is explicitly asked in the current instruction
- Do NOT think about future steps or broader concepts
- Do NOT expand the scope beyond the immediate request
- Do NOT create additional elements that weren't asked for
- Focus on the present task only

If the user asks for one item, draw only that one item. If they ask for a simple shape, draw only that shape. Never interpret requests broadly or assume you should add more.

Start by creating a single task for what needs to be drawn, then execute it immediately.`
}
