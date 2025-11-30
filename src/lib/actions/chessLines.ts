/**
 * Chess Lines - Predefined sequences of moves
 * Each line demonstrates a specific opening, tactic, or endgame pattern
 */

export interface ChessLine {
  id: string
  name: string
  description: string
  moves: string[] // Moves in SAN format (e.g., "e4", "e5", "Nf3")
  category: 'opening' | 'tactic' | 'endgame' | 'checkmate'
}

/**
 * Hardcoded example lines for testing
 */
export const CHESS_LINES: ChessLine[] = [
  {
    id: 'italian-opening',
    name: 'Italian Opening',
    description: 'Classic opening focusing on rapid development and center control',
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'd6', 'd4', 'exd4', 'cxd4', 'Bb6'],
    category: 'opening',
  },
  {
    id: 'scholars-mate',
    name: "Scholar's Mate",
    description: 'Quick checkmate pattern (beginners beware!)',
    moves: ['e4', 'e5', 'Bc4', 'Nc6', 'Qh5', 'Nf6', 'Qxf7#'],
    category: 'checkmate',
  },
  {
    id: 'ruy-lopez',
    name: 'Ruy Lopez',
    description: 'One of the oldest and most classic chess openings',
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7', 'Re1', 'b5', 'Bb3', 'd6'],
    category: 'opening',
  },
  {
    id: 'queens-gambit',
    name: "Queen's Gambit",
    description: 'Solid opening for White, offering a pawn for central control',
    moves: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bg5', 'Be7', 'e3', 'O-O', 'Nf3', 'Nbd7'],
    category: 'opening',
  },
  {
    id: 'fried-liver',
    name: 'Fried Liver Attack',
    description: 'Aggressive attacking line in the Italian Opening',
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'd4', 'exd4', 'O-O', 'Nxe4', 'Re1', 'd5', 'Bxd5', 'Qxd5', 'Nc3'],
    category: 'tactic',
  },
  {
    id: 'back-rank-mate',
    name: 'Back Rank Mate Pattern',
    description: 'Common checkmate pattern on the back rank',
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'O-O', 'Nf6', 'd3', 'd6', 'Bg5', 'h6', 'Bh4', 'g5', 'Bg3', 'h5', 'Nxg5', 'h4', 'Nxf7', 'hxg3', 'Nxd8', 'Bg4', 'Qxg4', 'Nd4', 'Qxg3#'],
    category: 'checkmate',
  },
  {
    id: 'sicilian-defense',
    name: 'Sicilian Defense',
    description: 'Most popular defense to 1.e4, fighting for the center',
    moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6'],
    category: 'opening',
  },
  {
    id: 'fools-mate',
    name: "Fool's Mate",
    description: 'Quickest possible checkmate in chess',
    moves: ['f3', 'e5', 'g4', 'Qh4#'],
    category: 'checkmate',
  },
  {
    id: 'king-endgame',
    name: 'King and Pawn Endgame',
    description: 'Basic king and pawn vs king endgame technique',
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd4', 'exd4', 'cxd4'],
    category: 'endgame',
  },
  {
    id: 'smothered-mate',
    name: 'Smothered Mate Pattern',
    description: 'Knight delivers checkmate while king is trapped by its own pieces',
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nd4', 'Nxe5', 'Qg5', 'Nxf7', 'Qxg2', 'Rf1', 'Qxe4+', 'Be2', 'Nf3#'],
    category: 'checkmate',
  },
]

/**
 * Get all available lines
 */
export function getAllLines(): ChessLine[] {
  return CHESS_LINES
}

/**
 * Get a line by ID
 */
export function getLineById(id: string): ChessLine | undefined {
  return CHESS_LINES.find(line => line.id === id)
}

/**
 * Get lines by category
 */
export function getLinesByCategory(category: ChessLine['category']): ChessLine[] {
  return CHESS_LINES.filter(line => line.category === category)
}

/**
 * Search lines by name or description
 */
export function searchLines(query: string): ChessLine[] {
  const lowerQuery = query.toLowerCase()
  return CHESS_LINES.filter(
    line =>
      line.name.toLowerCase().includes(lowerQuery) ||
      line.description.toLowerCase().includes(lowerQuery)
  )
}

/**
 * Get line by index (for simple "line 1", "line 2" commands)
 */
export function getLineByIndex(index: number): ChessLine | undefined {
  if (index < 0 || index >= CHESS_LINES.length) {
    return undefined
  }
  return CHESS_LINES[index]
}
