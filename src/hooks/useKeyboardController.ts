import { useEffect } from 'react'
import { useGameStore } from '../store/gameStore'

export function useKeyboardController() {
  const {
    pendingPromotion,
    cancelPromotion,
    undoMove,
    redoMove,
    currentPly,
    moveHistory,
  } = useGameStore()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't interfere if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          // Go back in move history (undo move)
          if (currentPly > 0) {
            undoMove()
          }
          break
        case 'ArrowRight':
          e.preventDefault()
          // Go forward in move history (redo move)
          if (currentPly < moveHistory.length) {
            redoMove()
          }
          break
        case 'Escape':
          e.preventDefault()
          // Only handle escape for promotion cancellation
          if (pendingPromotion) {
            cancelPromotion()
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undoMove, redoMove, currentPly, moveHistory, pendingPromotion, cancelPromotion])
}
