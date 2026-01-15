import {
	AgentAction,
	AgentId,
	AgentInput,
	AgentPrompt,
	AgentRequest,
	BaseAgentPrompt,
	ChatHistoryItem,
	ChatHistoryPromptItem,
	convertTldrawShapeToFocusedShape,
	FAIRY_VISION_DIMENSIONS,
	FairyConfig,
	FairyEntity,
	FairyModeDefinition,
	FairyProject,
	FairyProjectRole,
	FairyRole,
	FairyTask,
	FairyTodoItem,
	FairyWork,
	FocusedShape,
	getFairyModeDefinition,
	PromptPart,
	StreamActionsRequest,
	Streaming,
	toProjectId,
} from '@tldraw/fairy-shared'
import {
	Atom,
	atom,
	Box,
	computed,
	Computed,
	Editor,
	fetch,
	react,
	RecordsDiff,
	reverseRecordsDiff,
	structuredClone,
	TLRecord,
	uniqueId,
	VecModel,
} from 'tldraw'
import { FAIRY_WORKER } from '../../utils/config'
import { FairyApp } from '../fairy-app/FairyApp'
import { getRandomFairyHat } from '../fairy-helpers/getRandomFairyHat'
import { getRandomFairyHatColor } from '../fairy-helpers/getRandomFairyHatColor'
import { getRandomFairyName } from '../fairy-helpers/getRandomFairyName'
import { getRandomLegLength } from '../fairy-helpers/getRandomLegLength'
import { getPromptPartUtilsRecord } from '../fairy-part-utils/fairy-part-utils'
import { PromptPartUtil } from '../fairy-part-utils/PromptPartUtil'
import { AgentHelpers } from './AgentHelpers'
import { FAIRY_MODE_CHART } from './FairyModeNode'
import { FairyAgentActionManager } from './managers/FairyAgentActionManager'
import { FairyAgentChatManager } from './managers/FairyAgentChatManager'
import { FairyAgentChatOriginManager } from './managers/FairyAgentChatOriginManager'
import { FairyAgentGestureManager } from './managers/FairyAgentGestureManager'
import { FairyAgentLintManager } from './managers/FairyAgentLintManager'
import { FairyAgentModeManager } from './managers/FairyAgentModeManager'
import { FairyAgentPositionManager } from './managers/FairyAgentPositionManager'
import { FairyAgentRequestManager } from './managers/FairyAgentRequestManager'
import { FairyAgentTodoManager } from './managers/FairyAgentTodoManager'
import { FairyAgentUsageTracker } from './managers/FairyAgentUsageTracker'
import { FairyAgentUserActionTracker } from './managers/FairyAgentUserActionTracker'
import { FairyAgentWaitManager } from './managers/FairyAgentWaitManager'

export interface FairyAgentOptions {
	/** The editor to associate the agent with. */
	editor: Editor
	/** The fairy app to associate the agent with. */
	fairyApp: FairyApp
	/** A key used to differentiate the agent from other agents. */
	id: AgentId
	/** A callback for when an error occurs. */
	onError(e: any): void
	/** A function to get the authentication token. */
	getToken?(): Promise<string | undefined>
}

/**
 * An agent that can be prompted to edit the canvas.
 * Returned by the `useTldrawAgent` hook.
 *
 * @example
 * ```tsx
 * const agent = useTldrawAgent(editor)
 * agent.prompt({ message: 'Draw a snowman' })
 * ```
 */
export class FairyAgent {
	/** An id to differentiate the agent from other agents. */
	id: AgentId

	/** The editor associated with this agent. */
	editor: Editor

	/** The fairy app associated with this agent. */
	fairyApp: FairyApp

	/** The action manager associated with this agent. */
	actions: FairyAgentActionManager

	/** The chat manager associated with this agent. */
	chat: FairyAgentChatManager

	/** The chat origin manager associated with this agent. */
	chatOrigin: FairyAgentChatOriginManager

	/** The gesture manager associated with this agent. */
	gesture: FairyAgentGestureManager

	/** The mode manager associated with this agent. */
	mode: FairyAgentModeManager

	/** The position manager associated with this agent. */
	position: FairyAgentPositionManager

	/** The request manager associated with this agent. */
	requests: FairyAgentRequestManager

	/** The todo manager associated with this agent. */
	todos: FairyAgentTodoManager

	/** The usage tracker associated with this agent. */
	usage: FairyAgentUsageTracker

	/** The user action tracker associated with this agent. */
	userAction: FairyAgentUserActionTracker

	/** The wait manager associated with this agent. */
	waits: FairyAgentWaitManager

	/** The lint manager associated with this agent. */
	lints: FairyAgentLintManager

	/** The fairy entity associated with this agent. */
	private $fairyEntity: Atom<FairyEntity>

	/** The fairy configuration associated with this agent. */
	private $fairyConfig: Computed<FairyConfig>

	/** A callback for when an error occurs. */
	onError: (e: any) => void

