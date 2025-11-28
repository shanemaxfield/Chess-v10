/**
 * Custom error classes for chess board state management
 * Provides detailed, actionable error messages for all chess operations
 */

export class ChessBoardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ChessBoardError';
  }
}

export class IllegalMoveError extends ChessBoardError {
  constructor(
    public move: string,
    public fen: string,
    public reason: string,
    public suggestion?: string
  ) {
    const msg = `Illegal move "${move}": ${reason}${suggestion ? `\nSuggestion: ${suggestion}` : ''}`;
    super(msg);
    this.name = 'IllegalMoveError';
  }
}

export class InvalidSquareError extends ChessBoardError {
  constructor(public square: string) {
    super(`Invalid square "${square}". Squares must be in the range a1-h8.`);
    this.name = 'InvalidSquareError';
  }
}

export class InvalidFENError extends ChessBoardError {
  constructor(public fen: string, public reason: string) {
    super(`Invalid FEN "${fen}": ${reason}`);
    this.name = 'InvalidFENError';
  }
}

export class NoPieceError extends ChessBoardError {
  constructor(public square: string, public fen: string) {
    super(`No piece on square ${square} in position ${fen}`);
    this.name = 'NoPieceError';
  }
}

export class WrongColorError extends ChessBoardError {
  constructor(
    public square: string,
    public pieceColor: 'white' | 'black',
    public expectedColor: 'white' | 'black'
  ) {
    super(
      `Cannot move ${pieceColor} piece on ${square}. It's ${expectedColor} to move.`
    );
    this.name = 'WrongColorError';
  }
}

export class PositionIntegrityError extends ChessBoardError {
  constructor(public details: string) {
    super(`Position integrity check failed: ${details}`);
    this.name = 'PositionIntegrityError';
  }
}
