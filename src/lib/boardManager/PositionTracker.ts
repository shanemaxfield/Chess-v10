/**
 * PositionTracker - Maintains exact board state with zero ambiguity
 * Uses multiple redundant representations to ensure position integrity
 */

import { Chess, Square, Piece, Color } from 'chess.js';
import { InvalidFENError, PositionIntegrityError } from './errors';
import { ChessColor, ChessPiece, PiecePlacement } from './types';

export class PositionTracker {
  private chess: Chess;
  private fen: string;
  private boardArray: (Piece | null)[][]; // 8x8 array
  private pieceToSquare: Map<string, Square[]>; // e.g., "white_king" -> ["e1"]
  private squareToPiece: Map<Square, string>; // e.g., "e1" -> "white_king"

  constructor(fen?: string) {
    this.chess = new Chess(fen);
    this.fen = this.chess.fen();
    this.boardArray = this.createBoardArray();
    this.pieceToSquare = new Map();
    this.squareToPiece = new Map();
    this.updateRedundantRepresentations();
    this.verifyIntegrity();
  }

  /**
   * Get current FEN string
   */
  getFEN(): string {
    return this.fen;
  }

  /**
   * Get Chess.js instance (for internal use)
   */
  getChessInstance(): Chess {
    return this.chess;
  }

  /**
   * Load a new FEN position
   */
  loadFEN(fen: string): void {
    try {
      const testChess = new Chess(fen);
      this.chess = testChess;
      this.fen = fen;
      this.boardArray = this.createBoardArray();
      this.updateRedundantRepresentations();
      this.verifyIntegrity();
    } catch (error) {
      throw new InvalidFENError(fen, (error as Error).message);
    }
  }

  /**
   * Get piece on a specific square
   */
  getPieceOnSquare(square: Square): Piece | null {
    return this.chess.get(square);
  }

  /**
   * Get all pieces with their positions
   */
  getAllPiecesPositions(): PiecePlacement {
    const placement: PiecePlacement = {
      white: {
        king: [],
        queens: [],
        rooks: [],
        bishops: [],
        knights: [],
        pawns: [],
      },
      black: {
        king: [],
        queens: [],
        rooks: [],
        bishops: [],
        knights: [],
        pawns: [],
      },
    };

    const squares = this.getAllSquares();
    for (const square of squares) {
      const piece = this.chess.get(square);
      if (piece) {
        const color = piece.color === 'w' ? 'white' : 'black';
        const typeKey = this.mapPieceTypeToPlural(piece.type);
        placement[color][typeKey].push(square);
      }
    }

    return placement;
  }

  /**
   * Get active color (who's turn it is)
   */
  getActiveColor(): ChessColor {
    return this.chess.turn() === 'w' ? 'white' : 'black';
  }

  /**
   * Get full move number
   */
  getMoveNumber(): number {
    return this.chess.moveNumber();
  }

  /**
   * Get halfmove clock (for 50-move rule)
   */
  getHalfMoveClock(): number {
    const fenParts = this.fen.split(' ');
    return parseInt(fenParts[4] || '0', 10);
  }

  /**
   * Get castling rights
   */
  getCastlingRights(): {
    whiteKingside: boolean;
    whiteQueenside: boolean;
    blackKingside: boolean;
    blackQueenside: boolean;
  } {
    const fenParts = this.fen.split(' ');
    const castling = fenParts[2] || '-';

    return {
      whiteKingside: castling.includes('K'),
      whiteQueenside: castling.includes('Q'),
      blackKingside: castling.includes('k'),
      blackQueenside: castling.includes('q'),
    };
  }

  /**
   * Get en passant target square
   */
  getEnPassantSquare(): Square | null {
    const fenParts = this.fen.split(' ');
    const epSquare = fenParts[3];
    return epSquare !== '-' ? (epSquare as Square) : null;
  }

  /**
   * Get board as 8x8 array
   */
  getBoardArray(): (Piece | null)[][] {
    return this.boardArray;
  }

  /**
   * Get natural language description of piece placement
   */
  getPiecePlacementNatural(): string {
    const placement = this.getAllPiecesPositions();
    const parts: string[] = [];

    // White pieces
    const whiteParts: string[] = [];
    if (placement.white.king.length > 0) {
      whiteParts.push(`king on ${placement.white.king.join(', ')}`);
    }
    if (placement.white.queens.length > 0) {
      whiteParts.push(
        `${placement.white.queens.length === 1 ? 'queen' : 'queens'} on ${placement.white.queens.join(', ')}`
      );
    }
    if (placement.white.rooks.length > 0) {
      whiteParts.push(
        `${placement.white.rooks.length === 1 ? 'rook' : 'rooks'} on ${placement.white.rooks.join(', ')}`
      );
    }
    if (placement.white.bishops.length > 0) {
      whiteParts.push(
        `${placement.white.bishops.length === 1 ? 'bishop' : 'bishops'} on ${placement.white.bishops.join(', ')}`
      );
    }
    if (placement.white.knights.length > 0) {
      whiteParts.push(
        `${placement.white.knights.length === 1 ? 'knight' : 'knights'} on ${placement.white.knights.join(', ')}`
      );
    }
    if (placement.white.pawns.length > 0) {
      whiteParts.push(`pawns on ${placement.white.pawns.join(', ')}`);
    }

    if (whiteParts.length > 0) {
      parts.push(`White has ${whiteParts.join('; ')}`);
    }

    // Black pieces
    const blackParts: string[] = [];
    if (placement.black.king.length > 0) {
      blackParts.push(`king on ${placement.black.king.join(', ')}`);
    }
    if (placement.black.queens.length > 0) {
      blackParts.push(
        `${placement.black.queens.length === 1 ? 'queen' : 'queens'} on ${placement.black.queens.join(', ')}`
      );
    }
    if (placement.black.rooks.length > 0) {
      blackParts.push(
        `${placement.black.rooks.length === 1 ? 'rook' : 'rooks'} on ${placement.black.rooks.join(', ')}`
      );
    }
    if (placement.black.bishops.length > 0) {
      blackParts.push(
        `${placement.black.bishops.length === 1 ? 'bishop' : 'bishops'} on ${placement.black.bishops.join(', ')}`
      );
    }
    if (placement.black.knights.length > 0) {
      blackParts.push(
        `${placement.black.knights.length === 1 ? 'knight' : 'knights'} on ${placement.black.knights.join(', ')}`
      );
    }
    if (placement.black.pawns.length > 0) {
      blackParts.push(`pawns on ${placement.black.pawns.join(', ')}`);
    }

    if (blackParts.length > 0) {
      parts.push(`Black has ${blackParts.join('; ')}`);
    }

    return parts.join('. ');
  }