	/** A function to get the authentication token. */
	getToken?: () => Promise<string | undefined>

	/**
	 * Debug flags for controlling logging behavior in the worker.
	 */
	$debugFlags = atom<{ logSystemPrompt: boolean; logMessages: boolean; logResponseTime: boolean }>(
		'debugFlags',
		{
			logSystemPrompt: false,
			logMessages: false,
			logResponseTime: false,
		}
	)

	/**
	 * Whether the agent should use one-shotting mode or soloing mode when prompted solo.
	 */
	$useOneShottingMode = atom<boolean>('oneShotMode', true)

	/**
	 * A function that stops the wake-on-select reaction.
	 */
	private wakeOnSelectReaction: () => void

	/**
	 * Handler for the max-shapes event to cancel fairy when limit is reached.
	 */
	private handleMaxShapes: () => void

	/**
	 * Handler for the tick event to update the fairy's position.
	 */
	private onTick: (delta: number) => void

	/**
	 * Get the current project that the agent is working on.
	 * @param includeSoftDeleted - If true, returns the project even if it's soft deleted. Defaults to false.
	 */
	getProject(includeSoftDeleted: boolean = false): FairyProject | null {
		return this.fairyApp.projects.getProjectByAgentId(this.id, includeSoftDeleted) ?? null
	}

	getEntity(): FairyEntity {
		return this.$fairyEntity.get()
	}

	updateEntity(next: FairyEntity | ((entity: FairyEntity) => FairyEntity)) {
		if (typeof next === 'function') {
			this.$fairyEntity.update(next)
		} else {
			this.$fairyEntity.set(next)
		}
	}

	getConfig(): FairyConfig {
		return this.$fairyConfig.get()
	}

	/**
	 * Get the tasks that the agent is working on.
	 */
	getTasks(): FairyTask[] {
		return this.fairyApp.tasks.getTasksByAgentId(this.id)
	}

	/**
	 * Clear all tasks assigned to the agent.
	 */
	clearTasks() {
		const tasks = this.getTasks()
		tasks.forEach((task) => this.fairyApp.tasks.deleteTask(task.id))
	}

	/**
	 * Get the role of the agent within its current project.
	 */
	getRole(): FairyProjectRole | null {
		const project = this.getProject()
		if (!project) return null
		return project.members.find((member) => member.id === this.id)?.role ?? null
	}

	/**
	 * Get the work that the agent is currently working on.
	 * @returns The work.
	 */
	getWork(): FairyWork {
		return {
			project: this.getProject(),
			tasks: this.getTasks(),
		}
	}
	/**
	 * Create a new tldraw agent.
	 */
	constructor({ id, editor, fairyApp, onError, getToken }: FairyAgentOptions) {
		this.editor = editor
		this.fairyApp = fairyApp
		this.id = id
		this.getToken = getToken

		// Initialize managers after editor is set
		this.actions = new FairyAgentActionManager(this)
		this.chat = new FairyAgentChatManager(this)
		this.chatOrigin = new FairyAgentChatOriginManager(this)
		this.gesture = new FairyAgentGestureManager(this)
		this.mode = new FairyAgentModeManager(this)
		this.position = new FairyAgentPositionManager(this)
		this.requests = new FairyAgentRequestManager(this)
		this.todos = new FairyAgentTodoManager(this)
		this.usage = new FairyAgentUsageTracker(this)
		this.userAction = new FairyAgentUserActionTracker(this)
		this.waits = new FairyAgentWaitManager(this)
		this.lints = new FairyAgentLintManager(this)

		const spawnPoint = this.position.findFairySpawnPoint()

		this.$fairyEntity = atom<FairyEntity>(`fairy-${id}`, {
			position: AgentHelpers.RoundVec(spawnPoint),
			flipX: Math.random() < 0.5,
			isSelected: false,
			pose: 'idle',
			gesture: null,
			currentPageId: editor.getCurrentPageId(),
			velocity: { x: 0, y: 0 },
		})

		// Always use the same default fairy config for all users (logged in or anonymous)
		this.$fairyConfig = computed<FairyConfig>(`fairy-config-${id}`, () => {
			return {
				name: getRandomFairyName(),
				outfit: { body: 'plain', hat: 'top', wings: 'plain' },
				hat: getRandomFairyHat(),
				hatColor: getRandomFairyHatColor(),
				legLength: getRandomLegLength(),
				version: 2,
			} satisfies FairyConfig
		})

		this.onError = onError

		// Agent is added to the manager's atom by FairyAppAgentsManager.syncAgentsWithConfigs

		// Wake up sleeping fairies when they become selected
		this.wakeOnSelectReaction = react(`fairy-${id}-wake-on-select`, () => {
			const entity = this.$fairyEntity.get()
			if (entity?.isSelected && this.mode.getMode() === 'sleeping') {
				this.mode.setMode('idling')
			}
		})

		// A fairy agent's prompt part utils are static. They don't change.
		this.promptPartUtils = getPromptPartUtilsRecord(this)

		this.userAction.startRecording()

		// Cancel fairy when max shapes limit is reached
		this.handleMaxShapes = () => {
			if (this.requests.isGenerating()) {
				this.interrupt({
					input: {
						agentMessages: ['Maximum shapes reached. Stop all your work.'],
					},
				})
			}
		}

		this.onTick = (delta: number) => {
			this.position.applyVelocity(delta)
		}

		editor.addListener('max-shapes', this.handleMaxShapes)
		editor.addListener('tick', this.onTick)

		// Poof on spawn
		this.gesture.push('poof', 400)
	}

