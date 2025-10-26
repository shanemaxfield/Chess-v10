import { useEffect, useCallback } from 'react'
import { Square } from 'chess.js'
import { useGameStore } from '../store/gameStore'
import { coordsToSquare, squareToCoords } from '../lib/chessEngine'

export function useKeyboardController() {
  const {
    chess,
    focusCursorSquare,
    selectedSquare,
    legalMoves,
    orientation,
    pendingPromotion,
    setFocusCursor,
    selectSquare,
    makeMove,
    cancelPromotion,
  } = useGameStore()

  const moveCursor = useCallback(
    (direction: 'up' | 'down' | 'left' | 'right') => {
      if (!focusCursorSquare) return

      const { file, rank } = squareToCoords(focusCursorSquare)
      let newFile = file
      let newRank = rank

      // Adjust for board orientation
      const isFlipped = orientation === 'b'

      switch (direction) {
        case 'up':
          newRank = isFlipped ? rank - 1 : rank + 1
          break
        case 'down':
          newRank = isFlipped ? rank + 1 : rank - 1
          break
        case 'left':
          newFile = isFlipped ? file + 1 : file - 1
          break
        case 'right':
          newFile = isFlipped ? file - 1 : file + 1
          break
      }

      // Clamp to board edges
      newFile = Math.max(0, Math.min(7, newFile))
      newRank = Math.max(0, Math.min(7, newRank))

      const newSquare = coordsToSquare(newFile, newRank)
      if (newSquare) {
        setFocusCursor(newSquare)
      }
    },
    [focusCursorSquare, orientation, setFocusCursor]
  )

  const handleEnterSpace = useCallback(() => {
    if (!focusCursorSquare) return

    // If we have a selection, try to make a move
    if (selectedSquare) {
      if (legalMoves.includes(focusCursorSquare)) {
        makeMove(selectedSquare, focusCursorSquare)
      } else {
        // Cancel selection if clicking on invalid square
        selectSquare(null)
      }
    } else {
      // No selection, try to select the piece at cursor
      const piece = chess.get(focusCursorSquare)
      if (piece && piece.color === chess.turn()) {
        selectSquare(focusCursorSquare)
      }
    }
  }, [focusCursorSquare, selectedSquare, legalMoves, chess, makeMove, selectSquare])

  const handleEscape = useCallback(() => {
    if (pendingPromotion) {
      cancelPromotion()
    } else {
      selectSquare(null)
    }
  }, [pendingPromotion, cancelPromotion, selectSquare])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't interfere if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault()
          moveCursor('up')
          break
        case 'ArrowDown':
          e.preventDefault()
          moveCursor('down')
          break
        case 'ArrowLeft':
          e.preventDefault()
          moveCursor('left')
          break
        case 'ArrowRight':
          e.preventDefault()
          moveCursor('right')
          break
        case 'Enter':
        case ' ':
          e.preventDefault()
          handleEnterSpace()
          break
        case 'Escape':
          e.preventDefault()
          handleEscape()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [moveCursor, handleEnterSpace, handleEscape])

  // Update cursor to current turn's king at game start
  useEffect(() => {
    const turn = chess.turn()
    const board = chess.board()
    let kingSquare: Square | null = null

    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const piece = board[rank][file]
        if (piece && piece.type === 'k' && piece.color === turn) {
          kingSquare = coordsToSquare(file, 7 - rank)
          break
        }
      }
      if (kingSquare) break
    }

    if (kingSquare && !focusCursorSquare) {
      setFocusCursor(kingSquare)
    }
  }, [chess, focusCursorSquare, setFocusCursor])
}
