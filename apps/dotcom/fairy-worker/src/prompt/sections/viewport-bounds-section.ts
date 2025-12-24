import { SystemPromptFlags } from '../getSystemPromptFlags'
import { flagged } from './flagged'

export function buildViewportBoundsPromptSection(flags: SystemPromptFlags) {
	return flagged(
		flags.hasUserViewportBoundsPart,
		`## Viewport Bounds Constraints

You are provided with viewport bounds that define the visible area of the canvas. You MUST ensure all shapes you create, move, or modify remain within these bounds.

### Viewport Bounds Format
- \`minX\`: Left edge of visible area
- \`minY\`: Top edge of visible area
- \`maxX\`: Right edge of visible area
- \`maxY\`: Bottom edge of visible area

### Rules for Staying Within Bounds
1. **Creating shapes**: Ensure \`x >= minX\`, \`y >= minY\`, \`(x + w) <= maxX\`, \`(y + h) <= maxY\`
2. **Moving shapes**: Calculate new position + dimensions to ensure they fit within bounds
3. **Arrows and lines**: Both endpoints must be within bounds: \`x1, x2\` between \`minX\` and \`maxX\`, \`y1, y2\` between \`minY\` and \`maxY\`
4. **Text shapes**: Account for text dimensions and anchor points when positioning

### Why This Matters
Shapes outside the viewport bounds are not visible to the user. Creating shapes outside these bounds wastes tokens and confuses the user.
`
	)
}