	/**
	 * Dispose of the agent by cancelling requests and stopping listeners.
	 */
	dispose() {
		this.cancel()
		this.userAction.dispose()
		this.wakeOnSelectReaction?.()
		this.editor.removeListener('max-shapes', this.handleMaxShapes)
		this.editor.removeListener('tick', this.onTick)
		// Stop following this fairy if it's currently being followed
		if (this.position.getFollowingFairyId() === this.id) {
			this.position.stopFollowing()
		}
		// Agent is removed from the manager's atom by FairyAppAgentsManager.syncAgentsWithConfigs
	}

	/**
	 * Serialize the fairy agent's state to a plain object for persistence.
	 * This is stored in the database as JSON.
	 */
	serializeState() {
		return {
			fairyEntity: this.$fairyEntity.get(),
			chatHistory: this.chat.serializeState(),
			chatOrigin: this.chatOrigin.serializeState(),
			personalTodoList: this.todos.serializeState(),
			waitingFor: this.waits.serializeState(),
		}
	}

	/**
	 * Load previously persisted state into the fairy agent.
	 * This is called when opening a file to restore the fairy's state.
	 */
	loadState(state: {
		fairyEntity?: FairyEntity
		chatHistory?: ChatHistoryItem[]
		chatOrigin?: VecModel
		personalTodoList?: FairyTodoItem[]
		waitingFor?: { eventType: string; id: string; metadata?: Record<string, any> }[]
	}) {
		if (state.fairyEntity) {
			// Clear gestures first to clean up any active timeouts and gesture stack
			this.gesture.reset()

			this.$fairyEntity.update((entity) => {
				// Override sleeping pose with idle, since sleeping mode is removed
				const loadedPose = state.fairyEntity?.pose ?? entity.pose
				const pose = loadedPose === 'sleeping' ? 'idle' : loadedPose
				return {
					...entity,
					flipX: state.fairyEntity?.flipX ?? entity.flipX,
					currentPageId: state.fairyEntity?.currentPageId ?? entity.currentPageId,
					isSelected: state.fairyEntity?.isSelected ?? entity.isSelected,
					pose,
					velocity: { x: 0, y: 0 },
					gesture: null,
				}
			})

			// Always set mode to idling when loading state (sleeping mode removed)
			this.mode.setMode('idling')
		}
		if (state.chatHistory) {
			this.chat.loadState(state.chatHistory)
		}
		if (state.chatOrigin) {
			this.chatOrigin.loadState(state.chatOrigin)
		}
		if (state.personalTodoList) {
			this.todos.loadState(state.personalTodoList)
		}
		if (state.waitingFor) {
			this.waits.loadState(state.waitingFor)
		}
		if (state.fairyEntity?.position) {
			this.$fairyEntity.update((entity) => {
				return {
					...entity,
					position: AgentHelpers.RoundVec(state.fairyEntity?.position ?? entity.position),
				}
			})
		}
	}

	/**
	 * A record of the agent's prompt part util instances.
	 * Used by the `getPromptPartUtil` method.
	 */
	promptPartUtils: Record<PromptPart['type'], PromptPartUtil<PromptPart>>

	/**
	 * Get a prompt part util for a specific part type.
	 *
	 * @param type - The type of part to get the util for.
	 * @returns The part util.
	 */
	getPromptPartUtil(type: PromptPart['type']) {
		return this.promptPartUtils[type]
	}

	/**
	 * Get a full prompt based on a request.
	 *
	 * @param request - The request to use for the prompt.
	 * @param helpers - The helpers to use.
	 * @returns The fully assembled prompt.
	 */
	async preparePrompt(request: AgentRequest, helpers: AgentHelpers): Promise<AgentPrompt> {
		const { promptPartUtils } = this
		const parts: PromptPart[] = []

		const mode = getFairyModeDefinition(this.mode.getMode())
		if (!mode.active) {
			throw new Error(`Fairy is not in an active mode so can't act right now`)
		}
		const availablePromptPartTypes = mode.parts(this.getWork())
		for (const partType of availablePromptPartTypes) {
			const util = promptPartUtils[partType]
			if (!util) throw new Error(`Prompt part util not found for part type: ${partType}`)
			const part = await util.getPart(structuredClone(request), helpers)
			if (!part) continue
			parts.push(part)
		}

		return Object.fromEntries(parts.map((part) => [part.type, part])) as AgentPrompt
	}

