import { Chess, Square, PieceSymbol } from 'chess.js'

export class ChessEngine {
  private chess: Chess

  constructor(fen?: string) {
    this.chess = new Chess(fen)
  }

  getChessInstance(): Chess {
    return this.chess
  }

  getFen(): string {
    return this.chess.fen()
  }

  getPgn(): string {
    return this.chess.pgn()
  }

  loadFen(fen: string): boolean {
    try {
      this.chess.load(fen)
      return true
    } catch {
      return false
    }
  }

  loadPgn(pgn: string): boolean {
    try {
      this.chess.loadPgn(pgn)
      return true
    } catch {
      return false
    }
  }

  makeMove(from: Square, to: Square, promotion?: PieceSymbol) {
    try {
      const move = this.chess.move({ from, to, promotion })
      return move !== null
    } catch {
      return false
    }
  }

  getLegalMoves(square: Square): Square[] {
    const moves = this.chess.moves({ square, verbose: true })
    return moves.map((move) => move.to as Square)
  }

  isCheck(): boolean {
    return this.chess.isCheck()
  }

  isCheckmate(): boolean {
    return this.chess.isCheckmate()
  }

  isStalemate(): boolean {
    return this.chess.isStalemate()
  }

  isDraw(): boolean {
    return this.chess.isDraw()
  }

  isGameOver(): boolean {
    return this.chess.isGameOver()
  }

  getTurn(): 'w' | 'b' {
    return this.chess.turn()
  }

  reset(): void {
    this.chess.reset()
  }

  undo() {
    return this.chess.undo()
  }
}

// Utility functions
export function fileToIndex(file: string): number {
  return file.charCodeAt(0) - 'a'.charCodeAt(0)
}

export function rankToIndex(rank: string): number {
  return parseInt(rank) - 1
}

export function squareToCoords(square: Square): { file: number; rank: number } {
  return {
    file: fileToIndex(square[0]),
    rank: rankToIndex(square[1]),
  }
}

export function coordsToSquare(file: number, rank: number): Square | null {
  if (file < 0 || file > 7 || rank < 0 || rank > 7) return null
  return `${'abcdefgh'[file]}${rank + 1}` as Square
}

export function getSquareColor(square: Square): 'light' | 'dark' {
  const { file, rank } = squareToCoords(square)
  return (file + rank) % 2 === 0 ? 'dark' : 'light'
}
