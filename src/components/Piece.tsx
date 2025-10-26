import { memo } from 'react'
import { Piece as ChessPiece } from 'chess.js'
import PieceSVG from './PieceSVG'

interface PieceProps {
  piece: ChessPiece
  size?: number
  isDragging?: boolean
}

const Piece = memo(({ piece, size = 45, isDragging = false }: PieceProps) => {
  const pieceCode = `${piece.color}${piece.type.toUpperCase()}`

  return (
    <div className={`flex items-center justify-center ${isDragging ? 'piece-dragging' : ''}`}>
      <PieceSVG piece={pieceCode} size={size} />
    </div>
  )
})

Piece.displayName = 'Piece'

export default Piece