	/**
	 * Prompt the agent to edit the canvas.
	 *
	 * @example
	 * ```tsx
	 * const agent = useTldrawAgent(editor)
	 * agent.prompt('Draw a cat')
	 * ```
	 *
	 * ```tsx
	 * agent.prompt({
	 *   message: 'Draw a cat in this area',
	 *   bounds: {
	 *     x: 0,
	 *     y: 0,
	 *     w: 300,
	 *     h: 400,
	 *   },
	 * })
	 * ```
	 *
	 * @returns A promise for when the agent has finished its work.
	 */
	async prompt(input: AgentInput, { nested = false }: { nested?: boolean } = {}) {
		if (this.requests.isGenerating() && !nested) {
			throw new Error('Agent is already prompting. Please wait for the current prompt to finish.')
		}

		this.requests.setIsPrompting(true)

		if (this.isActingOnEditor) {
			throw new Error(
				"Agent is already acting. It's illegal to prompt an agent during an action. Please use schedule instead."
			)
		}

		const request = this.requests.getFullRequestFromInput(input)
		const startingNode = FAIRY_MODE_CHART[this.mode.getMode()]
		startingNode.onPromptStart?.(this, request)

		const initialModeDefinition = getFairyModeDefinition(this.mode.getMode())
		if (!initialModeDefinition.active) {
			throw new Error(
				`Fairy is not in an active mode so can't act right now. First change to an active mode. Current mode: ${this.mode.getMode()}`
			)
		}

		// Submit the request to the agent.
		try {
			await this.request(request)
		} catch (e) {
			console.error('Error data:', e)
			this.requests.setIsPrompting(false)
			this.requests.setCancelFn(null)
			return
		}

		// If there's no schedule request...
		// Trigger onPromptEnd callback(s)
		let modeChanged = true
		while (!this.requests.getScheduledRequest() && modeChanged) {
			modeChanged = false
			const mode = this.mode.getMode()
			const node = FAIRY_MODE_CHART[mode]
			node.onPromptEnd?.(this, request)
			const newMode = this.mode.getMode()
			if (newMode !== mode) {
				modeChanged = true
			}
		}

		// If there's still no scheduled request, quit
		const scheduledRequest = this.requests.getScheduledRequest()
		const eventualMode = this.mode.getMode()
		const eventualModeDefinition = getFairyModeDefinition(eventualMode)
		if (!scheduledRequest) {
			if (eventualModeDefinition.active) {
				throw new Error(
					`Fairy is not allowed to become inactive during the active mode: ${eventualMode}`
				)
			}
			this.requests.setIsPrompting(false)
			this.requests.setCancelFn(null)
			return
		}

		// If there *is* a scheduled request...
		// Add the scheduled request to chat history
		const resolvedData = await Promise.all(scheduledRequest.data)
		this.chat.push({
			id: uniqueId(),
			type: 'continuation',
			data: resolvedData,
			memoryLevel: eventualModeDefinition.memoryLevel,
		})

		// Handle the scheduled request and clear it
		this.requests.setScheduledRequest(null)
		await this.prompt(scheduledRequest, { nested: true })
	}

	/**
	 * Send a single request to the agent and handle its response.
	 *
	 * Note: This method does not chain multiple requests together. For a full
	 * agentic system, use the `prompt` method.
	 *
	 * Most developers will not want to use this method directly. It's mostly
	 * used internally by the `prompt` method, but can also be useful for
	 * carrying out evals.
	 *
	 * @param input - The input to form the request from.
	 * @returns A promise for when the request is complete and a cancel function
	 * to abort the request.
	 */
	async request(input: AgentInput) {
		const request = this.requests.getFullRequestFromInput(input)

		// Interrupt any currently active request
		if (this.requests.getActiveRequest() !== null) {
			this.cancel()
		}
		this.requests.setActiveRequest(request)

		// Call an external helper function to request the agent
		const { promise, cancel } = this.requestAgentActions({ agent: this, request })

		this.requests.setCancelFn(cancel)
		// promise.finally(() => {
		// 	this.requestManager.setCancelFn(null)
		// })

		const results = await promise
		this.requests.setActiveRequest(null)
		return results
	}

