import { useEditor, useValue } from 'tldraw'
import { Fairy, SelectedFairy } from '../Fairy'
import { useFairyApp } from '../fairy-app/FairyAppProvider'

export function Fairies() {
	const editor = useEditor()
	const fairyApp = useFairyApp()
	const agents = useValue('fairy-agents', () => fairyApp?.agents.getAgents() ?? [], [fairyApp])
	const currentPageId = useValue('current page id', () => editor.getCurrentPageId(), [editor])

	// Reactively filter fairies based on current page and each fairy's currentPageId
	const activeAgents = useValue(
		'active fairies on page',
		() => {
			agents.forEach((agent, index) => {
				const entity = agent.getEntity()
				const mode = agent.mode.getMode()
				const hasEntity = entity !== undefined
				const matchesPage = entity?.currentPageId === currentPageId
				const willPass = hasEntity && matchesPage

			})

			const filtered = agents.filter((agent) => {
				const entity = agent.getEntity()
				// Show all fairies that exist and are on the current page (no sleeping check)
				return entity !== undefined && entity.currentPageId === currentPageId
			})

			return filtered
		},
		[agents, currentPageId]
	)

	const selectedAgents = useValue(
		'selected fairies',
		() => {
			return agents.filter((agent) => {
				const entity = agent.getEntity()
				// Show selected fairies on current page (no sleeping check)
				return entity !== undefined && entity.currentPageId === currentPageId && entity.isSelected
			})
		},
		[activeAgents]
	)

	return (
		<>
			{activeAgents.map((agent) => (
				<Fairy key={agent.id + '_fairy'} agent={agent} />
			))}
			{selectedAgents.map((agent) => (
				<SelectedFairy key={agent.id + '_selected'} agent={agent} />
			))}
		</>
	)
}
