import { ActionPlan } from "./types";
import { Chess, Square } from "chess.js";

/**
 * Extract chess square coordinates from text (e.g., "a1", "e4", "h8")
 */
function extractSquares(text: string): Square[] {
  const squareRegex = /[a-h][1-8]/gi;
  const matches = text.match(squareRegex);
  if (!matches) return [];
  
  // Validate and convert to Square type (ensure lowercase)
  return matches
    .map(m => m.toLowerCase())
    .filter(m => {
      const file = m[0];
      const rank = m[1];
      return file >= 'a' && file <= 'h' && rank >= '1' && rank <= '8';
    }) as Square[];
}

/**
 * Find piece that can move to target square
 * Returns the first legal move found for the piece type
 */
function findPieceMove(
  chess: Chess,
  pieceType: 'b' | 'n' | 'r' | 'q' | 'k' | 'p',
  targetSquare: Square
): { from: Square; to: Square } | null {
  const turn = chess.turn();
  const allSquares: Square[] = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8',
                                'b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8',
                                'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8',
                                'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8',
                                'e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7', 'e8',
                                'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8',
                                'g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8',
                                'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'h7', 'h8'];

  // Find all pieces of the specified type for current player
  for (const square of allSquares) {
    const piece = chess.get(square);
    if (piece && piece.type === pieceType && piece.color === turn) {
      // Check if this piece can move to target square
      const moves = chess.moves({ square, verbose: true });
      const canMove = moves.some(m => m.to === targetSquare);
      if (canMove) {
        return { from: square, to: targetSquare };
      }
    }
  }

  return null;
}

/**
 * Parse chess notation move (e.g., "bc8", "Nf3", "e4")
 * Returns move action or null
 */
function parseChessNotationMove(chess: Chess, notation: string): { from: Square; to: Square } | null {
  const clean = notation.trim().toLowerCase();
  
  // Handle castling
  if (clean === 'o-o' || clean === '0-0') {
    const turn = chess.turn();
    if (turn === 'w') {
      return { from: 'e1', to: 'g1' };
    } else {
      return { from: 'e8', to: 'g8' };
    }
  }
  if (clean === 'o-o-o' || clean === '0-0-0') {
    const turn = chess.turn();
    if (turn === 'w') {
      return { from: 'e1', to: 'c1' };
    } else {
      return { from: 'e8', to: 'c8' };
    }
  }

  // Extract target square (last 2 characters that match square pattern)
  const squareMatch = clean.match(/[a-h][1-8]$/);
  if (!squareMatch) return null;
  
  const targetSquare = squareMatch[0] as Square;
  const prefix = clean.substring(0, clean.length - 2).trim();

  // If no prefix, it's a pawn move
  if (prefix === '') {
    return findPieceMove(chess, 'p', targetSquare);
  }

  // Map piece letters to piece types
  const pieceMap: { [key: string]: 'b' | 'n' | 'r' | 'q' | 'k' } = {
    'b': 'b',  // bishop
    'n': 'n',  // knight
    'r': 'r',  // rook
    'q': 'q',  // queen
    'k': 'k',  // king
  };

  const pieceType = pieceMap[prefix];
  if (pieceType) {
    return findPieceMove(chess, pieceType, targetSquare);
  }

  return null;
}

/**
 * Action Planner - Maps user input to ActionPlan
 * Supports strict format commands:
 * - Chess notation moves: "bc8", "Nf3", "e4", "O-O"
 * - Move format: "move X to Y" or "X to Y"
 * - Arrow format: "arrow from X to Y"
 * - Highlight format: "highlight X [and Y...]"
 */
export function planActions(input: string, chess: Chess): ActionPlan {
  const q = input.trim().toLowerCase();

  // A) Arrow drawing: "arrow from X to Y" (must check first to avoid matching as move)
  const arrowMatch = q.match(/arrow\s+from\s+([a-h][1-8])\s+to\s+([a-h][1-8])/i);
  if (arrowMatch) {
    const from = arrowMatch[1].toLowerCase() as Square;
    const to = arrowMatch[2].toLowerCase() as Square;
    return {
      arrows: [{ type: "arrow", from, to, color: "#00aa00" }]
    };
  }

  // B) Highlight: "highlight X [and Y...]" (must check before move parsing)
  if (q.startsWith("highlight")) {
    const squares = extractSquares(q);
    if (squares.length > 0) {
      return {
        highlights: [{ type: "highlight", squares, color: "#ffd54f", mode: "clear-and-add" }]
      };
    }
  }

  // C) Move format: "move X to Y" or "X to Y" (but NOT if it's part of arrow/highlight command)
  // Only match if it doesn't start with "arrow" or "highlight"
  if (!q.startsWith("arrow") && !q.startsWith("highlight")) {
    const moveToMatch = q.match(/(?:move\s+)?([a-h][1-8])\s+to\s+([a-h][1-8])/i);
    if (moveToMatch) {
      const from = moveToMatch[1].toLowerCase() as Square;
      const to = moveToMatch[2].toLowerCase() as Square;
      return {
        moves: [{ type: "move", from, to }]
      };
    }
  }

  // D) Chess notation moves: "bc8", "Nf3", "e4", "O-O", etc.
  // Only try if it's not an arrow or highlight command
  if (!q.startsWith("arrow") && !q.startsWith("highlight")) {
    // Try to parse as chess notation (remove common words first)
    const notationOnly = q.replace(/^(move|play|do|execute)\s+/i, '').trim();
    const chessMove = parseChessNotationMove(chess, notationOnly);
    if (chessMove) {
      return {
        moves: [{ type: "move", from: chessMove.from, to: chessMove.to }]
      };
    }
  }

  // Fallback: no actions
  return {};
}
