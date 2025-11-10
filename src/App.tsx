import { useEffect } from 'react'
import ChessBoard from './components/ChessBoard'
import TopBar from './components/TopBar'
import Controls from './components/Controls'
import MoveList from './components/MoveList'
import PromotionModal from './components/PromotionModal'
import EnginePanel from './components/EnginePanel'
import ChatPanel from './components/ChatPanel'
import { useGameStore } from './store/gameStore'
import { initializeTheme } from './lib/theme'
import { useStockfish } from './engine/useStockfish'
import { parseUciMove } from './utils/uci'

function App() {
  const isDarkMode = useGameStore((state) => state.isDarkMode)
  const chess = useGameStore((state) => state.chess)
  const fen = useGameStore((state) => state.fen)
  const makeMove = useGameStore((state) => state.makeMove)

  // Initialize Stockfish engine
  const engine = useStockfish(chess)

  useEffect(() => {
    initializeTheme()
  }, [])

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDarkMode])

  // Update engine position when FEN changes
  useEffect(() => {
    if (engine.ready && fen) {
      engine.setPosition(fen)
    }
  }, [fen, engine.ready])

  // Handle "Use Best Move" button
  const handleUseBestMove = () => {
    if (!engine.bestMove) return

    const move = parseUciMove(engine.bestMove)
    if (move) {
      const success = makeMove(move.from as any, move.to as any, move.promotion as any)
      if (success) {
        // Analysis will automatically restart via the fen useEffect above
      }
    }
  }

  const isWhiteToMove = chess.turn() === 'w'
  const setPreviewArrow = useGameStore((state) => state.setPreviewArrow)
  const clearPreviewArrow = useGameStore((state) => state.clearPreviewArrow)

  // Handle PV preview - show arrow for the first move of the PV line
  const handlePreviewPv = (movesUci: string[]) => {
    console.log('[APP] handlePreviewPv called with moves:', movesUci)
    if (movesUci.length === 0) {
      clearPreviewArrow()
      return
    }

    // Extract the first move from the PV line
    const firstMove = movesUci[0]
    console.log('[APP] First move:', firstMove)
    if (firstMove && firstMove.length >= 4) {
      const from = firstMove.substring(0, 2) as any
      const to = firstMove.substring(2, 4) as any
      console.log('[APP] Setting preview arrow from', from, 'to', to)
      setPreviewArrow(from, to)
    } else {
      console.log('[APP] Invalid move format:', firstMove)
    }
  }

  const handleClearPreview = () => {
    clearPreviewArrow()
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-stone-50 via-amber-50/30 to-stone-100 dark:from-stone-950 dark:via-stone-900 dark:to-stone-950">
      <TopBar />
      <main className="flex-1 flex flex-col lg:flex-row gap-8 p-6 lg:p-8 mx-auto w-full max-w-[1800px]">
        {/* Main content area - Board and Chat take center stage */}
        <div className="flex-1 flex flex-col lg:flex-row gap-8 items-start">
          {/* Chess Board - Primary focus */}
          <div className="flex flex-col items-center gap-5 lg:flex-1">
            <ChessBoard />
            <Controls />
          </div>

          {/* Chat Panel - Secondary focus, prominent placement */}
          <div className="lg:w-[420px] flex flex-col">
            <div className="h-[600px]">
              <ChatPanel engine={engine} />
            </div>
          </div>
        </div>

        {/* Utility panels - Accessible but understated */}
        <aside className="lg:w-80 xl:w-96 flex flex-col gap-6">
          {/* Move List - Compact */}
          <div className="max-h-64">
            <MoveList />
          </div>

          {/* Engine Panel - Below fold */}
          <div className="flex-1">
            <EnginePanel
              engine={engine}
              isWhiteToMove={isWhiteToMove}
              onUseBestMove={handleUseBestMove}
              onPreviewPv={handlePreviewPv}
              onClearPreview={handleClearPreview}
            />
          </div>
        </aside>
      </main>
      <PromotionModal />
    </div>
  )
}

export default App
