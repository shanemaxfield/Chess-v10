/**
 * BoardController - Core module for animating chess moves and controlling board playback
 *
 * Features:
 * - Accept move sequences in multiple formats (PGN, UCI, SAN)
 * - Animate moves with configurable speed
 * - Play, pause, step forward/backward controls
 * - Auto-play with pause at specified moves
 * - Highlight key squares and draw arrows
 */

import { Chess } from 'chess.js';

export type MoveFormat = 'san' | 'uci' | 'pgn';

export interface MoveStep {
  from: string;
  to: string;
  san: string;
  fen: string;
  moveNumber: number;
  isWhiteMove: boolean;
  promotion?: string;
}

export interface AnimationConfig {
  speed: 'slow' | 'medium' | 'fast' | 'instant';
  delayMs?: number; // Custom delay in milliseconds
  pauseAtMove?: number; // Pause after this move number (1-indexed)
  highlightSquares?: string[]; // Squares to highlight
  arrows?: Array<{ from: string; to: string; color: string }>; // Arrows to draw
}

export interface PlaybackState {
  isPlaying: boolean;
  isPaused: boolean;
  currentStep: number;
  totalSteps: number;
  canStepForward: boolean;
  canStepBackward: boolean;
}

type PlaybackCallback = (step: MoveStep, state: PlaybackState) => void;

export class BoardController {
  private chess: Chess;
  private moveSteps: MoveStep[] = [];
  private currentStepIndex: number = -1;
  private isPlaying: boolean = false;
  private isPaused: boolean = false;
  private playbackTimer: NodeJS.Timeout | null = null;
  private onStepCallback?: PlaybackCallback;
  private animationConfig: AnimationConfig = { speed: 'medium' };

  constructor(startingFen?: string) {
    this.chess = new Chess(startingFen);
  }

  /**
   * Load a sequence of moves in various formats
   */
  loadMoveSequence(moves: string[], format: MoveFormat = 'san'): boolean {
    this.reset();
    const tempChess = new Chess();
    this.moveSteps = [];

    for (let i = 0; i < moves.length; i++) {
      const move = moves[i].trim();

      try {
        let chessMove;

        if (format === 'san') {
          chessMove = tempChess.move(move);
        } else if (format === 'uci') {
          // UCI format: e2e4, e7e5, etc.
          const from = move.slice(0, 2);
          const to = move.slice(2, 4);
          const promotion = move.length === 5 ? move[4] : undefined;
          chessMove = tempChess.move({ from, to, promotion });
        } else if (format === 'pgn') {
          // PGN format parsing (simplified)
          tempChess.loadPgn(moves.join(' '));
          const history = tempChess.history({ verbose: true });
          history.forEach((move, idx) => {
            const fullMoveNumber = Math.floor(idx / 2) + 1;
            this.moveSteps.push({
              from: move.from,
              to: move.to,
              san: move.san,
              fen: move.after || '',
              moveNumber: fullMoveNumber,
              isWhiteMove: move.color === 'w',
              promotion: move.promotion,
            });
          });
          return true;
        }

        if (!chessMove) {
          console.error(`Invalid move: ${move}`);
          return false;
        }

        const fullMoveNumber = Math.floor(tempChess.moveNumber()) + (tempChess.turn() === 'b' ? 0 : -1);

        this.moveSteps.push({
          from: chessMove.from,
          to: chessMove.to,
          san: chessMove.san,
          fen: tempChess.fen(),
          moveNumber: fullMoveNumber,
          isWhiteMove: chessMove.color === 'w',
          promotion: chessMove.promotion,
        });
      } catch (error) {
        console.error(`Error loading move ${move}:`, error);
        return false;
      }
    }

    return true;
  }

  /**
   * Load moves from PGN string
   */
  loadPgn(pgn: string): boolean {
    this.reset();
    const tempChess = new Chess();

    try {
      tempChess.loadPgn(pgn);
      const history = tempChess.history({ verbose: true });
      this.moveSteps = [];

      history.forEach((move, idx) => {
        const fullMoveNumber = Math.floor(idx / 2) + 1;
        this.moveSteps.push({
          from: move.from,
          to: move.to,
          san: move.san,
          fen: move.after || '',
          moveNumber: fullMoveNumber,
          isWhiteMove: move.color === 'w',
          promotion: move.promotion,
        });
      });

      return true;
    } catch (error) {
      console.error('Error loading PGN:', error);
      return false;
    }
  }

  /**
   * Configure animation settings
   */
  setAnimationConfig(config: Partial<AnimationConfig>): void {
    this.animationConfig = { ...this.animationConfig, ...config };
  }

  /**
   * Get delay in milliseconds based on speed setting
   */
  private getDelayMs(): number {
    if (this.animationConfig.delayMs !== undefined) {
      return this.animationConfig.delayMs;
    }

    switch (this.animationConfig.speed) {
      case 'slow': return 2000;
      case 'medium': return 1000;
      case 'fast': return 500;
      case 'instant': return 0;
      default: return 1000;
    }
  }

