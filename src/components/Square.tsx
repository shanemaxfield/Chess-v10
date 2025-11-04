import { memo, useMemo } from 'react'
import { Square as SquareType, Piece as ChessPiece } from 'chess.js'
import Piece from './Piece'
import { useGameStore } from '../store/gameStore'
import { usePointerDrag } from '../hooks/usePointerDrag'

interface SquareProps {
  square: SquareType
  piece: ChessPiece | null
  isLight: boolean
  size: number
  highlightColor?: string
}

const Square = memo(({ square, piece, isLight, size, highlightColor }: SquareProps) => {
  const {
    draggedPiece,
    legalMoves,
    isCheck,
    chess,
    moveHistory,
    currentPly,
  } = useGameStore()

  const { handlePointerDown } = usePointerDrag()

  const isDragged = draggedPiece?.square === square
  const isLegalMove = legalMoves.includes(square) && draggedPiece !== null

  // Check if this square is part of the last move
  const isLastMove = useMemo(() => {
    if (moveHistory.length === 0 || currentPly === 0) return false
    const lastMoveEntry = moveHistory[currentPly - 1]
    if (!lastMoveEntry) return false

    // Parse the last move to get from/to squares
    const tempChess = chess
    const history = tempChess.history({ verbose: true })
    const lastMove = history[history.length - 1]

    return lastMove && (lastMove.from === square || lastMove.to === square)
  }, [moveHistory, currentPly, square, chess])

  // Check if this square contains a king in check
  const isCheckSquare = useMemo(() => {
    if (!isCheck || !piece) return false
    return piece.type === 'k' && piece.color === chess.turn()
  }, [isCheck, piece, chess])

  const bgColor = isLight
    ? 'bg-square-light dark:bg-square-light-dark'
    : 'bg-square-dark dark:bg-square-dark-dark'

  const highlightClasses = []
  if (isLegalMove) {
    if (piece) {
      highlightClasses.push('square-highlight-legal square-highlight-legal-capture')
    } else {
      highlightClasses.push('square-highlight-legal')
    }
  }
  if (isLastMove) highlightClasses.push('square-highlight-lastmove')
  if (isCheckSquare) highlightClasses.push('square-highlight-check')

  const handlePointerDownOnSquare = (e: React.PointerEvent) => {
    // Only allow dragging pieces of the current player
    if (piece && piece.color === chess.turn()) {
      handlePointerDown(e, square)
    }
  }

  return (
    <div
      data-square={square}
      className={`relative ${bgColor} ${highlightClasses.join(' ')} cursor-pointer select-none`}
      style={{
        width: size,
        height: size,
        ...(highlightColor ? { backgroundColor: highlightColor } : {})
      }}
      onPointerDown={handlePointerDownOnSquare}
    >
      {piece && !isDragged && <Piece piece={piece} size={size * 0.9} />}

      {/* Coordinates */}
      {square[1] === '1' && (
        <div className="absolute bottom-0 right-0.5 text-xs font-semibold opacity-70">
          {square[0]}
        </div>
      )}
      {square[0] === 'a' && (
        <div className="absolute top-0.5 left-0.5 text-xs font-semibold opacity-70">
          {square[1]}
        </div>
      )}
    </div>
  )
})

Square.displayName = 'Square'

export default Square
