import { AgentRequest, FairyModeDefinition, FairyTask } from '@tldraw/fairy-shared'
import { Box } from 'tldraw'
import { FairyAgent } from './FairyAgent'

function startPromptTimer(agent: FairyAgent): void {
	const debugFlags = agent.$debugFlags.get()
	if (debugFlags.logResponseTime && agent.promptStartTime === null) {
		agent.promptStartTime = performance.now()
	}
}

function stopPromptTimer(agent: FairyAgent): void {
	if (agent.promptStartTime !== null) {
		const endTime = performance.now()
		const duration = (endTime - agent.promptStartTime) / 1000
		const fairyName = agent.getConfig().name
		// eslint-disable-next-line no-console
		console.log(`🧚 Fairy "${fairyName}" prompt completed in ${duration.toFixed(2)}s`)
		agent.promptStartTime = null
	}
}

export interface FairyModeNode {
	onEnter?(agent: FairyAgent, fromMode: FairyModeDefinition['type']): void
	onExit?(agent: FairyAgent, toMode: FairyModeDefinition['type']): void
	onPromptStart?(agent: FairyAgent, request: AgentRequest): void
	onPromptEnd?(agent: FairyAgent, request: AgentRequest): void
	onPromptCancel?(agent: FairyAgent, request: AgentRequest): void
}

