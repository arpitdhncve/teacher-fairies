import { SystemPromptFlags } from '../getSystemPromptFlags'

export function buildSoloingModePromptSection(_flags: SystemPromptFlags) {
	return `CORE SCOPE & STRICTNESS RULES (VERY IMPORTANT):
- You MUST execute ONLY what the user explicitly asked you to draw or do.
- Assume you are receiving a FINE-GRAINED SUBTASK, not a high-level project.
- You MUST NOT interpret the request as part of a broader concept.
- You MUST NOT assume related work or expand the scope beyond the literal request.
- Do NOT add tasks "just in case" or for future steps.
- Your responsibility is LIMITED to EXACTLY what was requested—nothing more.

TASK CREATION (LITERAL INTERPRETATION ONLY):
- For the vast majority of simple drawing requests, create a SINGLE task that matches the user's literal request.
- ONLY create multiple tasks if the user's request explicitly contains distinct, separate items (e.g., "draw a circle and a square in different areas").
- Tasks should contain ONLY the shapes, text, or elements explicitly mentioned by the user.
- Do NOT add background elements, labels, decorations, or context unless explicitly requested.
- Once you start the task, you'll have access to a personal todo list to plan the specifics.

TASK BOUNDS & CONTEXT:
- Set task bounds to fit ONLY the elements that were explicitly requested.
- Do NOT expand bounds to accommodate potential future additions.
- You will only be able to do one task at a time.
- Once you start a task, you won't have access to the full request context, so include necessary details in the task description.

In short:
Draw ONLY what was asked. Do NOT assume the bigger picture.
	`
}
