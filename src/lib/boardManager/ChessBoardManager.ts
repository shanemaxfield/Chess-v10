/**
 * ChessBoardManager - Production-grade chess board state management system
 * Single source of truth for all position information
 * Prevents LLM hallucinations by pre-calculating all tactical features
 */

import { Chess, Square, PieceSymbol, Piece, Move } from 'chess.js';
import { PositionTracker } from './PositionTracker';
import { MoveValidator } from './MoveValidator';
import { FeatureExtractor } from './FeatureExtractor';
import { PositionSerializer } from './PositionSerializer';
import { StateHistory } from './StateHistory';
import {
  IllegalMoveError,
  InvalidSquareError,
  NoPieceError,
  WrongColorError,
} from './errors';
import {
  MoveResult,
  ValidationResult,
  ComprehensivePositionContext,
  TacticalFeatures,
  MoveQuality,
  ChessColor,
  ChessPiece,
} from './types';

export class ChessBoardManager {
  private positionTracker: PositionTracker;
  private moveValidator: MoveValidator;
  private featureExtractor: FeatureExtractor;
  private positionSerializer: PositionSerializer;
  private stateHistory: StateHistory;

  constructor(initialFen?: string) {
    this.positionTracker = new PositionTracker(initialFen);
    const chess = this.positionTracker.getChessInstance();

    this.moveValidator = new MoveValidator(chess);
    this.featureExtractor = new FeatureExtractor(chess);
    this.positionSerializer = new PositionSerializer(
      this.positionTracker,
      this.moveValidator,
      this.featureExtractor
    );
    this.stateHistory = new StateHistory(initialFen);
  }

  // ============================================================================
  // Move Operations
  // ============================================================================

  /**
   * Make a move on the board
   * @param from Starting square (e.g., "e2")
   * @param to Destination square (e.g., "e4")
   * @param promotion Optional promotion piece ("q", "r", "b", "n")
   * @returns MoveResult with success status and details
   */
  makeMove(from: Square, to: Square, promotion?: PieceSymbol): MoveResult {
    try {
      // Validate the move first
      const validation = this.moveValidator.validateMove(from, to, promotion);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
        };
      }

      // Execute the move
      const chess = this.positionTracker.getChessInstance();
      const move = chess.move({ from, to, promotion });

      if (!move) {
        return {
          success: false,
          error: 'Move failed',
        };
      }

      // Update position tracker
      this.positionTracker.loadFEN(chess.fen());

      // Update history
      this.stateHistory.addMove(move.san, chess.fen());

      // Update all components
      this.updateComponents();

