/**
 * PositionSerializer - Generates multiple position representation formats
 * Provides comprehensive context for LLM consumption and debugging
 */

import { Square } from 'chess.js';
import { PositionTracker } from './PositionTracker';
import { MoveValidator } from './MoveValidator';
import { FeatureExtractor } from './FeatureExtractor';
import { ComprehensivePositionContext } from './types';

export class PositionSerializer {
  constructor(
    private positionTracker: PositionTracker,
    private moveValidator: MoveValidator,
    private featureExtractor: FeatureExtractor
  ) {}

  /**
   * Get comprehensive position context for LLM consumption
   */
  getComprehensiveContext(): ComprehensivePositionContext {
    // const chess = this.positionTracker.getChessInstance();

    return {
      fen: this.positionTracker.getFEN(),
      toMove: this.positionTracker.getActiveColor(),
      moveNumber: this.positionTracker.getMoveNumber(),
      halfMoveClock: this.positionTracker.getHalfMoveClock(),
      pieces: this.positionTracker.getAllPiecesPositions(),
      piecePlacementNatural: this.positionTracker.getPiecePlacementNatural(),
      legalMoves: {
        categorized: this.moveValidator.getLegalMoves(),
        allMovesUCI: this.moveValidator.getLegalMovesUCI(),
        allMovesSAN: this.moveValidator.getLegalMovesSAN(),
      },
      tacticalFeatures: this.featureExtractor.extractTacticalFeatures(),
      positionalFeatures: this.featureExtractor.extractPositionalFeatures(),
      material: this.featureExtractor.calculateMaterialBalance(),
      squareControl: this.featureExtractor.calculateSquareControl(),
      gameState: {
        isCheck: this.moveValidator.isCheck(),
        isCheckmate: this.moveValidator.isCheckmate(),
        isStalemate: this.moveValidator.isStalemate(),
        isDraw: this.moveValidator.isDraw(),
        isThreefoldRepetition: this.moveValidator.isThreefoldRepetition(),
        isInsufficientMaterial: this.moveValidator.isInsufficientMaterial(),
        castlingRights: this.positionTracker.getCastlingRights(),
        enPassantSquare: this.positionTracker.getEnPassantSquare(),
      },
    };
  }

  /**
   * Get ASCII board representation for debugging
   */
  getBoardASCII(): string {
    // const chess = this.positionTracker.getChessInstance();
    const board = this.positionTracker.getBoardArray();

    let ascii = '   a b c d e f g h\n';

    for (let rank = 7; rank >= 0; rank--) {
      ascii += `${rank + 1}  `;
      for (let file = 0; file < 8; file++) {
        const piece = board[7 - rank][file];
        if (piece) {
          const symbol = this.getPieceASCII(piece.type, piece.color);
          ascii += symbol + ' ';
        } else {
          ascii += '. ';
        }
      }
      ascii += ` ${rank + 1}\n`;
    }

    ascii += '   a b c d e f g h\n\n';
    ascii += `${this.positionTracker.getActiveColor() === 'white' ? 'White' : 'Black'} to move`;

    if (this.moveValidator.isCheck()) {
      ascii += ' (in check)';
    }

    return ascii;
  }

  /**
   * Get board as JSON object
   */
  getBoardJSON(): Record<Square, { type: string; color: string } | null> {
    // const chess = this.positionTracker.getChessInstance();
    const result: Record<string, { type: string; color: string } | null> = {};

    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];

    for (const file of files) {
      for (const rank of ranks) {
        const square = `${file}${rank}` as Square;
        const piece = this.positionTracker.getPieceOnSquare(square);

        if (piece) {
          result[square] = {
            type: piece.type,
            color: piece.color === 'w' ? 'white' : 'black',
          };
        } else {
          result[square] = null;
        }
      }
    }

    return result;
  }

  /**
   * Get compact position summary for display
   */
  getPositionSummary(): string {
    const context = this.getComprehensiveContext();
    const parts: string[] = [];

    // Material balance
    parts.push(context.material.balance);

    // Game state
    if (context.gameState.isCheckmate) {
      parts.push('Checkmate');
    } else if (context.gameState.isStalemate) {
      parts.push('Stalemate');
    } else if (context.gameState.isCheck) {
      parts.push(`${context.toMove} is in check`);
    }

    // Tactical threats
    if (context.tacticalFeatures.hangingPieces.length > 0) {
      parts.push(`${context.tacticalFeatures.hangingPieces.length} hanging piece(s)`);
    }

    if (context.tacticalFeatures.pins.length > 0) {
      parts.push(`${context.tacticalFeatures.pins.length} pin(s)`);
    }

    if (context.tacticalFeatures.forks.length > 0) {
      parts.push(`${context.tacticalFeatures.forks.length} fork(s)`);
    }

    return parts.join(', ');
  }

  /**
   * Get position as natural language description
   */
  getPositionNaturalLanguage(): string {
    const context = this.getComprehensiveContext();
    const parts: string[] = [];

    // Whose turn
    parts.push(`It's ${context.toMove}'s turn to move (move ${context.moveNumber}).`);

    // Piece placement
    parts.push(context.piecePlacementNatural);

    // Material situation
    parts.push(context.material.balance + '.');

    // Tactical features
    if (context.tacticalFeatures.hangingPieces.length > 0) {
      const hanging = context.tacticalFeatures.hangingPieces.map((h) => h.description);
      parts.push('Tactical alert: ' + hanging.join('; ') + '.');
    }

    if (context.tacticalFeatures.pins.length > 0) {
      const pins = context.tacticalFeatures.pins.map(
        (pin) =>
          `${pin.pinnedPiece.color} ${pin.pinnedPiece.type} on ${pin.pinnedPiece.square} is pinned by ${pin.pinningPiece.color} ${pin.pinningPiece.type} on ${pin.pinningPiece.square}`
      );
      parts.push('Pins: ' + pins.join('; ') + '.');
    }

    if (context.tacticalFeatures.forks.length > 0) {
      parts.push(`There ${context.tacticalFeatures.forks.length === 1 ? 'is' : 'are'} ${context.tacticalFeatures.forks.length} fork(s) in the position.`);
    }

    // Positional assessment
    parts.push(context.positionalFeatures.centerControl + '.');
    parts.push(context.positionalFeatures.development + '.');

    return parts.join(' ');
  }

  /**
   * Export position data for LLM prompt augmentation
   */
  getContextForLLM(): {
    position: ComprehensivePositionContext;
    summary: string;
    naturalLanguage: string;
    ascii: string;
  } {
    return {
      position: this.getComprehensiveContext(),
      summary: this.getPositionSummary(),
      naturalLanguage: this.getPositionNaturalLanguage(),
      ascii: this.getBoardASCII(),
    };
  }

  /**
   * Get piece ASCII representation
   */
  private getPieceASCII(type: string, color: 'w' | 'b'): string {
    const pieces: Record<string, Record<string, string>> = {
      w: { k: 'K', q: 'Q', r: 'R', b: 'B', n: 'N', p: 'P' },
      b: { k: 'k', q: 'q', r: 'r', b: 'b', n: 'n', p: 'p' },
    };

    return pieces[color][type] || '?';
  }
}
