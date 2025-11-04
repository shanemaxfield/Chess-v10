import { Chess } from 'chess.js'

/**
 * Represents a single position in a PV line sequence
 */
export interface PvLinePosition {
  fen: string
  moveIndex: number
  totalMoves: number
  moveFrom?: string
  moveTo?: string
  san?: string
}

/**
 * Converts a FEN position and UCI moves into a sequence of board positions.
 * This helper can be reused for displaying any line of moves.
 * 
 * @param startFen - The starting FEN position
 * @param uciMoves - Array of UCI format moves (e.g., ["e2e4", "e7e5"])
 * @returns Array of positions representing the line progression
 */
export function fenToPvLineActions(
  startFen: string,
  uciMoves: string[]
): PvLinePosition[] {
  const positions: PvLinePosition[] = []
  
  try {
    const chess = new Chess(startFen)
    
    // Add the starting position
    positions.push({
      fen: startFen,
      moveIndex: 0,
      totalMoves: uciMoves.length,
    })
    
    // Apply each move and record the position
    for (let i = 0; i < uciMoves.length; i++) {
      const uciMove = uciMoves[i]
      
      if (!uciMove || uciMove.length < 4) {
        break
      }
      
      const from = uciMove.substring(0, 2) as any
      const to = uciMove.substring(2, 4) as any
      const promotion = uciMove.length > 4 ? uciMove.substring(4, 5) : undefined
      
      try {
        const move = chess.move({
          from,
          to,
          promotion: promotion as any,
        })
        
        if (!move) {
          break
        }
        
        positions.push({
          fen: chess.fen(),
          moveIndex: i + 1,
          totalMoves: uciMoves.length,
          moveFrom: from,
          moveTo: to,
          san: move.san,
        })
      } catch {
        break
      }
    }
  } catch {
    // Invalid FEN, return just the starting position
    return [{
      fen: startFen,
      moveIndex: 0,
      totalMoves: uciMoves.length,
    }]
  }
  
  return positions
}


