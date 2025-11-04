import { useEffect } from 'react'
import ChessBoard from './components/ChessBoard'
import TopBar from './components/TopBar'
import Controls from './components/Controls'
import MoveList from './components/MoveList'
import PromotionModal from './components/PromotionModal'
import EnginePanel from './components/EnginePanel'
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
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <main className="flex-1 flex flex-col xl:flex-row gap-6 p-4 mx-auto w-full" style={{ maxWidth: '1600px' }}>
        <div className="flex-1 flex flex-col items-center">
          <ChessBoard />
          <Controls />
        </div>
        <aside className="lg:w-80 flex flex-col gap-6">
          <MoveList />
        </aside>
        <aside className="lg:w-96 flex flex-col">
          <EnginePanel
            engine={engine}
            isWhiteToMove={isWhiteToMove}
            onUseBestMove={handleUseBestMove}
            onPreviewPv={handlePreviewPv}
            onClearPreview={handleClearPreview}
          />
        </aside>
      </main>
      <PromotionModal />
    </div>
  )
}

export default App