	/**
	 * Schedule further work for the agent to do after this request has finished.
	 * If there's no active request, then do the scheduled request immediately.
	 * What you schedule will get merged with the currently scheduled request, if there is one.
	 *
	 * @example
	 * ```tsx
	 * // Add an instruction
	 * agent.schedule('Add more detail.')
	 * ```
	 *
	 * @example
	 * ```tsx
	 * // Move the viewport
	 * agent.schedule({
	 *  bounds: { x: 0, y: 0, w: 100, h: 100 },
	 * })
	 * ```
	 *
	 * @example
	 * ```tsx
	 * // Add data to the request
	 * agent.schedule({ data: [value] })
	 * ```
	 */
	schedule(input: AgentInput) {
		const scheduledRequest = this.requests.getScheduledRequest()

		// If there's no request scheduled yet, schedule one
		if (!scheduledRequest) {
			this._schedule(input)
			return
		}

		// If there's already a scheduled request, append to it
		const newRequest = this.requests.getPartialRequestFromInput(input)
		this._schedule({
			// Append to properties where possible
			agentMessages: [...scheduledRequest.agentMessages, ...(newRequest.agentMessages ?? [])],
			userMessages: [...scheduledRequest.userMessages, ...(newRequest.userMessages ?? [])],
			data: [...scheduledRequest.data, ...(newRequest.data ?? [])],

			// Override other properties
			bounds: newRequest.bounds ?? scheduledRequest.bounds,
			source: newRequest.source ?? scheduledRequest.source ?? 'self',
		})
	}

	/**
	 * Interrupt the agent and set their mode.
	 * Optionally, schedule a request.
	 */
	interrupt({ input, mode }: { input: AgentInput | null; mode?: FairyModeDefinition['type'] }) {
		this.requests.cancel()

		if (mode) {
			this.mode.setMode(mode)
		}
		if (input !== null) {
			this.schedule(input)
		}
	}

	/**
	 * Manually override what the agent should do next.
	 *
	 * @example
	 * ```tsx
	 * agent.setScheduledRequest('Add more detail.')
	 * ```
	 *
	 * @example
	 * ```tsx
	 * agent.setScheduledRequest({
	 *  message: 'Add more detail to this area.',
	 *  bounds: { x: 0, y: 0, w: 100, h: 100 },
	 * })
	 * ```
	 *
	 * @example
	 * ```tsx
	 * // Cancel the scheduled request
	 * agent.setScheduledRequest(null)
	 * ```
	 *
	 * @param input - What to set the scheduled request to, or null to cancel
	 * the scheduled request.
	 */
	private _schedule(input: AgentInput | null) {
		if (input === null) {
			this.requests.clearScheduledRequest()
			return
		}

		const activeRequest = this.requests.getActiveRequest()
		const partialRequest = this.requests.getPartialRequestFromInput(input)
		const request: AgentRequest = {
			agentMessages: partialRequest.agentMessages ?? [],
			bounds:
				partialRequest.bounds ??
				activeRequest?.bounds ??
				Box.FromCenter(this.$fairyEntity.get().position, FAIRY_VISION_DIMENSIONS),
			data: partialRequest.data ?? [],
			source: partialRequest.source ?? 'self',
			userMessages: partialRequest.userMessages ?? [],
		}

		const isCurrentlyActive = this.requests.isGenerating()

		if (isCurrentlyActive) {
			this.requests.setScheduledRequest(request)
		} else {
			this.prompt(request)
		}
	}

	/**
	 * Stream a response from the model.
	 * Act on the model's events as they come in.
	 *
	 * Not to be called directly. Use `prompt` instead.
	 * This is a helper function that is used internally by the agent.
	 */
	/**
	 * Modes that indicate the fairy is acting as a leader/orchestrator
	 */
	private static readonly LEADER_MODES = [
		'duo-orchestrating-active',
		'duo-orchestrating-waiting',
		'orchestrating-active',
		'orchestrating-waiting',
		'working-orchestrator',
	] as const

	/**
	 * Modes that indicate the fairy is acting as a follower/drone
	 */
	private static readonly FOLLOWER_MODES = ['working-drone'] as const

	async *_streamActions({
		prompt,
		signal,
	}: {
		prompt: BaseAgentPrompt
		signal: AbortSignal
	}): AsyncGenerator<Streaming<AgentAction>> {
		const headers: HeadersInit = {
			'Content-Type': 'application/json',
		}

		// Add authentication token if available
		if (this.getToken) {
			const token = await this.getToken()
			if (token) {
				headers['Authorization'] = `Bearer ${token}`
			}
		}

		// Determine fairy role from current mode
		const mode = this.mode.getMode()
		let fairyRole: FairyRole = 'default'
		if ((FairyAgent.LEADER_MODES as readonly string[]).includes(mode)) {
			fairyRole = 'leader'
		} else if ((FairyAgent.FOLLOWER_MODES as readonly string[]).includes(mode)) {
			fairyRole = 'follower'
		}

		// Get current working task (first in-progress task assigned to this agent)
		const allTasks = this.fairyApp.tasks.getTasks()
		const workingTasks = allTasks.filter(
			(task: FairyTask) => task.assignedTo === this.id && task.status === 'in-progress'
		)
		const currentTask = workingTasks.length > 0 ? workingTasks[0] : null

		// Build request body with prompt and metadata
		const requestBody: StreamActionsRequest = {
			prompt: prompt as AgentPrompt,
			metadata: {
				fairyRole,
				currentTask,
			},
		}



		let res: Response
		try {
			res = await fetch(`${FAIRY_WORKER}/stream-actions`, {
				method: 'POST',
				body: JSON.stringify(requestBody),
				headers,
				signal,
			})

		} catch (fetchErr) {

			throw fetchErr
		}

		if (!res.ok) {
			const errorText = await res.text().catch(() => '')

			let errorData: any = { error: 'Unknown error' }
			try {
				errorData = JSON.parse(errorText)
			} catch {
				errorData = { error: errorText || 'Request failed' }
			}
			throw new Error(errorData.error || 'Request failed')
		}

		if (!res.body) {
			throw Error('No body in response')
		}

		const reader = res.body.getReader()
		const decoder = new TextDecoder()
		let buffer = ''

		try {
			while (true) {
				const { value, done } = await reader.read()
				if (done) break

				buffer += decoder.decode(value, { stream: true })
				const actions = buffer.split('\n\n')
				buffer = actions.pop() || ''

				for (const action of actions) {
					const match = action.match(/^data: (.+)$/m)
					if (match) {
						try {
							const data = JSON.parse(match[1])

							// If the response contains an error, throw it
							if ('error' in data) {
								throw new Error(data.error)
							}

							const agentAction: Streaming<AgentAction> = data
							yield agentAction
						} catch (err: any) {
							throw new Error(err.message)
						}
					}
				}
			}
		} finally {
			reader.releaseLock()
		}
	}

