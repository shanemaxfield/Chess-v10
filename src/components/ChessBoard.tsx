import { useMemo } from 'react'
import { Square as SquareType } from 'chess.js'
import Square from './Square'
import { useGameStore } from '../store/gameStore'
import { useKeyboardController } from '../hooks/useKeyboardController'
import { getSquareColor, squareToCoords } from '../lib/chessEngine'
import Piece from './Piece'

function ChessBoard() {
  const { chess, orientation, draggedPiece, fen, previewArrow } = useGameStore()

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

  // Calculate arrow coordinates for preview move
  const arrowElement = useMemo(() => {
    console.log('[CHESSBOARD] previewArrow:', previewArrow)
    if (!previewArrow) {
      console.log('[CHESSBOARD] No preview arrow')
      return null
    }

    const { from, to } = previewArrow
    console.log('[CHESSBOARD] Rendering arrow from', from, 'to', to)
    const fromCoords = squareToCoords(from)
    const toCoords = squareToCoords(to)

    // Calculate pixel positions based on file and rank
    // File: a=0, b=1, ..., h=7
    // Rank: 1=7, 2=6, ..., 8=0 (bottom to top)
    const fromFile = fromCoords.file
    const fromRank = 7 - fromCoords.rank // Flip rank (rank 1 is at bottom, rank 8 at top)
    const toFile = toCoords.file
    const toRank = 7 - toCoords.rank

    // Adjust for board orientation
    const isFlipped = orientation === 'b'
    const adjustedFromFile = isFlipped ? 7 - fromFile : fromFile
    const adjustedFromRank = isFlipped ? 7 - fromRank : fromRank
    const adjustedToFile = isFlipped ? 7 - toFile : toFile
    const adjustedToRank = isFlipped ? 7 - toRank : toRank

    // Calculate pixel positions (center of squares)
    const fromX = adjustedFromFile * SQUARE_SIZE + SQUARE_SIZE / 2
    const fromY = adjustedFromRank * SQUARE_SIZE + SQUARE_SIZE / 2
    const toX = adjustedToFile * SQUARE_SIZE + SQUARE_SIZE / 2
    const toY = adjustedToRank * SQUARE_SIZE + SQUARE_SIZE / 2
    
    console.log('[CHESSBOARD] Arrow coords:', {
      from, to,
      fromCoords, toCoords,
      adjustedFromFile, adjustedFromRank,
      adjustedToFile, adjustedToRank,
      fromX, fromY, toX, toY,
      isFlipped
    })

    // Calculate arrow direction
    const dx = toX - fromX
    const dy = toY - fromY
    const angle = Math.atan2(dy, dx)

    // Adjust line end to stop before reaching the square center (for better visual)
    const arrowHeadOffset = SQUARE_SIZE * 0.15
    const lineEndX = toX - arrowHeadOffset * Math.cos(angle)
    const lineEndY = toY - arrowHeadOffset * Math.sin(angle)

    return (
      <svg
        className="absolute pointer-events-none z-10"
        style={{
          width: SQUARE_SIZE * 8,
          height: SQUARE_SIZE * 8,
          top: 0,
          left: 0,
          zIndex: 10,
        }}
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3, 0 6"
              fill="#3b82f6"
              className="dark:fill-blue-400"
            />
          </marker>
        </defs>
        <line
          x1={fromX}
          y1={fromY}
          x2={lineEndX}
          y2={lineEndY}
          stroke="#3b82f6"
          strokeWidth="6"
          strokeLinecap="round"
          markerEnd="url(#arrowhead)"
          className="dark:stroke-blue-400"
          opacity="0.75"
        />
      </svg>
    )
  }, [previewArrow, orientation, SQUARE_SIZE])

  return (
    <div className="flex flex-col items-center">
      <div
        className="relative grid grid-cols-8 border-4 border-gray-800 dark:border-gray-200 shadow-2xl"
        style={{ width: SQUARE_SIZE * 8, height: SQUARE_SIZE * 8 }}
      >
        {arrowElement}
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
