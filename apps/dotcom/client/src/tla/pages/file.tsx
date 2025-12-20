import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { TlaEditor } from '../components/TlaEditor/TlaEditor'
import { useMaybeApp } from '../hooks/useAppState'
import { TlaSidebarLayout } from '../layouts/TlaSidebarLayout/TlaSidebarLayout'

export function Component() {
	const { fileSlug } = useParams<{ fileSlug: string }>()
	if (!fileSlug) throw Error('File id not found')
	const app = useMaybeApp()

	// State to hold the leader agent passed from TlaEditor
	const [leaderAgent, setLeaderAgent] = useState<any | null>(null)

	useEffect(() => {
		if (app && fileSlug) {
			app.ensureFileVisibleInSidebar(fileSlug)
		}
	}, [app, fileSlug])

	// use a search param to hide the sidebar completely
	const isEmbed = !!new URLSearchParams(window.location.search).get('embed')

	return (
		<TlaSidebarLayout collapsible isEmbed={isEmbed} agent={leaderAgent}>
			<TlaEditor
				fileSlug={fileSlug}
				deepLinks
				isEmbed={isEmbed}
				onLeaderAgentChange={setLeaderAgent}
			/>
		</TlaSidebarLayout>
	)
}