	/**
	 * Cancel the agent's current prompt, if one is active.
	 */
	cancel() {
		const request = this.requests.getActiveRequest()
		if (request) {
			const mode = this.mode.getMode()
			const node = FAIRY_MODE_CHART[mode]
			node.onPromptCancel?.(this, request)

			const newMode = this.mode.getMode()
			const newModeDefinition = getFairyModeDefinition(newMode)
			if (newModeDefinition.active) {
				throw new Error(
					`Fairy is not allowed to become inactive during the active mode: ${newMode}`
				)
			}
		}

		this.requests.cancel()
	}

	/**
	 * Reset the agent's chat and memory.
	 * Cancel the current request if there's one active.
	 */
	reset() {
		this.cancel()
		this.promptStartTime = null
		this.todos.reset()
		this.userAction.clearHistory()

		// Delete all tasks assigned to this agent
		this.clearTasks()

		this.mode.setMode('idling')

		this.chat.reset()
		this.chatOrigin.reset()

		// clear any waiting conditions
		this.waits.reset()

		// Reset the request manager
		this.requests.reset()

		// Reset cumulative usage tracking when starting a new chat
		this.usage.reset()

		// Reset lint tracking when starting a new chat
		this.lints.reset()
	}

	/**
	 * Whether the agent is currently acting on the editor or not.
	 * This flag is used to prevent agent actions from being recorded as user actions.
	 *
	 * Do not use this to check if the agent is currently working on a request. Use `isGenerating` instead.
	 */
	private isActingOnEditor = false

	/**
	 * Get whether the agent is currently acting on the editor.
	 * @returns true if the agent is currently acting, false otherwise.
	 */
	getIsActingOnEditor(): boolean {
		return this.isActingOnEditor
	}

	/**
	 * Set whether the agent is currently acting on the editor.
	 * @param value - true if the agent is acting, false otherwise.
	 * @internal
	 */
	setIsActingOnEditor(value: boolean): void {
		this.isActingOnEditor = value
	}

	/**
	 * Tracks the start time of the current prompt being timed.
	 * Set when timing starts, cleared when timing stops.
	 */
	promptStartTime: number | null = null

	/**
	 * Update the fairy configuration with the given partial configuration.
	 * @param partial - The partial configuration to update.
	 */
	updateFairyConfig(partial: Partial<FairyConfig>) {
		this.fairyApp.tldrawApp?.z.mutate.user.updateFairyConfig({
			id: this.id,
			properties: partial,
		})
	}

	public deleteFairyConfig() {
		this.fairyApp.tldrawApp?.z.mutate.user.deleteFairyConfig({ id: this.id })
	}

