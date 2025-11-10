import { useMemo } from 'react'
import { Square as SquareType } from 'chess.js'
import Square from './Square'
import { useGameStore } from '../store/gameStore'
import { useKeyboardController } from '../hooks/useKeyboardController'
import { getSquareColor, squareToCoords } from '../lib/chessEngine'
import Piece from './Piece'

function ChessBoard() {
  const { chess, orientation, draggedPiece, fen, previewArrow, arrows, highlights } = useGameStore()

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

  // Helper function to calculate arrow coordinates
  const calculateArrowCoords = (from: string, to: string) => {
    const fromCoords = squareToCoords(from as SquareType)
    const toCoords = squareToCoords(to as SquareType)

    const fromFile = fromCoords.file
    const fromRank = 7 - fromCoords.rank
    const toFile = toCoords.file
    const toRank = 7 - toCoords.rank

    const isFlipped = orientation === 'b'
    const adjustedFromFile = isFlipped ? 7 - fromFile : fromFile
    const adjustedFromRank = isFlipped ? 7 - fromRank : fromRank
    const adjustedToFile = isFlipped ? 7 - toFile : toFile
    const adjustedToRank = isFlipped ? 7 - toRank : toRank

    const fromX = adjustedFromFile * SQUARE_SIZE + SQUARE_SIZE / 2
    const fromY = adjustedFromRank * SQUARE_SIZE + SQUARE_SIZE / 2
    const toX = adjustedToFile * SQUARE_SIZE + SQUARE_SIZE / 2
    const toY = adjustedToRank * SQUARE_SIZE + SQUARE_SIZE / 2

    const dx = toX - fromX
    const dy = toY - fromY
    const angle = Math.atan2(dy, dx)

    const arrowHeadOffset = SQUARE_SIZE * 0.15
    const lineEndX = toX - arrowHeadOffset * Math.cos(angle)
    const lineEndY = toY - arrowHeadOffset * Math.sin(angle)

    return { fromX, fromY, lineEndX, lineEndY }
  }

  // Render all arrows (both preview arrow and chat arrows)
  const arrowElements = useMemo(() => {
    const allArrows = []

    // Add preview arrow (from engine)
    if (previewArrow) {
      allArrows.push({
        id: 'preview-arrow',
        from: previewArrow.from,
        to: previewArrow.to,
        color: '#3b82f6',
      })
    }

    // Add chat-triggered arrows
    arrows.forEach((arrow) => {
      allArrows.push({
        id: arrow.id,
        from: arrow.from,
        to: arrow.to,
        color: arrow.color ?? '#00aa00',
      })
    })

    if (allArrows.length === 0) return null

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
          {allArrows.map((arrow, idx) => (
            <marker
              key={`marker-${arrow.id}`}
              id={`arrowhead-${idx}`}
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3, 0 6"
                fill={arrow.color}
              />
            </marker>
          ))}
        </defs>
        {allArrows.map((arrow, idx) => {
          const { fromX, fromY, lineEndX, lineEndY } = calculateArrowCoords(arrow.from, arrow.to)
          return (
            <line
              key={arrow.id}
              x1={fromX}
              y1={fromY}
              x2={lineEndX}
              y2={lineEndY}
              stroke={arrow.color}
              strokeWidth="6"
              strokeLinecap="round"
              markerEnd={`url(#arrowhead-${idx})`}
              opacity="0.75"
            />
          )
        })}
      </svg>
    )
  }, [previewArrow, arrows, orientation, SQUARE_SIZE])

  // Build a map of highlighted squares
  const highlightMap = useMemo(() => {
    const map = new Map<string, string>()
    highlights.forEach((highlight) => {
      highlight.squares.forEach((sq) => {
        map.set(sq, highlight.color ?? '#ffd54f')
      })
    })
    return map
  }, [highlights])

  return (
    <div className="flex flex-col items-center">
      <div
        className="relative grid grid-cols-8 border-[6px] border-stone-800 dark:border-amber-700/50 shadow-2xl rounded-sm overflow-hidden"
        style={{ width: SQUARE_SIZE * 8, height: SQUARE_SIZE * 8 }}
      >
        {arrowElements}
        {squares.map((square) => {
          const piece = getPieceAt(square) || null
          const isLight = getSquareColor(square) === 'light'
          const highlightColor = highlightMap.get(square)

          return (
            <Square
              key={square}
              square={square}
              piece={piece}
              isLight={isLight}
              size={SQUARE_SIZE}
              highlightColor={highlightColor}
            />
          )
        })}
      </div>
      {draggedPieceElement}
    </div>
  )
}

export default ChessBoard