  /**
   * Create 8x8 board array from current position
   */
  private createBoardArray(): (Piece | null)[][] {
    const board: (Piece | null)[][] = [];
    for (let rank = 7; rank >= 0; rank--) {
      const row: (Piece | null)[] = [];
      for (let file = 0; file < 8; file++) {
        const square = this.coordsToSquare(file, rank);
        const piece = square ? this.chess.get(square) : null;
        row.push(piece);
      }
      board.push(row);
    }
    return board;
  }

  /**
   * Update redundant representations after position change
   */
  private updateRedundantRepresentations(): void {
    this.pieceToSquare.clear();
    this.squareToPiece.clear();

    const squares = this.getAllSquares();
    for (const square of squares) {
      const piece = this.chess.get(square);
      if (piece) {
        const color = piece.color === 'w' ? 'white' : 'black';
        const type = this.mapPieceType(piece.type);
        const key = `${color}_${type}`;

        if (!this.pieceToSquare.has(key)) {
          this.pieceToSquare.set(key, []);
        }
        this.pieceToSquare.get(key)!.push(square);
        this.squareToPiece.set(square, key);
      }
    }
  }

  /**
   * Verify internal consistency across all representations
   */
  private verifyIntegrity(): void {
    // Check that all representations are consistent
    const squares = this.getAllSquares();

    for (const square of squares) {
      const chessPiece = this.chess.get(square);
      const arrayPiece = this.getBoardArrayPiece(square);

      // Verify chess.js and array match
      if (chessPiece?.type !== arrayPiece?.type || chessPiece?.color !== arrayPiece?.color) {
        throw new PositionIntegrityError(
          `Mismatch at ${square}: chess.js has ${chessPiece?.type} ${chessPiece?.color}, array has ${arrayPiece?.type} ${arrayPiece?.color}`
        );
      }

      // Verify square-to-piece mapping
      if (chessPiece) {
        const mappedPiece = this.squareToPiece.get(square);
        const color = chessPiece.color === 'w' ? 'white' : 'black';
        const type = this.mapPieceType(chessPiece.type);
        const expectedKey = `${color}_${type}`;

        if (mappedPiece !== expectedKey) {
          throw new PositionIntegrityError(
            `Square-to-piece mapping error at ${square}: expected ${expectedKey}, got ${mappedPiece}`
          );
        }
      }
    }
  }

  /**
   * Get piece from board array at a specific square
   */
  private getBoardArrayPiece(square: Square): Piece | null {
    const coords = this.squareToCoords(square);
    if (!coords) return null;
    return this.boardArray[7 - coords.rank][coords.file];
  }

  /**
   * Get all valid chess squares
   */
  private getAllSquares(): Square[] {
    const squares: Square[] = [];
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];

    for (const file of files) {
      for (const rank of ranks) {
        squares.push(`${file}${rank}` as Square);
      }
    }

    return squares;
  }

  /**
   * Convert square notation to coordinates
   */
  private squareToCoords(square: Square): { file: number; rank: number } | null {
    const file = square.charCodeAt(0) - 'a'.charCodeAt(0);
    const rank = parseInt(square[1]) - 1;

    if (file < 0 || file > 7 || rank < 0 || rank > 7) {
      return null;
    }

    return { file, rank };
  }

  /**
   * Convert coordinates to square notation
   */
  private coordsToSquare(file: number, rank: number): Square | null {
    if (file < 0 || file > 7 || rank < 0 || rank > 7) return null;
    return `${'abcdefgh'[file]}${rank + 1}` as Square;
  }

  /**
   * Map chess.js piece type to our ChessPiece type
   */
  private mapPieceType(type: string): ChessPiece {
    const map: Record<string, ChessPiece> = {
      k: 'king',
      q: 'queen',
      r: 'rook',
      b: 'bishop',
      n: 'knight',
      p: 'pawn',
    };
    return map[type] || 'pawn';
  }

  /**
   * Map chess.js piece type to plural form for PiecePlacement
   */
  private mapPieceTypeToPlural(type: string): keyof PiecePlacement['white'] {
    const map: Record<string, keyof PiecePlacement['white']> = {
      k: 'king',
      q: 'queens',
      r: 'rooks',
      b: 'bishops',
      n: 'knights',
      p: 'pawns',
    };
    return map[type] || 'pawns';
  }
}
