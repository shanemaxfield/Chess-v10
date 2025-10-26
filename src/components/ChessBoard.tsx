import { useMemo } from 'react'
import { Square as SquareType } from 'chess.js'
import Square from './Square'
import { useGameStore } from '../store/gameStore'
import { useKeyboardController } from '../hooks/useKeyboardController'
import { getSquareColor } from '../lib/chessEngine'
import Piece from './Piece'

function ChessBoard() {
  const { chess, orientation, draggedPiece, fen } = useGameStore()

  useKeyboardController()

  const SQUARE_SIZE = 70

  // Generate the board squares based on orientation
  const squares = useMemo(() => {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1']

    if (orientation === 'b') {
      files.reverse()
      ranks.reverse()
    }

    const result: SquareType[] = []
    for (const rank of ranks) {
      for (const file of files) {
        result.push(`${file}${rank}` as SquareType)
      }
    }
    return result
  }, [orientation])

  // Force re-render on fen change
  useMemo(() => {
    return fen
  }, [fen])

  const getPieceAt = (square: SquareType) => {
    return chess.get(square)
  }

  const draggedPieceElement = draggedPiece && chess.get(draggedPiece.square) && (
    <div
      className="ghost-piece"
      style={{
        left: draggedPiece.x - SQUARE_SIZE / 2,
        top: draggedPiece.y - SQUARE_SIZE / 2,
        width: SQUARE_SIZE,
        height: SQUARE_SIZE,
      }}
    >
      <Piece piece={chess.get(draggedPiece.square)!} size={SQUARE_SIZE * 0.9} />
    </div>
  )

  return (
    <div className="flex flex-col items-center">
      <div
        className="grid grid-cols-8 border-4 border-gray-800 dark:border-gray-200 shadow-2xl"
        style={{ width: SQUARE_SIZE * 8, height: SQUARE_SIZE * 8 }}
      >
        {squares.map((square) => {
          const piece = getPieceAt(square) || null
          const isLight = getSquareColor(square) === 'light'

          return (
            <Square
              key={square}
              square={square}
              piece={piece}
              isLight={isLight}
              size={SQUARE_SIZE}
            />
          )
        })}
      </div>
      {draggedPieceElement}
    </div>
  )
}

export default ChessBoard
