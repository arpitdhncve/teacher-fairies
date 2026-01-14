import { createOpenRouter, OpenRouterProvider } from '@openrouter/ai-sdk-provider'
import {
	AgentAction,
	AgentModelName,
	AgentPrompt,
	DebugPart,
	FairyModelConfig,
	StreamActionsMetadata,
	Streaming,
} from '@tldraw/fairy-shared'
import { LanguageModel, ModelMessage, streamText } from 'ai'

import { INTERNAL_BASE_URL } from '../constants'
import { Environment } from '../environment'
import { buildMessages } from '../prompt/buildMessages'
import { buildSystemPrompt } from '../prompt/buildSystemPrompt'
import { closeAndParseJson } from './closeAndParseJson'
import {
	getAgentModelDefinition,
	getGenerationCostFromUsageAndMetaData,
	isAgentModelName,
} from './models'

export class AgentService {
	private readonly env: Environment
	openrouter: OpenRouterProvider

	constructor(env: Environment) {
		this.env = env
		this.openrouter = createOpenRouter({ apiKey: env.OPENROUTER_API_KEY })
	}

	getModel(modelName: AgentModelName): LanguageModel {
		const modelDefinition = getAgentModelDefinition(modelName)

		// HARD ENFORCE: only OpenRouter models allowed
		if (modelDefinition.provider !== 'openrouter') {
			throw new Error(
				`Only OpenRouter is supported in this build. Got provider="${modelDefinition.provider}" for model="${modelName}".`
			)
		}

		return this.openrouter(modelDefinition.id)
	}

	private isReviewTask(title: string | undefined): boolean {
		return title?.toLowerCase() === 'final cleanup'
	}

	private selectModel(metadata: StreamActionsMetadata | undefined): AgentModelName {
		if (!metadata) {
			return FairyModelConfig.DEFAULT_MODEL
		}

		const { fairyRole, currentTask } = metadata

		// Check if current task is a review task (by title keywords)
		if (this.isReviewTask(currentTask?.title)) {
			return FairyModelConfig.REVIEW_MODEL
		}

		// Select based on role
		switch (fairyRole) {
			case 'leader':
				return FairyModelConfig.LEADER_MODEL
			case 'follower':
				return FairyModelConfig.FOLLOWER_MODEL
			default:
				return FairyModelConfig.DEFAULT_MODEL
		}
	}