export const FAIRY_MODE_CHART: Record<FairyModeDefinition['type'], FairyModeNode> = {
	idling: {
		onPromptStart(agent) {
			startPromptTimer(agent)

			// Check one-shot mode flag and set mode accordingly
			const oneShotMode = agent.$useOneShottingMode.get()
			if (oneShotMode) {
				agent.mode.setMode('one-shotting')
			} else {
				agent.mode.setMode('soloing')
			}
		},
		onEnter(agent, fromMode) {
			// If waking up from sleeping, move to a spawn point near the viewport center
			if (fromMode === 'sleeping') {
				agent.position.moveToSpawnPoint()
			}
			agent.waits.reset()
			agent.todos.reset()
			agent.userAction.clearHistory()
			stopPromptTimer(agent)
		},
	},
	['sleeping']: {
		onEnter(agent) {
			stopPromptTimer(agent)
		},
	},
	['one-shotting']: {
		onEnter(agent, fromMode) {
			// When entering one-shotting mode from idling, clear created shapes tracking
			// This handles the case where a user prompt starts while in idling mode,
			// which transitions to one-shotting before one-shotting.onPromptStart is called
			if (fromMode === 'idling') {
				agent.lints.clearCreatedShapes()
			}
		},
		onPromptStart(agent, request) {
			// one-shotting fairies get lints on shapes created over the course of the prompt, new user prompts reset this
			// This handles cases where a prompt starts while already in one-shotting mode (e.g., continuation, interrupt)
			if (request.source === 'user') {
				agent.lints.clearCreatedShapes()
			}
		},
		onPromptEnd(agent) {
			const todoList = agent.todos.getTodos()
			const incompleteTodoItems = todoList.filter((item) => item.status !== 'done')
			if (incompleteTodoItems.length > 0) {
				agent.schedule(
					"Continue until all your todo items are marked as done. If you've completed the work, feel free to mark them as done, otherwise keep going."
				)
				return
			}

			if (agent.lints.hasUnsurfacedLints(agent.lints.getCreatedShapes())) {
				agent.schedule({
					agentMessages: [
						'The automated linter has detected potential visual problems in the canvas. Decide if they need to be addressed.', // these will show up in CanvasLintsPartUtil, where they will be makred as surfaced
					],
				})
				return
			}

			agent.mode.setMode('idling')
		},
		onPromptCancel(agent) {
			agent.mode.setMode('one-shotting-pausing')
		},
		onExit(agent, toMode) {
			if (toMode !== 'one-shotting-pausing') {
				agent.userAction.clearHistory()
				agent.todos.reset()
			}
		},
	},
	['one-shotting-pausing']: {
		onPromptStart(agent) {
			agent.mode.setMode('one-shotting')
		},
		onEnter(agent) {
			stopPromptTimer(agent)
		},
	},
	soloing: {
		onPromptEnd(agent) {
			// Continue if there are outstanding tasks
			const myTasks = agent.fairyApp.tasks
				.getTasks()
				.filter((task: FairyTask) => task.assignedTo === agent.id)
			const incompleteTasks = myTasks.filter((task: FairyTask) => task.status !== 'done')
			if (incompleteTasks.length > 0) {
				agent.schedule('Continue until all tasks are marked as complete.')
			} else {
				agent.mode.setMode('idling')
			}
		},
		onPromptCancel(agent) {
			agent.mode.setMode('idling')
		},
	},
	['standing-by']: {
		onEnter(agent) {
			stopPromptTimer(agent)
		},
	},
	['working-drone']: {
		onEnter(agent) {
			agent.userAction.clearHistory()
			agent.todos.reset()
		},
		onExit(agent) {
			agent.userAction.clearHistory()
			agent.todos.reset()
		},
		onPromptEnd(agent, request) {
			// Keep going until the task is complete
			agent.schedule({
				agentMessages: ['Continue until the task is marked as done.'],
				bounds: request.bounds,
			})
		},
		onPromptCancel() {
			throw new Error('Cannot cancel a fairy mid-project. Clear the project first.')
		},
	},
	['working-solo']: {
		onEnter(agent) {
			agent.userAction.clearHistory()
			agent.todos.flush()
		},
		onExit(agent) {
			// Wipe todo list after finishing a task
			agent.userAction.clearHistory()
			agent.todos.flush()
		},
		onPromptEnd(agent, request) {
			// Keep going until the task is complete
			agent.schedule({
				agentMessages: ['Continue until the task is marked as done.'],
				bounds: request.bounds,
			})
		},
		onPromptCancel(agent) {
			agent.mode.setMode('idling')
		},
	},
	['orchestrating-active']: {
		onPromptEnd(agent) {
			const project = agent.getProject()
			if (!project) {
				agent.mode.setMode('idling')
				return
			}

			if (agent.waits.isWaiting()) {
				const members = project.members.filter((member) => member.id !== agent.id)
				const memberAgents = agent.fairyApp.agents
					.getAgents()
					.filter((a: FairyAgent) => members.some((member) => member.id === a.id))
				const activeMemberAgents = memberAgents.filter((a: FairyAgent) => a.requests.isGenerating())

				// If there are no active members, we need to deploy someone again probably!
				if (activeMemberAgents.length === 0) {
					agent.schedule(
						'No one is currently working on tasks. Consider deploying someone again, or end the project if all tasks are complete.'
					)
					return
				}

				// Wait for all other members to finish their tasks
				agent.mode.setMode('orchestrating-waiting')
				return
			}

			if (agent.waits.getWaitingFor().length === 0) {
				const projectTasks = agent.fairyApp.tasks.getTasksByProjectId(project.id)
				const outstandingTasks = projectTasks.filter((task) => task.status !== 'done')
				const completedTasks = projectTasks.filter((task) => task.status === 'done')
				if (outstandingTasks.length > 0) {
					agent.schedule(
						'There are still outstanding tasks. Continue until all tasks are marked as done and the project is ended.'
					)
					return
				}

				if (projectTasks.length === 0) {
					agent.schedule(
						'There are no tasks created for the project yet. Consider creating tasks and directing a project member to start a task.'
					)
					return
				}

				if (completedTasks.length === projectTasks.length) {
					agent.schedule('All tasks have been completed. You may end the project.')
					return
				}
			}
		},
		onPromptCancel() {
			throw new Error('Cannot cancel a fairy mid-project. Clear the project first.')
		},
	},
	['orchestrating-waiting']: {
		onPromptStart(agent) {
			agent.mode.setMode('orchestrating-active')
		},
		onEnter(agent) {
			stopPromptTimer(agent)
		},
	},
	['duo-orchestrating-active']: {
		onPromptEnd(agent) {
			const project = agent.getProject()
			if (!project) {
				agent.mode.setMode('idling')
				return
			}

			// Check if we have planned tasks to distribute
			const plannedTasks = project.plannedTasks ?? []
			const currentIndex = project.currentPlanIndex ?? 0

			// BATCH DISTRIBUTION: Create and assign undistributed tasks
			// This handles both initial batch (currentIndex === 0) and additional tasks added later
			if (plannedTasks.length > 0 && currentIndex < plannedTasks.length) {
				const partner = project.members.find((m) => m.id !== agent.id)

				if (partner) {
					const partnerAgent = agent.fairyApp.agents
						.getAgents()
						.find((a: FairyAgent) => a.id === partner.id)

					if (partnerAgent) {
						// Create only the NEW undistributed tasks (from currentIndex onwards)
						const createdTaskIds: any[] = []
						const undistributedTasks = plannedTasks.slice(currentIndex)
						undistributedTasks.forEach((plannedTask, localIndex) => {
							// Use the tempId from the planned task so await-duo-tasks-completion works correctly
							const taskId = plannedTask.tempId as any
							agent.fairyApp.tasks.createTask({
								id: taskId,
								title: plannedTask.title,
								text: plannedTask.text,
								assignedTo: partner.id,
								projectId: project.id,
								status: 'todo',
								pageId: agent.editor.getCurrentPageId(),
								x: plannedTask.x,
								y: plannedTask.y,
								w: plannedTask.w,
								h: plannedTask.h,
							})
							createdTaskIds.push(taskId)
						})

						// Assign all tasks but only mark first BATCH_SIZE as in-progress
						const BATCH_SIZE = 3
						const allAgents = agent.fairyApp.agents.getAgents()
						createdTaskIds.forEach((taskId, index) => {
							agent.fairyApp.tasks.assignFairyToTask(taskId, partner.id, allAgents)
							// Only first BATCH_SIZE tasks are in-progress, rest stay as todo
							if (index < BATCH_SIZE) {
								agent.fairyApp.tasks.setTaskStatus(taskId, 'in-progress')
							}
						})

						// Update index to mark all tasks as distributed
						agent.fairyApp.projects.updateProject(project.id, {
							currentPlanIndex: plannedTasks.length,
						})

						console.log(
							`[DuoOrchestrating] Distributing ${undistributedTasks.length} new task(s) to follower (${currentIndex} already distributed)`
						)

						// Build task list description for follower (only NEW tasks)
						const taskDescriptions = undistributedTasks
							.map((task) => `- ${task.title}${task.text ? `: ${task.text}` : ''}`)
							.join('\n')

						const leaderFirstName = agent.getConfig().name?.split(' ')[0] ?? ''

						// Interrupt follower with NEW tasks
						const initialBatchSize = Math.min(BATCH_SIZE, undistributedTasks.length)
						const partnerInput: Partial<AgentRequest> = {
							agentMessages: [
								`You have been assigned ${undistributedTasks.length} ${undistributedTasks.length === 1 ? 'task' : 'tasks'} total. Work on them in batches of ${BATCH_SIZE}. Start with the first ${initialBatchSize} task(s) that are marked in-progress:\n\n${taskDescriptions}`,
							],
							userMessages: [
								`Asked by ${leaderFirstName} to complete ${undistributedTasks.length} task${undistributedTasks.length > 1 ? 's' : ''}`,
							],
							source: 'other-agent',
						}

						// Use the first undistributed task's position as starting point
						if (undistributedTasks[0]) {
							partnerInput.bounds = {
								x: undistributedTasks[0].x,
								y: undistributedTasks[0].y,
								w: undistributedTasks[0].w,
								h: undistributedTasks[0].h,
							}
							partnerAgent.position.moveTo(Box.From(partnerInput.bounds).center)
						}

						partnerAgent.interrupt({ mode: 'working-drone', input: partnerInput })

						// Enter waiting mode to wait for the partner to complete ALL tasks
						agent.mode.setMode('duo-orchestrating-waiting')
					}
					return
				}
			}

			// If we have planned tasks and all have been distributed, check completion
			if (plannedTasks.length > 0 && currentIndex >= plannedTasks.length) {
				const projectTasks = agent.fairyApp.tasks.getTasksByProjectId(project.id)
				const incompleteTasks = projectTasks.filter((task: FairyTask) => task.status !== 'done')

				if (incompleteTasks.length === 0) {
					agent.schedule(
						'All current tasks have been completed. Review if more work is needed: create next batch of tasks (max 3), or call end-duo-project if complete.'
					)
					return
				}
			}

			// Original logic for waiting on partner
			if (agent.waits.isWaiting()) {
				const partner = project.members.find((member) => member.id !== agent.id)
				if (!partner) {
					agent.mode.setMode('idling')
					return
				}

				const partnerAgent = agent.fairyApp.agents
					.getAgents()
					.find((a: FairyAgent) => a.id === partner.id)
				if (!partnerAgent) {
					agent.mode.setMode('idling')
					return
				}

				// If partner is not active, we might need to deploy them again or continue ourselves
				if (!partnerAgent.requests.isGenerating()) {
					agent.schedule(
						'Your partner is not currently working on tasks. Consider directing them to start a task, starting a task yourself, or ending the project if all tasks are complete.'
					)
					return
				}

				// Wait for partner to finish their tasks
				agent.mode.setMode('duo-orchestrating-waiting')
				return
			}

			if (agent.waits.getWaitingFor().length === 0) {
				const projectTasks = agent.fairyApp.tasks.getTasksByProjectId(project.id)
				const outstandingTasks = projectTasks.filter((task) => task.status !== 'done')
				const completedTasks = projectTasks.filter((task) => task.status === 'done')
				if (outstandingTasks.length > 0) {
					agent.schedule(
						'There are still outstanding tasks. Continue until all tasks are marked as done and the project is ended.'
					)
					return
				}

				if (projectTasks.length === 0 && plannedTasks.length === 0) {
					agent.schedule(
						'There are no tasks created for the project yet. Consider creating tasks and directing your partner to start a task.'
					)
					return
				}

				if (completedTasks.length === projectTasks.length && projectTasks.length > 0) {
					agent.schedule(
						'All current tasks have been completed. Review if more work is needed: create next batch of tasks (max 3), or call end-duo-project if complete.'
					)
					return
				}
			}
		},
		onPromptCancel() {
			throw new Error('Cannot cancel a fairy mid-project. Clear the project first.')
		},
	},
	['duo-orchestrating-waiting']: {
		onPromptStart(agent) {
			agent.mode.setMode('duo-orchestrating-active')
		},
		onEnter(agent) {
			stopPromptTimer(agent)
		},
	},
	['working-orchestrator']: {
		onEnter(agent) {
			agent.userAction.clearHistory()
			agent.todos.reset()
		},
		onExit(agent) {
			agent.userAction.clearHistory()
			agent.todos.reset()
		},
		onPromptEnd(agent, request) {
			// Keep going until the task is complete
			agent.schedule({
				agentMessages: [
					"If you've finished the task, mark it as done. Otherwise, continue until the task finished.",
				],
				bounds: request.bounds,
			})
		},
		onPromptCancel() {
			throw new Error('Cannot cancel a fairy mid-project. Clear the project first.')
		},
	},
}
