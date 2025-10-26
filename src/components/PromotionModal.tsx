import { useState, useEffect } from 'react'
import { PieceSymbol } from 'chess.js'
import { useGameStore } from '../store/gameStore'
import PieceSVG from './PieceSVG'

function PromotionModal() {
  const { pendingPromotion, chess, confirmPromotion, cancelPromotion } = useGameStore()
  const [selectedPiece, setSelectedPiece] = useState<PieceSymbol>('q')

  const isOpen = pendingPromotion !== null

  useEffect(() => {
    if (isOpen) {
      setSelectedPiece('q')
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const pieces: PieceSymbol[] = ['q', 'r', 'b', 'n']

      switch (e.key) {
        case 'ArrowLeft': {
          e.preventDefault()
          const currentIndex = pieces.indexOf(selectedPiece)
          const newIndex = currentIndex > 0 ? currentIndex - 1 : pieces.length - 1
          setSelectedPiece(pieces[newIndex])
          break
        }
        case 'ArrowRight': {
          e.preventDefault()
          const currentIndex = pieces.indexOf(selectedPiece)
          const newIndex = currentIndex < pieces.length - 1 ? currentIndex + 1 : 0
          setSelectedPiece(pieces[newIndex])
          break
        }
        case 'Enter':
          e.preventDefault()
          confirmPromotion(selectedPiece)
          break
        case 'Escape':
          e.preventDefault()
          cancelPromotion()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, selectedPiece, confirmPromotion, cancelPromotion])

  if (!isOpen) return null

  const turn = chess.turn()
  const pieces: Array<{ type: PieceSymbol; name: string }> = [
    { type: 'q', name: 'Queen' },
    { type: 'r', name: 'Rook' },
    { type: 'b', name: 'Bishop' },
    { type: 'n', name: 'Knight' },
  ]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold mb-4 text-center">Promote Pawn</h2>
        <p className="text-center mb-6 text-gray-600 dark:text-gray-400">
          Choose a piece to promote to:
        </p>

        <div className="grid grid-cols-4 gap-4 mb-6">
          {pieces.map((piece) => (
            <button
              key={piece.type}
              onClick={() => confirmPromotion(piece.type)}
              onMouseEnter={() => setSelectedPiece(piece.type)}
              className={`p-4 rounded-lg transition-all ${
                selectedPiece === piece.type
                  ? 'bg-blue-500 dark:bg-blue-600 ring-4 ring-blue-300 scale-105'
                  : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <div className="flex flex-col items-center gap-2">
                <PieceSVG piece={`${turn}${piece.type.toUpperCase()}`} size={60} />
                <span className="text-xs font-medium">{piece.name}</span>
              </div>
            </button>
          ))}
        </div>

        <div className="text-center text-sm text-gray-600 dark:text-gray-400">
          <p>Use <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded">Arrow Keys</kbd> to navigate</p>
          <p className="mt-1"><kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded">Enter</kbd> to confirm, <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded">Esc</kbd> to cancel</p>
        </div>

        <button
          onClick={cancelPromotion}
          className="mt-4 w-full px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

export default PromotionModal