      return {
        success: true,
        san: move.san,
        uci: `${from}${to}${promotion || ''}`,
        fen: chess.fen(),
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Make a move using UCI notation (e.g., "e2e4")
   */
  makeMoveUCI(uciMove: string): MoveResult {
    const from = uciMove.slice(0, 2) as Square;
    const to = uciMove.slice(2, 4) as Square;
    const promotion = uciMove.length === 5 ? (uciMove[4] as PieceSymbol) : undefined;

    return this.makeMove(from, to, promotion);
  }

  /**
   * Make a move using SAN notation (e.g., "Nf3")
   */
  makeMoveSAN(san: string): MoveResult {
    try {
      const chess = this.positionTracker.getChessInstance();
      const move = chess.move(san);

      if (!move) {
        return {
          success: false,
          error: `Invalid move: ${san}`,
        };
      }

      // Update position tracker
      this.positionTracker.loadFEN(chess.fen());

      // Update history
      this.stateHistory.addMove(move.san, chess.fen());

      // Update all components
      this.updateComponents();

      return {
        success: true,
        san: move.san,
        uci: `${move.from}${move.to}${move.promotion || ''}`,
        fen: chess.fen(),
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Undo the last move
   */
  undoMove(): boolean {
    const success = this.stateHistory.goBack();
    if (success) {
      const fen = this.stateHistory.getCurrentFEN();
      this.positionTracker.loadFEN(fen);
      this.updateComponents();
    }
    return success;
  }

  /**
   * Redo a move (after undo)
   */
  redoMove(): boolean {
    const success = this.stateHistory.goForward();
    if (success) {
      const fen = this.stateHistory.getCurrentFEN();
      this.positionTracker.loadFEN(fen);
      this.updateComponents();
    }
    return success;
  }

  // ============================================================================
  // Move Validation
  // ============================================================================

  /**
   * Validate a move without executing it
   */
  validateMove(from: Square, to: Square, promotion?: PieceSymbol): ValidationResult {
    return this.moveValidator.validateMove(from, to, promotion);
  }

  /**
   * Validate a move in UCI format
   */
  validateMoveUCI(uciMove: string): ValidationResult {
    return this.moveValidator.validateMoveUCI(uciMove);
  }

  /**
   * Validate a move in SAN format
   */
  validateMoveSAN(san: string): ValidationResult {
    return this.moveValidator.validateMoveSAN(san);
  }

  /**
   * Get all legal moves from the current position
   */
  getLegalMoves(): Move[] {
    return this.positionTracker.getChessInstance().moves({ verbose: true });
  }

  /**
   * Get legal moves from a specific square
   */
  getLegalMovesFromSquare(square: Square): Square[] {
    return this.moveValidator.getLegalMovesFromSquare(square);
  }

  // ============================================================================
  // Position Query
  // ============================================================================

  /**
   * Check if a specific piece is on a specific square
   */
  isPieceOnSquare(square: Square, pieceType: ChessPiece, color?: ChessColor): boolean {
    const piece = this.positionTracker.getPieceOnSquare(square);
    if (!piece) return false;

    const matchesType = this.mapPieceType(piece.type) === pieceType;
    const matchesColor = color
      ? (piece.color === 'w' ? 'white' : 'black') === color
      : true;

    return matchesType && matchesColor;
  }

  /**
   * Get piece on a specific square
   */
  getPieceOnSquare(square: Square): Piece | null {
    return this.positionTracker.getPieceOnSquare(square);
  }

  /**
   * Get all pieces and their positions
   */
  getAllPiecesPositions() {
    return this.positionTracker.getAllPiecesPositions();
  }

  /**
   * Get pieces that are attacking a specific square
   */
  getAttackingPieces(square: Square, attackingColor?: ChessColor): Array<{
    square: Square;
    piece: Piece;
  }> {
    const chess = this.positionTracker.getChessInstance();
    const attackers: Array<{ square: Square; piece: Piece }> = [];

    const squares = this.getAllSquares();
    for (const fromSquare of squares) {
      const piece = chess.get(fromSquare);
      if (!piece) continue;

      if (attackingColor) {
        const pieceColor = piece.color === 'w' ? 'white' : 'black';
        if (pieceColor !== attackingColor) continue;
      }

      const moves = chess.moves({ square: fromSquare, verbose: true });
      if (moves.some((m) => m.to === square)) {
        attackers.push({ square: fromSquare, piece });
      }
    }

    return attackers;
  }

  // ============================================================================
  // Tactical Features
  // ============================================================================

  /**
   * Get all tactical features (pins, forks, hanging pieces, etc.)
   */
  getTacticalFeatures(): TacticalFeatures {
    return this.featureExtractor.extractTacticalFeatures();
  }

  /**
   * Get all pinned pieces
   */
  getPinnedPieces() {
    return this.featureExtractor.extractTacticalFeatures().pins;
  }

  /**
   * Get all hanging pieces
   */
  getHangingPieces() {
    return this.featureExtractor.extractTacticalFeatures().hangingPieces;
  }

  /**
   * Get all forks in the position
   */
  getForks() {
    return this.featureExtractor.extractTacticalFeatures().forks;
  }

  // ============================================================================
  // Position State
  // ============================================================================

  /**
   * Check if the position is check
   */
  isCheck(): boolean {
    return this.moveValidator.isCheck();
  }

  /**
   * Check if the position is checkmate
   */
  isCheckmate(): boolean {
    return this.moveValidator.isCheckmate();
  }

  /**
   * Check if the position is stalemate
   */
  isStalemate(): boolean {
    return this.moveValidator.isStalemate();
  }

  /**
   * Check if the position is a draw
   */
  isDraw(): boolean {
    return this.moveValidator.isDraw();
  }

  /**
   * Check if position is insufficient material
   */
  isInsufficientMaterial(): boolean {
    return this.moveValidator.isInsufficientMaterial();
  }

  /**
   * Check if position is threefold repetition
   */
  isThreefoldRepetition(): boolean {
    return this.moveValidator.isThreefoldRepetition();
  }

  // ============================================================================
  // Position Representation
  // ============================================================================

  /**
   * Get current position as FEN string
   */
  getFEN(): string {
    return this.positionTracker.getFEN();
  }

  /**
   * Load a position from FEN string
   */
  loadFEN(fen: string): void {
    this.positionTracker.loadFEN(fen);
    this.stateHistory.reset(fen);
    this.updateComponents();
  }

  /**
   * Get comprehensive position context for LLM
   * This is the main method for LLM integration
   */
  getPositionContext(): ComprehensivePositionContext {
    return this.positionSerializer.getComprehensiveContext();
  }

  /**
   * Get position as ASCII board
   */
  getBoardASCII(): string {
    return this.positionSerializer.getBoardASCII();
  }

  /**
   * Get position as natural language description
   */
  getPositionNaturalLanguage(): string {
    return this.positionSerializer.getPositionNaturalLanguage();
  }

  /**
   * Get complete context for LLM prompting
   */
  getContextForLLM() {
    return this.positionSerializer.getContextForLLM();
  }

  // ============================================================================
  // Move History
  // ============================================================================

  /**
   * Get move history as array of SAN strings
   */
  getMoveHistory(): string[] {
    return this.stateHistory.getMoveHistory();
  }

  /**
   * Get formatted move history (e.g., "1.e4 e5 2.Nf3 Nc6")
   */
  getMoveHistoryFormatted(): string {
    return this.stateHistory.getMoveHistoryFormatted();
  }

  /**
   * Go to a specific move number
   */
  goToMove(moveNumber: number): boolean {
    const success = this.stateHistory.goToMove(moveNumber);
    if (success) {
      const fen = this.stateHistory.getCurrentFEN();
      this.positionTracker.loadFEN(fen);
      this.updateComponents();
    }
    return success;
  }

  /**
   * Go to the start of the game
   */
  goToStart(): void {
    this.stateHistory.goToStart();
    const fen = this.stateHistory.getCurrentFEN();
    this.positionTracker.loadFEN(fen);
    this.updateComponents();
  }

  /**
   * Go to the end of the game
   */
  goToEnd(): void {
    this.stateHistory.goToEnd();
    const fen = this.stateHistory.getCurrentFEN();
    this.positionTracker.loadFEN(fen);
    this.updateComponents();
  }

  /**
   * Start a new variation
   */
  startVariation(): string {
    return this.stateHistory.startVariation();
  }

  /**
   * Add a comment to the current position
   */
  addComment(comment: string): void {
    this.stateHistory.addComment(comment);
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Reset the board to starting position
   */
  reset(): void {
    this.loadFEN(new Chess().fen());
  }

  /**
   * Evaluate move quality (simplified implementation)
   */
  evaluateMoveQuality(move: string): MoveQuality {
    // This is a simplified implementation
    // In a full implementation, you would use Stockfish evaluation
    const validation = this.validateMoveSAN(move);

    if (!validation.valid) {
      return {
        classification: 'unknown',
        reason: 'Illegal move',
      };
    }

    return {
      classification: 'unknown',
      reason: 'Evaluation requires engine analysis',
    };
  }

  /**
   * Get the Chess.js instance (for advanced use cases)
   */
  getChessInstance(): Chess {
    return this.positionTracker.getChessInstance();
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Update all components after a position change
   */
  private updateComponents(): void {
    const chess = this.positionTracker.getChessInstance();
    this.moveValidator = new MoveValidator(chess);
    this.featureExtractor = new FeatureExtractor(chess);
    this.positionSerializer = new PositionSerializer(
      this.positionTracker,
      this.moveValidator,
      this.featureExtractor
    );
  }

  /**
   * Get all valid squares
   */
  private getAllSquares(): Square[] {
    const squares: Square[] = [];
    for (let file = 0; file < 8; file++) {
      for (let rank = 0; rank < 8; rank++) {
        squares.push(`${'abcdefgh'[file]}${rank + 1}` as Square);
      }
    }
    return squares;
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
}

// Export all types and errors for external use
export * from './types';
export * from './errors';