	private requestAgentActions({ agent, request }: { agent: FairyAgent; request: AgentRequest }) {
		const { editor } = agent

		const mode = getFairyModeDefinition(agent.mode.getMode())

		// Convert arrays to strings for ChatHistoryPromptItem
		const agentFacingMessage = request.agentMessages.join('\n')
		const userFacingMessage = request.userMessages.join('\n')

		const promptHistoryItem: ChatHistoryPromptItem = {
			id: uniqueId(),
			type: 'prompt',
			promptSource: request.source,
			agentFacingMessage,
			userFacingMessage,
			memoryLevel: mode.memoryLevel,
		}
		agent.chat.push(promptHistoryItem)

		let cancelled = false
		const controller = new AbortController()
		const signal = controller.signal
		const helpers = new AgentHelpers(agent)

		if (!mode.active) {
			agent.cancel()
			throw new Error(`Fairy is not in an active mode so can't act right now`)
		}
		const availableActions = mode.actions(agent.getWork())

		const requestPromise = (async () => {
			const prompt = await agent.preparePrompt(request, helpers)
			let incompleteDiff: RecordsDiff<TLRecord> | null = null
			const actionPromises: Promise<void>[] = []
			try {
				for await (const action of agent._streamActions({ prompt, signal })) {
					if (cancelled) break

					editor.run(
						() => {
							const actionUtilType = agent.actions.getAgentActionUtilType(action._type)
							const actionUtil = agent.actions.getAgentActionUtil(action._type)

							// If the action is not in the wand's available actions, skip it
							if (!(availableActions as string[]).includes(actionUtilType)) {
								return
							}

							// helpers the agent's action
							const transformedAction = actionUtil.sanitizeAction(action, helpers)
							if (!transformedAction) {
								incompleteDiff = null
								return
							}

							// If there was a diff from an incomplete action, revert it so that we can reapply the action
							if (incompleteDiff) {
								const inversePrevDiff = reverseRecordsDiff(incompleteDiff)
								editor.store.applyDiff(inversePrevDiff)
							}

							// Apply the action to the app and editor
							const { diff, promise } = agent.actions.act(transformedAction, helpers)

							if (promise) {
								actionPromises.push(promise)
							}

							// The the action is incomplete, save the diff so that we can revert it in the future
							if (transformedAction.complete) {
								incompleteDiff = null
								// Track shapes created by this complete action for lint detection
								agent.lints.trackShapesFromDiff(diff)
								
								// Record the action for task logging (for all active in-progress tasks)
								const activeTaskIds = agent.fairyApp.taskLogging.getActiveTaskIds()
								for (const taskId of activeTaskIds) {
									agent.fairyApp.taskLogging.recordTaskAction(taskId, transformedAction)
								}
							} else {
								incompleteDiff = diff
							}
						},
						{
							ignoreShapeLock: false,
							history: 'ignore',
						}
					)
				}
				await Promise.all(actionPromises)
			} catch (e) {
				if (e === 'Cancelled by user' || (e instanceof Error && e.name === 'AbortError')) {
					return
				}

				agent.onError(e)

				throw e
			}
		})()

		const cancel = () => {
			cancelled = true
			controller.abort('Cancelled by user')
		}

		return { promise: requestPromise, cancel }
	}

