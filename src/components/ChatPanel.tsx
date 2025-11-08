import { useState, useEffect } from 'react'
import { useGameStore } from '../store/gameStore'
import { planActions } from '../lib/actions/planActions'
import { reconcileArrows } from '../lib/actions/ArrowController'
import { reconcileHighlights } from '../lib/actions/HighlightController'
import { initializeLLMService, getLLMService } from '../lib/llmService'
import { LLM_CONFIG } from '../config/llmConfig'

interface Message {
  id: number
  text: string
  isUser: boolean
  followUps?: string[]
}

export default function ChatPanel() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [messageIdCounter, setMessageIdCounter] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [useLLM, setUseLLM] = useState(true)

  const chess = useGameStore((state) => state.chess)
  const makeMove = useGameStore((state) => state.makeMove)
  const arrows = useGameStore((state) => state.arrows)
  const setArrows = useGameStore((state) => state.setArrows)
  const highlights = useGameStore((state) => state.highlights)
  const setHighlights = useGameStore((state) => state.setHighlights)

  // Initialize LLM service on mount
  useEffect(() => {
    initializeLLMService(LLM_CONFIG.OPENAI_API_KEY)
  }, [])

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
        // Use LLM service
        const llmService = getLLMService()
        if (llmService) {
          const result = await llmService.processMessage(userInput, chess)
          executePlan(result.plan, result.response)
          responseText = result.response
          followUps = result.followUps
        } else {
          responseText = 'LLM service not initialized. Using fallback parser.'
          const plan = planActions(userInput, chess)
          const executionResult = executePlan(plan, responseText)
          responseText = executionResult.responseText
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

  return (
    <div className="flex flex-col h-full border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-white dark:bg-gray-800">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              Chess AI Assistant {useLLM && '🤖'}
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {useLLM
                ? 'Ask me anything about chess! I can move pieces, suggest moves, and explain positions.'
                : 'Try: "e4", "arrow from b6 to c2", "highlight f7 and h7"'
              }
            </p>
          </div>
          <button
            onClick={() => setUseLLM(!useLLM)}
            className="text-xs px-2 py-1 rounded bg-blue-500 text-white hover:bg-blue-600 transition-colors"
            title={useLLM ? 'Switch to hardcoded parser' : 'Switch to AI assistant'}
          >
            {useLLM ? 'AI' : 'Basic'}
          </button>
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 text-sm py-8">
            {useLLM
              ? "👋 Hi! I'm your chess AI assistant. Try asking me to make a move, suggest the best move, or explain a position!"
              : 'Send a message to trigger board actions'
            }
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="space-y-2">
              <div
                className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-lg text-sm whitespace-pre-wrap ${
                    msg.isUser
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
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
                      className="text-xs px-2 py-1 rounded-full border border-blue-500 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
            <div className="max-w-[80%] px-3 py-2 rounded-lg text-sm bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-300 dark:border-gray-600">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={useLLM ? "Ask me anything about chess..." : "Type a command..."}
            disabled={isProcessing}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!input.trim() || isProcessing}
            className="px-4 py-2 bg-blue-500 text-white rounded-md text-sm font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isProcessing ? 'Processing...' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  )
}
