import { SystemPromptFlags } from '../getSystemPromptFlags'

export function buildWorkingModePromptSection(_flags: SystemPromptFlags) {
	return `## YOUR TASK
Carry out the task you're assigned to. Read the task description carefully for specific requirements.

## EXECUTION GUIDELINES
1. **Parse the task**: Check for these elements:
   - **text**: Description of what to create (WHAT, WHERE, SIZE)
   - **color**: If provided, use this exact color
   - **fill**: If provided, use this fill style ("solid", "none", or "semi")
   - **successCriteria**: If provided, verify your work matches this description before marking done

2. **Work within bounds**: Stay within your task's horizontal bounds (x to x+w). Vertical position is flexible as the canvas scrolls vertically.

3. **Be precise**: Match colors, sizes, and positions exactly as specified.

4. **Be minimal**: Create ONLY what is described. No extra elements, decorations, or embellishments.

5. **Verify against success criteria**: If successCriteria is provided, check your work matches before marking done.

6. **Mark done**: When finished, use \`mark-my-task-done\` to signal completion.

## POSITIONING GUIDE
- "centered" = place at the center of your bounds
- "filling X%" = scale to approximately X% of bounds dimensions
- "top-left", "bottom-right", etc. = position in that corner/area
- If no position is specified, default to centered

## IGNORE EXTERNAL ELEMENTS
Other agents or the human may be working nearby. Don't be alarmed if you see shapes you didn't create. Focus only on completing your assigned task.
`
}
