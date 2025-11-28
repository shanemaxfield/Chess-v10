/**
 * MoveValidator - Generates and categorizes all legal moves
 * Provides detailed move validation with specific error messages
 */

import { Chess, Square, Move } from 'chess.js';
// Error types are used in error handling but may not be directly referenced
// import { IllegalMoveError, NoPieceError, WrongColorError } from './errors';
import { CategorizedMoves, ValidationResult } from './types';

export class MoveValidator {
  constructor(private chess: Chess) {}

  /**
   * Get all legal moves in categorized format
   */
  getLegalMoves(): CategorizedMoves {
    const moves = this.chess.moves({ verbose: true });

    const categorized: CategorizedMoves = {
      captures: [],
      checks: [],
      quietMoves: [],
      tactical: [],
    };

    for (const move of moves) {
      const san = move.san;

      // Categorize by type
      if (move.captured) {
        categorized.captures.push(san);
      } else if (this.isPawnBreak(move)) {
        categorized.tactical.push(`${san} (pawn break)`);
      } else {
        categorized.quietMoves.push(san);
      }

      // Check if move gives check
      if (san.includes('+') || san.includes('#')) {
        categorized.checks.push(san);
      }

      // Identify tactical moves
      if (this.isTacticalMove(move)) {
        if (!move.captured) {
          // Only add if not already in captures
          categorized.tactical.push(san);
        }
      }
    }

    return categorized;
  }

  /**
   * Get all legal moves in UCI format
   */
  getLegalMovesUCI(): string[] {
    const moves = this.chess.moves({ verbose: true });
    return moves.map((m) => `${m.from}${m.to}${m.promotion || ''}`);
  }

  /**
   * Get all legal moves in SAN format
   */
  getLegalMovesSAN(): string[] {
    return this.chess.moves();
  }

  /**
   * Get legal moves from a specific square
   */
  getLegalMovesFromSquare(square: Square): Square[] {
    const moves = this.chess.moves({ square, verbose: true });
    return moves.map((m) => m.to);
  }

  /**
   * Validate a move in UCI format (e.g., "e2e4")
   */
  validateMoveUCI(uciMove: string): ValidationResult {
    const from = uciMove.slice(0, 2) as Square;
    const to = uciMove.slice(2, 4) as Square;
    const promotion = uciMove.length === 5 ? (uciMove[4] as 'q' | 'r' | 'b' | 'n') : undefined;

    return this.validateMove(from, to, promotion);
  }

  /**
   * Validate a move in SAN format (e.g., "Nf3")
   */
  validateMoveSAN(san: string): ValidationResult {
    try {
      // Create a copy to test the move
      const testChess = new Chess(this.chess.fen());
      const move = testChess.move(san);

      if (move) {
        return { valid: true };
      } else {
        return {
          valid: false,
          error: 'Invalid move',
          details: `Move ${san} is not legal in the current position`,
        };
      }
    } catch (error) {
      return {
        valid: false,
        error: 'Invalid move',
        details: (error as Error).message,
      };
    }
  }

  /**
   * Validate a move with detailed error reporting
   */
  validateMove(from: Square, to: Square, promotion?: 'q' | 'r' | 'b' | 'n'): ValidationResult {
    const piece = this.chess.get(from);

    // Check if there's a piece on the from square
    if (!piece) {
      return {
        valid: false,
        error: 'NoPieceError',
        details: `No piece on square ${from}`,
      };
    }

    // Check if it's the right color
    const activeColor = this.chess.turn();
    if (piece.color !== activeColor) {
      const pieceColor = piece.color === 'w' ? 'white' : 'black';
      const expectedColor = activeColor === 'w' ? 'white' : 'black';
      return {
        valid: false,
        error: 'WrongColorError',
        details: `Cannot move ${pieceColor} piece on ${from}. It's ${expectedColor} to move.`,
      };
    }

    // Check if the move is legal
    const legalMoves = this.getLegalMovesFromSquare(from);
    if (!legalMoves.includes(to)) {
      // Provide detailed reason why move is illegal
      const reason = this.getIllegalMoveReason(from, to, piece.type);
      return {
        valid: false,
        error: 'IllegalMoveError',
        details: reason,
      };
    }

    // Check promotion requirement
    if (piece.type === 'p') {
      const toRank = to[1];
      const isPromotionRank = (piece.color === 'w' && toRank === '8') || (piece.color === 'b' && toRank === '1');

      if (isPromotionRank && !promotion) {
        return {
          valid: false,
          error: 'IllegalMoveError',
          details: `Pawn move to ${to} requires promotion piece (q, r, b, or n)`,
        };
      }
    }

    return { valid: true };
  }

