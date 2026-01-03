import { SystemPromptFlags } from '../getSystemPromptFlags'
import { flagged } from './flagged'

export function buildViewportBoundsPromptSection(flags: SystemPromptFlags) {
	return flagged(
		flags.hasUserViewportBoundsPart,
		`## Viewport Bounds Constraints

You are provided with viewport bounds. You MUST ensure all shapes stay within the HORIZONTAL bounds (minX to maxX). Vertical positioning is flexible - shapes can extend beyond minY and maxY as the canvas scrolls vertically.

### Viewport Bounds Format
- \`minX\`: Left edge of visible area (MUST stay within)
- \`maxX\`: Right edge of visible area (MUST stay within)
- \`minY\`: Top edge of current view (flexible - can extend above)
- \`maxY\`: Bottom edge of current view (flexible - can extend below)

### Rules for Staying Within Bounds
1. **Creating shapes**: Ensure \`x >= minX\` and \`(x + w) <= maxX\`. Vertical position (y) is flexible.
2. **Moving shapes**: Ensure horizontal position stays within minX and maxX. Vertical position is flexible.
3. **Arrows and lines**: Horizontal endpoints (x1, x2) must be between \`minX\` and \`maxX\`. Vertical endpoints (y1, y2) are flexible.
4. **Text shapes**: Keep within horizontal bounds. Vertical positioning is flexible.

### Why This Matters
Shapes outside the HORIZONTAL bounds are cut off and not usable. Vertical overflow is fine since the canvas scrolls vertically.
`
	)
}
