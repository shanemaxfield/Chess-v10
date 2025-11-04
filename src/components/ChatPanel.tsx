import { useState } from 'react'
import { useGameStore } from '../store/gameStore'
import { planActions } from '../lib/actions/planActions'
import { reconcileArrows } from '../lib/actions/ArrowController'
import { reconcileHighlights } from '../lib/actions/HighlightController'

interface Message {
  id: number
  text: string
  isUser: boolean
}

export default function ChatPanel() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [messageIdCounter, setMessageIdCounter] = useState(0)

  const makeMove = useGameStore((state) => state.makeMove)
  const arrows = useGameStore((state) => state.arrows)
  const setArrows = useGameStore((state) => state.setArrows)
  const highlights = useGameStore((state) => state.highlights)
  const setHighlights = useGameStore((state) => state.setHighlights)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    // Add user message
    const userMessage: Message = {
      id: messageIdCounter,
      text: input,
      isUser: true,
    }
    setMessages((prev) => [...prev, userMessage])
    setMessageIdCounter((prev) => prev + 1)

    // Plan actions based on input
    const plan = planActions(input)

    // Execute the plan
    let responseText = 'No actions matched.'

    // 1) Apply moves
    if (plan.moves && plan.moves.length > 0) {
      for (const move of plan.moves) {
        const success = makeMove(move.from as any, move.to as any, move.promotion)
        if (success) {
          responseText = `Executed move: ${move.from} → ${move.to}`
        } else {
          responseText = `Failed to execute move: ${move.from} → ${move.to}`
        }
      }
    }

    // 2) Apply arrows
    if (plan.arrows && plan.arrows.length > 0) {
      const newArrows = reconcileArrows(arrows, plan.arrows)
      setArrows(newArrows)
      responseText = `Added ${plan.arrows.length} arrow(s)`
    }

    // 3) Apply highlights
    if (plan.highlights && plan.highlights.length > 0) {
      const newHighlights = reconcileHighlights(highlights, plan.highlights)
      setHighlights(newHighlights)
      responseText = `Highlighted ${plan.highlights.reduce((acc, h) => acc + h.squares.length, 0)} square(s)`
    }

    // Add assistant response
    const assistantMessage: Message = {
      id: messageIdCounter + 1,
      text: responseText,
      isUser: false,
    }
    setMessages((prev) => [...prev, assistantMessage])
    setMessageIdCounter((prev) => prev + 2)

    // Clear input
    setInput('')
  }

  return (
    <div className="flex flex-col h-full border-4 border-red-500 rounded-lg overflow-hidden bg-white dark:bg-gray-800" style={{ minHeight: '300px' }}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-300 dark:border-gray-600 bg-blue-500">
        <h3 className="font-bold text-white text-xl">🤖 CHAT ACTIONS PANEL - YOU SHOULD SEE THIS!</h3>
        <p className="text-sm text-white mt-1 font-semibold">
          Try: "move e2 to e4", "arrow b1 to c3", "highlight f7 and h7"
        </p>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 text-sm py-8">
            Send a message to trigger board actions
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                  msg.isUser
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-300 dark:border-gray-600">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a command..."
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-md text-sm font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  )
}
