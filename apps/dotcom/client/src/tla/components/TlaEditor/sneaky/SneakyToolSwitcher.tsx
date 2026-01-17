import { useEffect } from 'react'
import { TLShapeId, useEditor } from 'tldraw'
import { getIsCoarsePointer } from '../../../utils/getIsCoarsePointer'

// Allowed tools - users can only pan, select, and move things (but NOT edit text)
// Note: We exclude 'select.editing_shape' to prevent text editing
const ALLOWED_TOOLS = ['hand', 'select', 'select.idle', 'select.pointing_canvas', 'select.translating', 'select.brushing', 'select.pointing_shape', 'select.pointing_selection', 'select.fairy-throw', 'select.crop', 'select.resizing', 'select.rotating']

export function SneakyToolSwitcher() {
	const editor = useEditor()

	useEffect(() => {
		const pageHasShapes = editor.getCurrentPageShapeIds().size > 0
		// If the editor is in coarse pointer mode and there are some shapes on the current page,
		// start on the hand tool to avoid accidental selections / drags as the user tries to
		// orient themselves or move around the page
		if (getIsCoarsePointer() && pageHasShapes) {
			editor.setCurrentTool('hand')
		}

		// Prevent users from switching to content-creation tools (like text, draw, etc.)
		// Users can only pan and select/move shapes, but cannot create new content or edit text
		const handleToolChange = () => {
			const currentTool = editor.getCurrentToolId()
			
			// Check if the tool is allowed or is a sub-state of an allowed tool
			const isAllowed = ALLOWED_TOOLS.some(allowed => 
				currentTool === allowed || currentTool.startsWith(allowed + '.')
			)
			
			// If trying to use a disallowed tool (like 'text', 'draw', 'geo', 'select.editing_shape', etc.), switch back to hand
			if (!isAllowed && currentTool !== 'hand') {
				editor.setCurrentTool('hand')
			}
		}

		// Prevent user-created text shapes by listening to document changes
		// This catches double-click text creation and removes the shape immediately
		const handleDocumentChange = (entry: any) => {
			// Only process user actions, not remote/system changes
			if (entry.source !== 'user') return

			const { changes } = entry
			if (!changes?.added) return

			// Check for newly added text shapes and remove them
			const textShapesToRemove: TLShapeId[] = []
			for (const record of Object.values(changes.added)) {
				const shape = record as any
				if (shape?.typeName === 'shape' && shape?.type === 'text') {
					textShapesToRemove.push(shape.id as TLShapeId)
				}
			}

			if (textShapesToRemove.length > 0) {
				// Remove the text shapes that were just created by the user
				editor.deleteShapes(textShapesToRemove)
				// Reset tool to hand after blocking text creation
				editor.setCurrentTool('hand')
			}
		}

		// Listen to tool changes
		const unsubscribeSession = editor.store.listen(handleToolChange, { source: 'user', scope: 'session' })
		
		// Listen to document changes to prevent text shape creation
		const unsubscribeDocument = editor.store.listen(handleDocumentChange, { source: 'user', scope: 'document' })

		// Initial check
		handleToolChange()

		return () => {
			unsubscribeSession()
			unsubscribeDocument()
		}
	}, [editor])

	return null
}
