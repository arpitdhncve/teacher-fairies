import { ReactNode } from 'react'
import { FairyAgent } from '../../../fairy/fairy-agent/FairyAgent'
import { ChatPanel } from './ChatPanel'
/**
 * TlaSidebarLayout - Layout wrapper that displays ChatPanel on the left and content on the right
 */
export function TlaSidebarLayout({
	isEmbed,
	children,
	agent,
}: {
	isEmbed?: boolean
	children: ReactNode
	collapsible?: boolean
	agent?: FairyAgent
}) {
	return (
		<div
			style={{
				display: 'flex',
				height: '100vh',
				width: '100%',
			}}
			data-testid="tla-sidebar-layout"
		>
			{!isEmbed && <TlaSidebar agent={agent} />}
			<div style={{ flex: 1, minWidth: 0 }}>{children}</div>
		</div>
	)
}

/**
 * TlaSidebar now "represents" the ChatPanel UI.
 * - Accepts an agent prop to pass to ChatPanel
 */
export function TlaSidebar({ agent }: { agent?: FairyAgent }) {
	return (
		<aside
			data-testid="tla-sidebar"
			style={{
				width: '25%',
				minWidth: '300px',
				maxWidth: '500px',
				height: '100%',
				display: 'flex',
				flexDirection: 'column',
				// match your app styling as needed
				background: 'rgba(0,0,0,0.2)',
				borderRight: '1px solid rgba(255,255,255,0.08)',
			}}
		>
			<ChatPanel agent={agent} />
		</aside>
	)
}