  /**
   * Get moves that give check
   */
  getCheckMoves(): Move[] {
    const moves = this.chess.moves({ verbose: true });
    return moves.filter((m) => {
      const testChess = new Chess(this.chess.fen());
      testChess.move(m.san);
      return testChess.isCheck();
    });
  }

  /**
   * Get capturing moves
   */
  getCaptureMoves(): Move[] {
    const moves = this.chess.moves({ verbose: true });
    return moves.filter((m) => m.captured);
  }

  /**
   * Get quiet (non-capturing) moves
   */
  getQuietMoves(): Move[] {
    const moves = this.chess.moves({ verbose: true });
    return moves.filter((m) => !m.captured);
  }

  /**
   * Check if position is check
   */
  isCheck(): boolean {
    return this.chess.isCheck();
  }

  /**
   * Check if position is checkmate
   */
  isCheckmate(): boolean {
    return this.chess.isCheckmate();
  }

  /**
   * Check if position is stalemate
   */
  isStalemate(): boolean {
    return this.chess.isStalemate();
  }

  /**
   * Check if position is draw
   */
  isDraw(): boolean {
    return this.chess.isDraw();
  }

  /**
   * Check if position is insufficient material draw
   */
  isInsufficientMaterial(): boolean {
    return this.chess.isInsufficientMaterial();
  }

  /**
   * Check if position is threefold repetition
   */
  isThreefoldRepetition(): boolean {
    return this.chess.isThreefoldRepetition();
  }

  /**
   * Determine if a move is a pawn break
   */
  private isPawnBreak(move: Move): boolean {
    if (move.piece !== 'p') return false;

    // Check if pawn is moving to an important central square
    const centralSquares = ['d4', 'e4', 'd5', 'e5', 'c4', 'f4', 'c5', 'f5'];
    return centralSquares.includes(move.to);
  }

  /**
   * Determine if a move is tactical
   */
  private isTacticalMove(move: Move): boolean {
    // Captures are already categorized
    if (move.captured) return true;

    // Checks are tactical
    if (move.san.includes('+') || move.san.includes('#')) return true;

    // Castling is tactical
    if (move.flags.includes('k') || move.flags.includes('q')) return true;

    // Pawn breaks in the center
    if (this.isPawnBreak(move)) return true;

    return false;
  }

  /**
   * Get detailed reason why a move is illegal
   */
  private getIllegalMoveReason(from: Square, to: Square, pieceType: string): string {
    const piece = this.chess.get(from);
    if (!piece) return `No piece on ${from}`;

    // Check if blocked by another piece
    const blockers = this.getBlockingPieces(from, to);
    if (blockers.length > 0) {
      return `${this.getPieceName(pieceType)} on ${from} cannot move to ${to} (blocked by piece on ${blockers[0]})`;
    }

    // Check if move would leave king in check
    const testChess = new Chess(this.chess.fen());
    try {
      testChess.move({ from, to });
    } catch (error) {
      // If chess.js throws error, use its message
      return (error as Error).message;
    }

    return `${this.getPieceName(pieceType)} on ${from} cannot legally move to ${to}`;
  }

  /**
   * Get pieces blocking a path between two squares
   */
  private getBlockingPieces(from: Square, to: Square): Square[] {
    const blockers: Square[] = [];
    const path = this.getPathBetween(from, to);

    for (const square of path) {
      const piece = this.chess.get(square);
      if (piece) {
        blockers.push(square);
      }
    }

    return blockers;
  }

  /**
   * Get path between two squares (for sliding pieces)
   */
  private getPathBetween(from: Square, to: Square): Square[] {
    const path: Square[] = [];

    const fromFile = from.charCodeAt(0) - 'a'.charCodeAt(0);
    const fromRank = parseInt(from[1]) - 1;
    const toFile = to.charCodeAt(0) - 'a'.charCodeAt(0);
    const toRank = parseInt(to[1]) - 1;

    const fileDir = Math.sign(toFile - fromFile);
    const rankDir = Math.sign(toRank - fromRank);

    let currentFile = fromFile + fileDir;
    let currentRank = fromRank + rankDir;

    while (currentFile !== toFile || currentRank !== toRank) {
      const square = `${'abcdefgh'[currentFile]}${currentRank + 1}` as Square;
      path.push(square);

      if (currentFile !== toFile) currentFile += fileDir;
      if (currentRank !== toRank) currentRank += rankDir;

      // Safety check to prevent infinite loop
      if (Math.abs(currentFile - fromFile) > 7 || Math.abs(currentRank - fromRank) > 7) {
        break;
      }
    }

    return path;
  }

  /**
   * Get human-readable piece name
   */
  private getPieceName(type: string): string {
    const names: Record<string, string> = {
      k: 'King',
      q: 'Queen',
      r: 'Rook',
      b: 'Bishop',
      n: 'Knight',
      p: 'Pawn',
    };
    return names[type] || 'Piece';
  }
}
