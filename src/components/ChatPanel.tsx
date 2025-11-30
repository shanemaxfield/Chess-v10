import { useState, useEffect, useRef } from 'react'
import { useGameStore } from '../store/gameStore'
import { planActions } from '../lib/actions/planActions'
import { reconcileArrows } from '../lib/actions/ArrowController'
import { reconcileHighlights } from '../lib/actions/HighlightController'
import { initializeLLMService, getLLMService } from '../lib/llmService'
import { LLM_CONFIG } from '../config/llmConfig'
import { UseStockfishReturn } from '../engine/useStockfish'
import { BoardController, PlaybackState, MoveStep } from '../lib/teaching/BoardController'
import { ResponseOrchestrator } from '../lib/teaching/ResponseOrchestrator'
import { getTeachingLLMService } from '../lib/teaching/TeachingLLMService'
import {
  Instruction,
  DemonstrationInstruction,
  PositionAnalysisInstruction,
  Variation,
} from '../lib/teaching/MoveInstructionParser'
import { VariationDisplay } from './VariationDisplay'
import { AnimationControls } from './AnimationControls'

interface Message {
  id: number
  text: string
  isUser: boolean
  followUps?: string[]
}

interface ChatPanelProps {
  engine: UseStockfishReturn
}

export default function ChatPanel({ engine }: ChatPanelProps) {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [messageIdCounter, setMessageIdCounter] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [useLLM, setUseLLM] = useState(true)

  // Teaching system state
  const [currentInstruction, setCurrentInstruction] = useState<Instruction | null>(null)
  const [selectedVariation, setSelectedVariation] = useState<Variation | null>(null)
  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    isPlaying: false,
    isPaused: false,
    currentStep: -1,
    totalSteps: 0,
    canStepForward: false,
    canStepBackward: false,
  })
  const [currentSpeed, setCurrentSpeed] = useState<'slow' | 'medium' | 'fast' | 'instant'>('medium')
  const [currentMoveSAN, setCurrentMoveSAN] = useState<string>('')

  const boardControllerRef = useRef<BoardController | null>(null)
  const orchestratorRef = useRef<ResponseOrchestrator | null>(null)

  const chess = useGameStore((state) => state.chess)
  const fen = useGameStore((state) => state.fen)
  const setFen = useGameStore((state) => state.setFen)
  const makeMove = useGameStore((state) => state.makeMove)
  const arrows = useGameStore((state) => state.arrows)
  const setArrows = useGameStore((state) => state.setArrows)
  const highlights = useGameStore((state) => state.highlights)
  const setHighlights = useGameStore((state) => state.setHighlights)

  // Initialize LLM service on mount
  useEffect(() => {
    initializeLLMService(LLM_CONFIG.OPENAI_API_KEY)
  }, [])

  // Initialize teaching controllers
  useEffect(() => {
    if (!boardControllerRef.current) {
      boardControllerRef.current = new BoardController()

      // Set up step callback
      boardControllerRef.current.onStep((step: MoveStep, state: PlaybackState) => {
        setFen(step.fen)
        setCurrentMoveSAN(step.san)
        setPlaybackState(state)
      })
    }

    if (!orchestratorRef.current) {
      orchestratorRef.current = new ResponseOrchestrator()

      // Set up LLM callback
      const llmService = getTeachingLLMService()
      orchestratorRef.current.setLLMCallback(async (query, context) => {
        const result = await llmService.generateInstruction(query, context)
        return result.explanation
      })
    }
  }, [setFen])

  const executePlan = (plan: any, fallbackResponse: string): { responseText: string, followUps?: string[] } => {
    // Execute the plan and build response
    const actions: string[] = []
    let responseText = fallbackResponse

    // 1) Apply moves (arrows and highlights are automatically cleared by makeMove)
    if (plan.moves && plan.moves.length > 0) {
      for (const move of plan.moves) {
        const piece = chess.get(move.from as any)
        const pieceName = piece ? 
          (piece.type === 'p' ? 'pawn' : 
           piece.type === 'n' ? 'knight' : 
           piece.type === 'b' ? 'bishop' : 
           piece.type === 'r' ? 'rook' : 
           piece.type === 'q' ? 'queen' : 'king') : 'piece'
        const success = makeMove(move.from as any, move.to as any, move.promotion)
        if (success) {
          actions.push(`Moved ${pieceName} from ${move.from} to ${move.to}`)
        } else {
          actions.push(`Could not move ${pieceName} from ${move.from} to ${move.to} (illegal move)`)
        }
      }
    }

    // 2) Apply arrows
    if (plan.arrows && plan.arrows.length > 0) {
      const newArrows = reconcileArrows(arrows, plan.arrows)
      setArrows(newArrows)
      plan.arrows.forEach((arrow: any) => {
        actions.push(`Drew arrow from ${arrow.from} to ${arrow.to}`)
      })
    }

    // 3) Apply highlights
    if (plan.highlights && plan.highlights.length > 0) {
      const newHighlights = reconcileHighlights(highlights, plan.highlights)
      setHighlights(newHighlights)
      plan.highlights.forEach((highlight: any) => {
        const squaresList = highlight.squares.join(', ')
        actions.push(`Highlighted square${highlight.squares.length > 1 ? 's' : ''}: ${squaresList}`)
      })
    }

    // Build complete response message
    if (actions.length > 0) {
      if (actions.length === 1) {
        responseText = `Done! ${actions[0]}.`
      } else {
        responseText = `Done! I've completed ${actions.length} actions:\n${actions.map((a, i) => `${i + 1}. ${a}`).join('\n')}`
      }
    }

    return { responseText }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isProcessing) return

    const userInput = input
    setInput('')

    // Add user message
    const userMessage: Message = {
      id: messageIdCounter,
      text: userInput,
      isUser: true,
    }
    setMessages((prev) => [...prev, userMessage])
    setMessageIdCounter((prev) => prev + 1)

    setIsProcessing(true)

    try {
      let responseText = 'No actions matched.'
      let followUps: string[] | undefined

      if (useLLM) {
        // First try teaching system for opening demonstrations and analysis
        if (orchestratorRef.current) {
          try {
            const teachingResult = await orchestratorRef.current.processQuery(userInput, fen)

            if (teachingResult.instruction) {
              // Handle teaching instruction
              responseText = teachingResult.responseText
              setCurrentInstruction(teachingResult.instruction)

              // Load demonstration or analysis
              if (teachingResult.instruction.type === 'opening_demonstration' ||
                  teachingResult.instruction.type === 'tactical_pattern') {
                const demoInstruction = teachingResult.instruction as DemonstrationInstruction
                loadDemonstration(demoInstruction)
              } else if (teachingResult.instruction.type === 'position_analysis') {
                const posInstruction = teachingResult.instruction as PositionAnalysisInstruction
                setCurrentInstruction(posInstruction)
              }
            } else {
              // Fall back to regular LLM service
              const llmService = getLLMService()
              if (llmService) {
                const result = await llmService.processMessage(userInput, chess, engine.lines)
                executePlan(result.plan, result.response)
                responseText = result.response
                followUps = result.followUps
              } else {
                responseText = 'LLM service not initialized. Using fallback parser.'
                const plan = planActions(userInput, chess)
                const executionResult = executePlan(plan, responseText)
                responseText = executionResult.responseText
              }
            }
          } catch (error) {
            console.error('Teaching system error:', error)
            // Fall back to regular LLM service
            const llmService = getLLMService()
            if (llmService) {
              const result = await llmService.processMessage(userInput, chess, engine.lines)
              executePlan(result.plan, result.response)
              responseText = result.response
              followUps = result.followUps
            }
          }
        } else {
          // Use regular LLM service
          const llmService = getLLMService()
          if (llmService) {
            const result = await llmService.processMessage(userInput, chess, engine.lines)
            executePlan(result.plan, result.response)
            responseText = result.response
            followUps = result.followUps
          }
        }
      } else {
        // Use hardcoded parser
        const plan = planActions(userInput, chess)
        const executionResult = executePlan(plan, responseText)
        responseText = executionResult.responseText
      }

      // Add assistant response
      const assistantMessage: Message = {
        id: messageIdCounter + 1,
        text: responseText,
        isUser: false,
        followUps,
      }
      setMessages((prev) => [...prev, assistantMessage])
      setMessageIdCounter((prev) => prev + 2)
    } catch (error) {
      console.error('Error processing message:', error)
      const errorMessage: Message = {
        id: messageIdCounter + 1,
        text: 'Sorry, I encountered an error processing your request.',
        isUser: false,
      }
      setMessages((prev) => [...prev, errorMessage])
      setMessageIdCounter((prev) => prev + 2)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleFollowUp = (followUpText: string) => {
    setInput(followUpText)
  }

  const handleClearChat = () => {
    setMessages([])
    setMessageIdCounter(0)
    setCurrentInstruction(null)
    setSelectedVariation(null)
    if (boardControllerRef.current) {
      boardControllerRef.current.stop()
      boardControllerRef.current.reset()
    }
  }

  // Teaching system helper functions
  const loadDemonstration = (instruction: DemonstrationInstruction) => {
    if (!boardControllerRef.current) return

    const controller = boardControllerRef.current
    const success = controller.loadMoveSequence(instruction.mainLine.moves, 'san')

    if (success) {
      controller.setAnimationConfig({
        speed: currentSpeed,
        pauseAtMove: instruction.mainLine.pauseAfterMove,
      })
      setPlaybackState(controller.getPlaybackState())
    }
  }

  const handleVariationClick = (variation: Variation) => {
    if (!boardControllerRef.current) return

    setSelectedVariation(variation)
    const controller = boardControllerRef.current
    controller.reset()

    const success = controller.loadMoveSequence(variation.moves, 'san')
    if (success) {
      controller.setAnimationConfig({ speed: currentSpeed })
      setPlaybackState(controller.getPlaybackState())
      controller.play()
    }
  }

  const handlePlay = async () => {
    if (!boardControllerRef.current) return
    await boardControllerRef.current.play()
    setPlaybackState(boardControllerRef.current.getPlaybackState())
  }

  const handlePause = () => {
    if (!boardControllerRef.current) return
    boardControllerRef.current.pause()
    setPlaybackState(boardControllerRef.current.getPlaybackState())
  }

  const handleStop = () => {
    if (!boardControllerRef.current) return
    boardControllerRef.current.stop()
    boardControllerRef.current.reset()
    setPlaybackState(boardControllerRef.current.getPlaybackState())
  }

  const handleStepForward = async () => {
    if (!boardControllerRef.current) return
    await boardControllerRef.current.stepForward()
    setPlaybackState(boardControllerRef.current.getPlaybackState())
  }

  const handleStepBackward = async () => {
    if (!boardControllerRef.current) return
    await boardControllerRef.current.stepBackward()
    setPlaybackState(boardControllerRef.current.getPlaybackState())
  }

  const handleSpeedChange = (speed: 'slow' | 'medium' | 'fast' | 'instant') => {
    setCurrentSpeed(speed)
    if (boardControllerRef.current) {
      boardControllerRef.current.setAnimationConfig({ speed })
    }
  }

  const getVariations = (): Variation[] => {
    if (!currentInstruction) return []

    if (currentInstruction.type === 'opening_demonstration' || currentInstruction.type === 'tactical_pattern') {
      return (currentInstruction as DemonstrationInstruction).continuations
    } else if (currentInstruction.type === 'position_analysis') {
      return (currentInstruction as PositionAnalysisInstruction).topMoves
    }

    return []
  }

  return (
    <div className="flex flex-col h-full panel-elegant overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-stone-200/50 dark:border-stone-700/50 bg-gradient-to-r from-amber-50/50 to-transparent dark:from-amber-950/20 dark:to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white shadow-md">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z"/>
                <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z"/>
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-stone-900 dark:text-stone-100 text-lg">
                AI Chess Assistant
              </h3>
              <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5">
                {useLLM
                  ? 'Natural language chess analysis & control'
                  : 'Command-based board interaction'
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleClearChat}
              disabled={messages.length === 0}
              className="text-xs px-3 py-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors font-medium border border-stone-300 dark:border-stone-600 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Clear chat history"
            >
              🗑️ Clear
            </button>
            <button
              onClick={() => setUseLLM(!useLLM)}
              className="text-xs px-3 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors font-medium border border-amber-200 dark:border-amber-800"
              title={useLLM ? 'Switch to hardcoded parser' : 'Switch to AI assistant'}
            >
              {useLLM ? '✨ AI' : '⚙️ Basic'}
            </button>
          </div>
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 elegant-scrollbar">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-xs">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/30 dark:to-amber-800/30 flex items-center justify-center">
                <svg className="w-8 h-8 text-amber-600 dark:text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd"/>
                </svg>
              </div>
              <p className="text-stone-600 dark:text-stone-400 text-sm leading-relaxed">
                {useLLM
                  ? "Start a conversation! Ask me to analyze positions, suggest moves, or make plays on the board."
                  : 'Enter commands to control the board and pieces.'
                }
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="space-y-2">
              <div
                className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap shadow-sm ${
                    msg.isUser
                      ? 'bg-gradient-to-br from-amber-600 to-amber-700 text-white'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 border border-stone-200 dark:border-stone-700'
                  }`}
                >
                  {msg.text}
                </div>
              </div>

              {/* Follow-up suggestions */}
              {!msg.isUser && msg.followUps && msg.followUps.length > 0 && (
                <div className="flex flex-wrap gap-2 pl-2">
                  {msg.followUps.map((followUp, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleFollowUp(followUp)}
                      disabled={isProcessing}
                      className="text-xs px-3 py-1.5 rounded-full bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-300 hover:bg-amber-50 hover:border-amber-300 dark:hover:bg-amber-900/20 dark:hover:border-amber-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {followUp}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))
        )}

        {/* Loading indicator */}
        {isProcessing && (
          <div className="flex justify-start">
            <div className="max-w-[85%] px-4 py-3 rounded-2xl text-sm bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 border border-stone-200 dark:border-stone-700">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Teaching Controls - Animation and Variations */}
      {(playbackState.totalSteps > 0 || getVariations().length > 0) && (
        <div className="border-t border-stone-200/50 dark:border-stone-700/50 p-4 space-y-3 bg-stone-50/30 dark:bg-stone-900/30">
          {/* Animation Controls */}
          {playbackState.totalSteps > 0 && (
            <AnimationControls
              playbackState={playbackState}
              onPlay={handlePlay}
              onPause={handlePause}
              onStop={handleStop}
              onStepForward={handleStepForward}
              onStepBackward={handleStepBackward}
              onSpeedChange={handleSpeedChange}
              currentSpeed={currentSpeed}
              currentMove={currentMoveSAN}
            />
          )}

          {/* Variations */}
          {getVariations().length > 0 && (
            <VariationDisplay
              variations={getVariations()}
              onVariationClick={handleVariationClick}
              selectedVariation={selectedVariation}
            />
          )}
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-stone-200/50 dark:border-stone-700/50 bg-stone-50/50 dark:bg-stone-900/50">
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={useLLM ? "Ask me anything about chess..." : "Type a command..."}
            disabled={isProcessing}
            className="flex-1 px-4 py-2.5 border border-stone-300 dark:border-stone-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-stone-400 dark:placeholder:text-stone-500 shadow-sm"
          />
          <button
            type="submit"
            disabled={!input.trim() || isProcessing}
            className="btn-primary"
          >
            {isProcessing ? '...' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  )
}