	private async handleFinish(
		modelId: AgentModelName,
		usage: any,
		providerMetadata: any,
		userStub: ReturnType<Environment['TL_USER']['get']>,
		userId: string
	): Promise<void> {
		// Skip usage recording for anonymous users
		if (userId.startsWith('anonymous-')) {
			console.log('Skipping usage recording for anonymous user:', userId)
			return
		}

		// OpenRouter / ai-sdk providerMetadata may vary; keep this safe.
		if (!providerMetadata) {
			console.warn('No provider metadata found (usage recording skipped).')
			return
		}

		const cost = getGenerationCostFromUsageAndMetaData(modelId, usage, providerMetadata)
		console.warn(`Cost for request to ${modelId}: $${cost.toFixed(3)}`)

		if (cost <= 0) return

		try {
			const recordRes = await userStub.fetch(
				`${INTERNAL_BASE_URL}/app/${userId}/fairy/record-usage`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ actualCost: cost }),
				}
			)

			if (!recordRes.ok) {
				try {
					const errorData = (await recordRes.json()) as { error: string }
					console.error('Failed to record usage:', errorData.error)
				} catch {
					console.error('Failed to parse usage recording error response')
				}
			}
		} catch (recordError) {
			console.error('Exception recording usage:', recordError)
		}
	}

	async *streamActions(
		prompt: AgentPrompt,
		metadata: StreamActionsMetadata | undefined,
		signal: AbortSignal | undefined,
		userId: string,
		userStub: ReturnType<Environment['TL_USER']['get']>
	): AsyncGenerator<Streaming<AgentAction>> {
		try {
			// Select model based on role and task from metadata
			const modelName = this.selectModel(metadata)

			console.error('[AgentService] Fairy Role:', metadata?.fairyRole ?? 'unknown')
			console.error('[AgentService] Is Review Task:', this.isReviewTask(metadata?.currentTask?.title))
			console.error('[AgentService] Model:', modelName)

			const model = this.getModel(modelName)

			if (typeof model === 'string') {
				throw new Error('Model is a string, not a LanguageModel')
			}

			const { modelId } = model
			if (!isAgentModelName(modelId)) {
				throw new Error(`Model ${modelId} is not in AGENT_MODEL_DEFINITIONS`)
			}

			// Build the messages that we'll send to the model
			const messages: ModelMessage[] = []

			// Build the system prompt
			const systemPrompt = buildSystemPrompt(prompt, { withSchema: true })
			messages.push({ role: 'system', content: systemPrompt })

			// Additional prompt messages (from parts)
			const promptMessages = buildMessages(prompt)
			messages.push(...promptMessages)

			// Debug logs
			const debugPart = prompt.debug as DebugPart | undefined
			if (debugPart) {
				if (debugPart.logSystemPrompt) {
					const promptWithoutSchema = buildSystemPrompt(prompt, { withSchema: false })
					console.warn('[DEBUG] System Prompt (without schema):\n', promptWithoutSchema)
				}
				if (debugPart.logMessages) {
					const sanitizedMessages = sanitizeMessagesForLogging(promptMessages)
					console.warn('[DEBUG] Messages:\n', JSON.stringify(sanitizedMessages, null, 2))
				}
			}

			// Force JSON start for incremental parsing
			messages.push({
				role: 'assistant',
				content: '{"actions": [{"_type":',
			})

			const result = streamText({
				model,
				messages,
				maxOutputTokens: 8192,
				temperature: 0,
				abortSignal: signal,
				onAbort() {
					console.warn('Stream actions aborted')
				},
				onError: (e) => {
					console.error('Stream text error:', e)
					throw e
				},
				onFinish: async (e) => {
					await this.handleFinish(modelId, e.usage, e.providerMetadata, userStub, userId)
				},
			})

			// OpenRouter-only: always seed with the forced JSON prefix
			let buffer = '{"actions": [{"_type":'
			let cursor = 0
			let maybeIncompleteAction: AgentAction | null = null

			let startTime = Date.now()

			for await (const text of result.textStream) {
				if (signal?.aborted) break
				buffer += text

				const partialObject = closeAndParseJson(buffer)
				if (!partialObject) continue

				const actions = partialObject.actions
				if (!Array.isArray(actions)) continue
				if (actions.length === 0) continue

				// If actions list advanced, previous action is complete
				if (actions.length > cursor) {
					const action = actions[cursor - 1] as AgentAction
					if (action) {
						yield { ...action, complete: true, time: Date.now() - startTime }
						maybeIncompleteAction = null
					}
					cursor++
				}

				// Yield current action (possibly incomplete)
				const action = actions[cursor - 1] as AgentAction
				if (action) {
					if (!maybeIncompleteAction) startTime = Date.now()
					maybeIncompleteAction = action
					yield { ...action, complete: false, time: Date.now() - startTime }
				}
			}

			// Finalize last action if needed
			if (maybeIncompleteAction) {
				yield { ...maybeIncompleteAction, complete: true, time: Date.now() - startTime }
			}

			// Await usage to ensure onFinish callback completes
			console.error('buffer', buffer)
			await result.usage
		} catch (error: any) {
			if (signal?.aborted || error?.name === 'AbortError') return
			// Log detailed error information for debugging
			console.error('=== OPENROUTER API ERROR ===')
			console.error('Error name:', error?.name)
			console.error('Error message:', error?.message)
			console.error('Error cause:', error?.cause)
			console.error('Error data:', JSON.stringify(error?.data, null, 2))
			console.error('Error response:', error?.response)
			console.error('Error status:', error?.status || error?.statusCode)
			console.error(
				'Full error object:',
				JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
			)
			console.error('=== END OPENROUTER API ERROR ===')
			throw error
		}
	}
}

/**
 * Sanitize messages for logging by replacing image content with "<image data removed>"
 */
function sanitizeMessagesForLogging(messages: any[]): any[] {
	return messages.map((message) => {
		if (!message.content || !Array.isArray(message.content)) return message

		const sanitizedContent = message.content.map((item: any) => {
			if (item.type === 'image') {
				return { ...item, image: '<image data removed>' }
			}
			return item
		})

		return { ...message, content: sanitizedContent }
	})
}
