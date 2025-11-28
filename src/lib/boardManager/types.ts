/**
 * Type definitions for chess board state management system
 */

import { Square } from 'chess.js';

export type ChessColor = 'white' | 'black';
export type ChessPiece = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';

export interface PiecePosition {
  square: Square;
  type: ChessPiece;
  color: ChessColor;
}

export interface PiecePlacement {
  white: {
    king: Square[];
    queens: Square[];
    rooks: Square[];
    bishops: Square[];
    knights: Square[];
    pawns: Square[];
  };
  black: {
    king: Square[];
    queens: Square[];
    rooks: Square[];
    bishops: Square[];
    knights: Square[];
    pawns: Square[];
  };
}

export interface Pin {
  pinnedPiece: { square: Square; type: ChessPiece; color: ChessColor };
  pinningPiece: { square: Square; type: ChessPiece; color: ChessColor };
  pinnedTo: { square: Square; type: ChessPiece; color: ChessColor };
  type: 'absolute' | 'relative';
}

export interface Fork {
  forkingPiece: { square: Square; type: ChessPiece; color: ChessColor };
  forkedPieces: Array<{ square: Square; type: ChessPiece; color: ChessColor }>;
}

export interface Attack {
  piece: string; // e.g., "Bc4"
  square: Square;
  targets: Square[];
  description: string;
}

export interface HangingPiece {
  square: Square;
  type: ChessPiece;
  color: ChessColor;
  description: string;
  attackers: number;
  defenders: number;
}

export interface TacticalFeatures {
  pins: Pin[];
  forks: Fork[];
  skewers: Array<{
    attackingPiece: { square: Square; type: ChessPiece; color: ChessColor };
    frontPiece: { square: Square; type: ChessPiece; color: ChessColor };
    backPiece: { square: Square; type: ChessPiece; color: ChessColor };
  }>;
  hangingPieces: HangingPiece[];
  discoveredAttacks: Array<{
    movingPiece: { square: Square; type: ChessPiece; color: ChessColor };
    attackingPiece: { square: Square; type: ChessPiece; color: ChessColor };
    target: Square;
  }>;
  attacks: Attack[];
}

export interface PawnStructure {
  chains: Array<{ squares: Square[]; color: ChessColor }>;
  isolatedPawns: Array<{ square: Square; color: ChessColor }>;
  doubledPawns: Array<{ squares: Square[]; color: ChessColor }>;
  passedPawns: Array<{ square: Square; color: ChessColor }>;
}

export interface KingSafety {
  white: {
    status: string;
    pawnShield: Square[];
    attackersNearKing: number;
    escapeSquares: Square[];
  };
  black: {
    status: string;
    pawnShield: Square[];
    attackersNearKing: number;
    escapeSquares: Square[];
  };
}

export interface PositionalFeatures {
  kingSafety: KingSafety;
  centerControl: string;
  development: string;
  pawnStructure: PawnStructure;
  openFiles: Array<{ file: string; controlledBy: ChessColor | 'contested' }>;
  openDiagonals: Array<{ squares: Square[]; controlledBy: ChessColor | 'contested' }>;
}

export interface MaterialBalance {
  balance: string;
  whitePoints: number;
  blackPoints: number;
  pieceCounts: {
    white: Record<ChessPiece, number>;
    black: Record<ChessPiece, number>;
  };
}

export interface SquareControl {
  whiteControls: Square[];
  blackControls: Square[];
  contested: Square[];
}

export interface CategorizedMoves {
  captures: string[];
  checks: string[];
  quietMoves: string[];
  tactical: string[];
}

export interface LegalMoves {
  categorized: CategorizedMoves;
  allMovesUCI: string[];
  allMovesSAN: string[];
}

export interface MoveResult {
  success: boolean;
  error?: string;
  san?: string;
  uci?: string;
  fen?: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  details?: string;
}

export interface MoveQuality {
  classification: 'brilliant' | 'great' | 'good' | 'inaccuracy' | 'mistake' | 'blunder' | 'unknown';
  reason: string;
  score?: number;
}

export interface VariationNode {
  id: string;
  move: string;
  fen: string;
  parent: string | null;
  children: string[];
  comment?: string;
}

export interface ComprehensivePositionContext {
  fen: string;
  toMove: 'white' | 'black';
  moveNumber: number;
  halfMoveClock: number;
  pieces: PiecePlacement;
  piecePlacementNatural: string;
  legalMoves: LegalMoves;
  tacticalFeatures: TacticalFeatures;
  positionalFeatures: PositionalFeatures;
  material: MaterialBalance;
  squareControl: SquareControl;
  gameState: {
    isCheck: boolean;
    isCheckmate: boolean;
    isStalemate: boolean;
    isDraw: boolean;
    isThreefoldRepetition: boolean;
    isInsufficientMaterial: boolean;
    castlingRights: {
      whiteKingside: boolean;
      whiteQueenside: boolean;
      blackKingside: boolean;
      blackQueenside: boolean;
    };
    enPassantSquare: Square | null;
  };
}
