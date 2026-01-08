import { ReactNode } from 'react'
import { FairyAgent } from '../../../fairy/fairy-agent/FairyAgent'
import { useViewportContext } from '../../hooks/useViewportContext'
import { ChatPanel } from './ChatPanel'

/**
 * TlaSidebarLayout - Layout wrapper that displays ChatPanel on the left and content on the right
 * On mobile: Shows only ChatPanel at full width (canvas hidden, but TlaEditor still mounted for agent initialization)
 * On desktop: Shows ChatPanel sidebar + canvas content
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
	const { isMobile } = useViewportContext()

	// On mobile, show the chat panel at full width but still mount TlaEditor (hidden) for agent initialization
	if (isMobile && !isEmbed) {
		return (
			<div
				style={{
					display: 'flex',
					height: '100vh',
					width: '100%',
				}}
				data-testid="tla-sidebar-layout"
				data-mobile="true"
			>
				<div
					style={{
						width: '100%',
						height: '100%',
						display: 'flex',
						flexDirection: 'column',
						background: 'rgba(0,0,0,0.2)',
					}}
				>
					<ChatPanel agent={agent} />
				</div>
				{/* Hidden TlaEditor - needed to initialize the fairy agent on mobile */}
				<div style={{ display: 'none' }}>{children}</div>
			</div>
		)
	}

	// Desktop layout: sidebar + content
	return (
		<div
			style={{
				display: 'flex',
				height: '100vh',
				width: '100%',
			}}
			data-testid="tla-sidebar-layout"
			data-mobile="false"
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
				minWidth: '320px',
				maxWidth: '500px',
				height: '100%',
				display: 'flex',
				flexDirection: 'column',
				// Premium Midnight Glass - No Shadow
				background: 'linear-gradient(180deg, rgba(5, 5, 8, 0.85) 0%, rgba(10, 10, 20, 0.9) 100%)',
				backdropFilter: 'blur(24px) saturate(180%)',
				WebkitBackdropFilter: 'blur(24px) saturate(180%)',
				borderRight: '1px solid rgba(255, 255, 255, 0.04)',
				zIndex: 100,
				position: 'relative',
			}}
		>
			<ChatPanel agent={agent} />
		</aside>
	)
}
