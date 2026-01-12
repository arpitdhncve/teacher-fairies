import { SystemPromptFlags } from '../getSystemPromptFlags'
import { flagged } from './flagged'

export function buildViewportBoundsPromptSection(flags: SystemPromptFlags) {
	return flagged(
		flags.hasUserViewportBoundsPart || flags.hasAgentViewportBoundsPart,
		`## Viewport & Task Boundary Constraints

You have been provided with strict horizontal boundaries labeled "SafeMinX" and "SafeMaxX" in your context.
You MUST ensure all shapes stay within these STRICT HORIZONTAL bounds.
Vertical positioning is flexible - shapes can extend beyond minY and maxY as the canvas scrolls vertically.

### Strict Boundary Format
- \`SafeMinX\`: Absolute Minimum X value. Nothing can be to the left of this.
- \`SafeMaxX\`: Absolute Maximum X value. Nothing can be to the right of this.

### Rules for Staying Within Bounds
1. **Creating shapes**: Ensure \`x >= SafeMinX\` and \`(x + w) <= SafeMaxX\`.
2. **Moving shapes**: Ensure horizontal position stays strictly between SafeMinX and SafeMaxX.
3. **Arrows and lines**: Horizontal endpoints (x1, x2) must be between \`SafeMinX\` and \`SafeMaxX\`.
4. **Text shapes**: Keep completely within horizontal bounds.

### Why This Matters
Shapes outside the HORIZONTAL bounds are cut off and not usable. We enforce a strict margin.
`
	)
}