  /**
   * Set callback for each animation step
   */
  onStep(callback: PlaybackCallback): void {
    this.onStepCallback = callback;
  }

  /**
   * Start playing the move sequence
   */
  async play(): Promise<void> {
    if (this.isPlaying) return;

    this.isPlaying = true;
    this.isPaused = false;

    // If we're at the end, start from the beginning
    if (this.currentStepIndex >= this.moveSteps.length - 1) {
      this.currentStepIndex = -1;
    }

    await this.playSequence();
  }

  /**
   * Internal method to play the sequence
   */
  private async playSequence(): Promise<void> {
    while (this.isPlaying && this.currentStepIndex < this.moveSteps.length - 1) {
      await this.stepForward();

      // Check if we should pause at this move
      const currentMove = this.moveSteps[this.currentStepIndex];
      if (this.animationConfig.pauseAtMove === currentMove.moveNumber) {
        this.pause();
        break;
      }

      // Wait for the configured delay
      const delay = this.getDelayMs();
      if (delay > 0) {
        await new Promise(resolve => {
          this.playbackTimer = setTimeout(resolve, delay);
        });
      }
    }

    if (this.currentStepIndex >= this.moveSteps.length - 1) {
      this.stop();
    }
  }

  /**
   * Pause playback
   */
  pause(): void {
    this.isPaused = true;
    this.isPlaying = false;

    if (this.playbackTimer) {
      clearTimeout(this.playbackTimer);
      this.playbackTimer = null;
    }
  }

  /**
   * Stop playback and reset to beginning
   */
  stop(): void {
    this.isPlaying = false;
    this.isPaused = false;

    if (this.playbackTimer) {
      clearTimeout(this.playbackTimer);
      this.playbackTimer = null;
    }
  }

  /**
   * Resume playback from pause
   */
  resume(): void {
    if (this.isPaused) {
      this.isPaused = false;
      this.play();
    }
  }

  /**
   * Step forward one move
   */
  async stepForward(): Promise<boolean> {
    if (this.currentStepIndex >= this.moveSteps.length - 1) {
      return false;
    }

    this.currentStepIndex++;
    const step = this.moveSteps[this.currentStepIndex];

    // Update internal chess instance
    this.chess.load(step.fen);

    // Trigger callback
    if (this.onStepCallback) {
      this.onStepCallback(step, this.getPlaybackState());
    }

    return true;
  }

  /**
   * Step backward one move
   */
  async stepBackward(): Promise<boolean> {
    if (this.currentStepIndex < 0) {
      return false;
    }

    this.currentStepIndex--;

    if (this.currentStepIndex >= 0) {
      const step = this.moveSteps[this.currentStepIndex];
      this.chess.load(step.fen);

      if (this.onStepCallback) {
        this.onStepCallback(step, this.getPlaybackState());
      }
    } else {
      // Reset to initial position
      this.chess.reset();

      if (this.onStepCallback) {
        this.onStepCallback({
          from: '',
          to: '',
          san: '',
          fen: this.chess.fen(),
          moveNumber: 0,
          isWhiteMove: true,
        }, this.getPlaybackState());
      }
    }

    return true;
  }

  /**
   * Jump to a specific move index
   */
  jumpToMove(index: number): boolean {
    if (index < 0 || index >= this.moveSteps.length) {
      return false;
    }

    this.stop();
    this.currentStepIndex = index;
    const step = this.moveSteps[index];
    this.chess.load(step.fen);

    if (this.onStepCallback) {
      this.onStepCallback(step, this.getPlaybackState());
    }

    return true;
  }

  /**
   * Reset to initial position
   */
  reset(): void {
    this.stop();
    this.currentStepIndex = -1;
    this.moveSteps = [];
    this.chess.reset();
  }

  /**
   * Get current playback state
   */
  getPlaybackState(): PlaybackState {
    return {
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      currentStep: this.currentStepIndex,
      totalSteps: this.moveSteps.length,
      canStepForward: this.currentStepIndex < this.moveSteps.length - 1,
      canStepBackward: this.currentStepIndex >= 0,
    };
  }

  /**
   * Get all move steps
   */
  getMoveSteps(): MoveStep[] {
    return this.moveSteps;
  }

  /**
   * Get current step
   */
  getCurrentStep(): MoveStep | null {
    if (this.currentStepIndex < 0 || this.currentStepIndex >= this.moveSteps.length) {
      return null;
    }
    return this.moveSteps[this.currentStepIndex];
  }

  /**
   * Get current FEN
   */
  getCurrentFen(): string {
    return this.chess.fen();
  }

  /**
   * Get move count
   */
  getMoveCount(): number {
    return this.moveSteps.length;
  }

  /**
   * Check if a position is valid
   */
  isValidPosition(): boolean {
    return this.chess.isGameOver() === false || this.chess.inCheck();
  }
}