	async snapshotCanvas(): Promise<string> {
		console.log('🔄 Starting canvas snapshot process...')
		const { editor } = this

		const viewportBounds = editor.getViewportPageBounds()
		const maxXValue = viewportBounds ? viewportBounds.x + viewportBounds.w : 0
		const maxYValue = viewportBounds ? viewportBounds.y + viewportBounds.h : 0

		const currentPageId = editor.getCurrentPageId()
		const shapeIds = Array.from(editor.getCurrentPageShapeIds())
		const shapes = editor.getCurrentPageShapes()

		const helpers = new AgentHelpers(this)

		console.log('📊 Processing shapes data...')
		const simpleShapes: FocusedShape[] = shapes.map((s) =>
			convertTldrawShapeToFocusedShape(editor, s)
		)

		const normalizedShapes = simpleShapes.map((s) =>
			helpers.roundShape(helpers.applyOffsetToShape(s))
		)

		console.log(`📸 Generating image for ${shapeIds.length} shapes...`)
		let imageDataUrl: string | null = null

		if (shapeIds.length > 0) {
			const viewportBounds = editor.getViewportPageBounds()
			try {
				const { blob } = await editor.toImage(shapeIds, {
					format: 'png',
					background: true,
					scale: 2,
					padding: 0,
					...(viewportBounds ? { bounds: viewportBounds } : {}),
				})

				imageDataUrl = await new Promise<string>((resolve, reject) => {
					const fr = new FileReader()
					fr.onload = () => resolve(fr.result as string)
					fr.onerror = () => reject(fr.error ?? new Error('Failed to read image'))
					fr.readAsDataURL(blob)
				})
			} catch (e) {
				const msg = e instanceof Error ? e.message : String(e)
				console.warn(
					`snapshotCanvas(): render failed for page ${currentPageId}, sending null image. ${msg}`
				)
				imageDataUrl = null
			}
		}

		const pageName = 'Current Page'

		console.log('🌐 Calling backend API to save snapshot...')
		const resp = await fetch('http://localhost:3001/snapshot-canvas', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				current_editor: {
					page_id: currentPageId,
					name: pageName,
					image: imageDataUrl,
				},
				current_editor_shapes: normalizedShapes,
				max_x_value: maxXValue,
				max_y_value: maxYValue,
			}),
		})

		console.log(`📡 Backend response status: ${resp.status}`)
		if (!resp.ok) {
			throw new Error(`API ${resp.status} ${resp.statusText}`)
		}

		const data = (await resp.json()) as { status: string; uuid: string }
		if (!data?.uuid) {
			throw new Error('MISSING_UUID_IN_RESPONSE')
		}

		console.log('📤 Snapshot UUID received:', data.uuid)
		console.log('✅ Canvas snapshot process completed')
		return data.uuid
	}

	/**
	 * Draw from a LiveKit instruction using duo orchestration mode.
	 * This method is called when the leader fairy receives a drawing instruction from LiveKit.
	 *
	 * The leader will:
	 * 1. Find the follower fairy (should be exactly 1 other fairy)
	 * 2. Create a duo project with itself as duo-orchestrator and the follower as drone
	 * 3. Receive the instruction and plan the work
	 * 4. Delegate tasks to the follower fairy using the duo orchestration system
	 *
	 * @param instruction - The instruction text to execute
	 * @returns A promise that resolves when the orchestration is set up
	 */
	async drawFromLiveKitInstruction(instruction: string) {
		if (!this.editor) {
			throw new Error('Editor not ready')
		}

		// Reset the leader agent to clear all previous context (chat history, todos, lints, etc.)
		this.reset()

		// Get all agents and find the follower (should be exactly 1 other agent)
		const allAgents = this.fairyApp.agents.getAgents()
		const followerAgents = allAgents.filter(
			(agent) =>
				agent.id !== this.id && this.fairyApp.projects.getProjectByAgentId(agent.id) === undefined
		)

		if (followerAgents.length === 0) {
			// No follower available, fall back to solo mode
			console.warn('No follower agent available for duo mode, using solo mode')
			const bounds = this.editor.getViewportPageBounds()
			await this.prompt({
				message: instruction,
				bounds,
			})
			return
		}

		// Create a duo project
		const follower = followerAgents[0]

		// Reset the follower agent to clear all previous context
		follower.reset()

		const newProjectId = uniqueId(5)
		const newProject: FairyProject = {
			id: toProjectId(newProjectId),
			title: '',
			description: '',
			color: '',
			members: [
				{ id: this.id, role: 'duo-orchestrator' },
				{ id: follower.id, role: 'drone' },
			],
			plan: '',
			softDeleted: false,
			originalPrompt: instruction,
		}

		// Clean up any soft-deleted projects and add the new one
		this.fairyApp.projects.hardDeleteSoftDeletedProjects()
		this.fairyApp.projects.addProject(newProject)

		// Select both fairies in the project
		// Only update agents whose selection state is actually changing to prevent cascading re-renders
		allAgents.forEach((agent) => {
			const shouldSelect = newProject.members.some((member) => member.id === agent.id)
			const currentlySelected = agent.getEntity()?.isSelected ?? false
			if (currentlySelected !== shouldSelect) {
				agent.updateEntity((f) => (f ? { ...f, isSelected: shouldSelect } : f))
			}
		})

		// Set leader as duo-orchestrator
		this.interrupt({
			mode: 'duo-orchestrating-active',
			input: null,
		})

		// Set follower as standing by
		follower.interrupt({ mode: 'standing-by', input: null })

		// Move follower to the leader
		const leaderPosition = this.getEntity().position
		const leaderPageId = this.getEntity().currentPageId
		const offset = 120
		const position = { x: leaderPosition.x + offset, y: leaderPosition.y }
		follower.position.moveTo(position)
		follower.updateEntity((f) => ({ ...f, flipX: true, currentPageId: leaderPageId }))

		// Start camera following for the drone fairy
		// This makes the canvas auto-scroll to follow the fairy's drawing
		this.fairyApp.following.startFollowing(follower.id)

		// Build the duo orchestration prompt
		const partnerName = follower.getConfig()?.name ?? 'your partner'
		const partnerId = follower.id
		const duoPrompt = `You are collaborating with your partner on a duo project. You are the leader of the duo. You have been instructed to do this project:
${instruction}.

CRITICAL CONSTRAINTS - READ CAREFULLY:
- Draw ONLY what is EXPLICITLY asked in the instruction above. Nothing more.
- Do NOT add decorative elements (no backgrounds, borders, shadows, or embellishments).
- Do NOT interpret or expand the scope beyond the literal request.
- Do NOT add "nice to have" features or improvements.
- If asked to "draw a circle", draw ONLY a circle - no colors unless specified, no fill unless specified, nothing else.
- Complete the task as LITERALLY as possible.
- When in doubt, do LESS, not more.

A project has automatically been created, but you need to start it yourself. You have been placed into duo orchestrator mode. You are working together with your partner to complete this project. Your partner is:
- name: ${partnerName} (id: ${partnerId})
You are to complete the project by orchestrating your partner. You can ONLY assign tasks to your partner - you cannot work on tasks yourself. As the leader of the duo, your responsibility is to plan the project, create tasks, and direct your partner to execute them sequentially. Make sure to give the approximate locations of the work to be done, if relevant, in order to make sure the tasks are clear and well-positioned.`

		// Send the prompt to the leader with the duo orchestration context
		const bounds = this.editor.getViewportPageBounds()
		await this.prompt({
			source: 'user',
			agentMessages: [duoPrompt],
			userMessages: [instruction],
			bounds,
		})
	}
}
