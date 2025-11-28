/**
 * FeatureExtractor - Extracts all tactical and positional features
 * Pre-calculates everything to prevent LLM calculation errors
 */

import { Chess, Square, Piece } from 'chess.js';
import {
  TacticalFeatures,
  PositionalFeatures,
  MaterialBalance,
  SquareControl,
  Pin,
  Fork,
  Attack,
  HangingPiece,
  PawnStructure,
  KingSafety,
  ChessColor,
  ChessPiece,
} from './types';

export class FeatureExtractor {
  constructor(private chess: Chess) {}

  /**
   * Extract all tactical features from current position
   */
  extractTacticalFeatures(): TacticalFeatures {
    return {
      pins: this.findPins(),
      forks: this.findForks(),
      skewers: this.findSkewers(),
      hangingPieces: this.findHangingPieces(),
      discoveredAttacks: this.findDiscoveredAttacks(),
      attacks: this.findAllAttacks(),
    };
  }

  /**
   * Extract all positional features from current position
   */
  extractPositionalFeatures(): PositionalFeatures {
    return {
      kingSafety: this.analyzeKingSafety(),
      centerControl: this.analyzeCenterControl(),
      development: this.analyzeDevelopment(),
      pawnStructure: this.analyzePawnStructure(),
      openFiles: this.findOpenFiles(),
      openDiagonals: this.findOpenDiagonals(),
    };
  }

  /**
   * Calculate material balance
   */
  calculateMaterialBalance(): MaterialBalance {
    const pieceValues: Record<string, number> = {
      p: 1,
      n: 3,
      b: 3,
      r: 5,
      q: 9,
      k: 0,
    };

    let whitePoints = 0;
    let blackPoints = 0;

    const pieceCounts = {
      white: { king: 0, queen: 0, rook: 0, bishop: 0, knight: 0, pawn: 0 },
      black: { king: 0, queen: 0, rook: 0, bishop: 0, knight: 0, pawn: 0 },
    };

    const squares = this.getAllSquares();
    for (const square of squares) {
      const piece = this.chess.get(square);
      if (piece) {
        const value = pieceValues[piece.type] || 0;
        const type = this.mapPieceType(piece.type);

        if (piece.color === 'w') {
          whitePoints += value;
          pieceCounts.white[type]++;
        } else {
          blackPoints += value;
          pieceCounts.black[type]++;
        }
      }
    }

    let balance = 'Equal material';
    const diff = whitePoints - blackPoints;
    if (diff > 0) {
      balance = `White is up ${diff} points of material`;
    } else if (diff < 0) {
      balance = `Black is up ${Math.abs(diff)} points of material`;
    }

    return {
      balance,
      whitePoints,
      blackPoints,
      pieceCounts,
    };
  }

  /**
   * Calculate square control for both sides
   */
  calculateSquareControl(): SquareControl {
    const whiteControls: Square[] = [];
    const blackControls: Square[] = [];
    const contested: Square[] = [];

    const squares = this.getAllSquares();
    for (const square of squares) {
      const whiteAttackers = this.getAttackers(square, 'w');
      const blackAttackers = this.getAttackers(square, 'b');

      if (whiteAttackers.length > 0 && blackAttackers.length === 0) {
        whiteControls.push(square);
      } else if (blackAttackers.length > 0 && whiteAttackers.length === 0) {
        blackControls.push(square);
      } else if (whiteAttackers.length > 0 && blackAttackers.length > 0) {
        contested.push(square);
      }
    }

    return { whiteControls, blackControls, contested };
  }

  /**
   * Find all pins in the position
   */
  private findPins(): Pin[] {
    const pins: Pin[] = [];

    // Check for pins by each side
    for (const color of ['w', 'b'] as const) {
      const enemyColor = color === 'w' ? 'b' : 'w';
      const king = this.findKing(enemyColor);

      if (!king) continue;

      // Find all sliding pieces that could pin
      const slidingPieces = this.findSlidingPieces(color);

      for (const slider of slidingPieces) {
        const pinned = this.checkForPin(slider.square, king, color, enemyColor);
        if (pinned) {
          pins.push(pinned);
        }
      }
    }

    return pins;
  }

  /**
   * Find all forks in the position
   */
  private findForks(): Fork[] {
    const forks: Fork[] = [];

    const squares = this.getAllSquares();
    for (const square of squares) {
      const piece = this.chess.get(square);
      if (!piece) continue;

      const attacks = this.getAttackedSquares(square, piece);
      const valuableTargets = attacks.filter((target) => {
        const targetPiece = this.chess.get(target);
        return targetPiece && targetPiece.color !== piece.color && this.isPieceValuable(targetPiece.type);
      });

      if (valuableTargets.length >= 2) {
        forks.push({
          forkingPiece: {
            square,
            type: this.mapPieceType(piece.type),
            color: piece.color === 'w' ? 'white' : 'black',
          },
          forkedPieces: valuableTargets.map((target) => {
            const targetPiece = this.chess.get(target)!;
            return {
              square: target,
              type: this.mapPieceType(targetPiece.type),
              color: targetPiece.color === 'w' ? 'white' : 'black',
            };
          }),
        });
      }
    }

    return forks;
  }

  /**
   * Find all skewers in the position
   */
  private findSkewers(): TacticalFeatures['skewers'] {
    const skewers: TacticalFeatures['skewers'] = [];

    const squares = this.getAllSquares();
    for (const square of squares) {
      const piece = this.chess.get(square);
      if (!piece || !this.isSlidingPiece(piece.type)) continue;

      const directions = this.getSlidingDirections(piece.type);
      for (const dir of directions) {
        const skewer = this.checkForSkewer(square, dir, piece.color);
        if (skewer) {
          skewers.push({
            attackingPiece: {
              square,
              type: this.mapPieceType(piece.type),
              color: piece.color === 'w' ? 'white' : 'black',
            },
            ...skewer,
          });
        }
      }
    }

    return skewers;
  }

  /**
   * Find all hanging (undefended or insufficiently defended) pieces
   */
  private findHangingPieces(): HangingPiece[] {
    const hanging: HangingPiece[] = [];

    const squares = this.getAllSquares();
    for (const square of squares) {
      const piece = this.chess.get(square);
      if (!piece) continue;

      const attackers = this.getAttackers(square, piece.color === 'w' ? 'b' : 'w');
      const defenders = this.getAttackers(square, piece.color);

      // Hanging if attacked and not defended
      if (attackers.length > 0 && defenders.length === 0) {
        hanging.push({
          square,
          type: this.mapPieceType(piece.type),
          color: piece.color === 'w' ? 'white' : 'black',
          description: `${this.mapPieceType(piece.type)} on ${square} is undefended`,
          attackers: attackers.length,
          defenders: 0,
        });
      }
      // Insufficiently defended if more attackers than defenders
      else if (attackers.length > defenders.length && piece.type !== 'k') {
        hanging.push({
          square,
          type: this.mapPieceType(piece.type),
          color: piece.color === 'w' ? 'white' : 'black',
          description: `${this.mapPieceType(piece.type)} on ${square} is insufficiently defended (${attackers.length} attackers vs ${defenders.length} defenders)`,
          attackers: attackers.length,
          defenders: defenders.length,
        });
      }
    }

    return hanging;
  }

  /**
   * Find all discovered attack patterns
   */
  private findDiscoveredAttacks(): TacticalFeatures['discoveredAttacks'] {
    // Simplified implementation - full implementation would require move generation
    return [];
  }

  /**
   * Find all attacks in the position
   */
  private findAllAttacks(): Attack[] {
    const attacks: Attack[] = [];

    const squares = this.getAllSquares();
    for (const square of squares) {
      const piece = this.chess.get(square);
      if (!piece) continue;

      const targets = this.getAttackedSquares(square, piece).filter((target) => {
        const targetPiece = this.chess.get(target);
        return targetPiece && targetPiece.color !== piece.color;
      });

      if (targets.length > 0) {
        const pieceName = `${this.getPieceSymbol(piece)}${square}`;
        attacks.push({
          piece: pieceName,
          square,
          targets,
          description: `${pieceName} attacks ${targets.join(', ')}`,
        });
      }
    }

    return attacks;
  }

  /**
   * Analyze king safety for both sides
   */
  private analyzeKingSafety(): KingSafety {
    const whiteKing = this.findKing('w');
    const blackKing = this.findKing('b');

    return {
      white: this.analyzeKingSafetyForColor(whiteKing, 'w'),
      black: this.analyzeKingSafetyForColor(blackKing, 'b'),
    };
  }

  /**
   * Analyze king safety for a specific color
   */
  private analyzeKingSafetyForColor(
    kingSquare: Square | null,
    color: 'w' | 'b'
  ): KingSafety['white'] | KingSafety['black'] {
    if (!kingSquare) {
      return {
        status: 'King not found',
        pawnShield: [],
        attackersNearKing: 0,
        escapeSquares: [],
      };
    }

    const pawnShield = this.getPawnShield(kingSquare, color);
    const attackersNearKing = this.getAttackersNearKing(kingSquare, color);
    const escapeSquares = this.getKingEscapeSquares(kingSquare, color);

    let status = 'King is safe';
    if (this.chess.isCheck()) {
      status = 'King is in check';
    } else if (attackersNearKing > 2) {
      status = 'King is under attack';
    } else if (pawnShield.length < 2) {
      status = 'King has weak pawn shield';
    }

    return {
      status,
      pawnShield,
      attackersNearKing,
      escapeSquares,
    };
  }

  /**
   * Analyze center control
   */
  private analyzeCenterControl(): string {
    const centerSquares: Square[] = ['d4', 'e4', 'd5', 'e5'];
    let whiteControl = 0;
    let blackControl = 0;

    for (const square of centerSquares) {
      const piece = this.chess.get(square);
      if (piece) {
        if (piece.color === 'w') whiteControl++;
        else blackControl++;
      }

      const whiteAttackers = this.getAttackers(square, 'w').length;
      const blackAttackers = this.getAttackers(square, 'b').length;

      whiteControl += whiteAttackers * 0.5;
      blackControl += blackAttackers * 0.5;
    }

    if (whiteControl > blackControl + 1) {
      return 'White has strong center control';
    } else if (blackControl > whiteControl + 1) {
      return 'Black has strong center control';
    } else {
      return 'Center control is balanced';
    }
  }

  /**
   * Analyze piece development
   */
  private analyzeDevelopment(): string {
    const whiteDevelopment = this.countDevelopedPieces('w');
    const blackDevelopment = this.countDevelopedPieces('b');

    return `White: ${whiteDevelopment} pieces developed, Black: ${blackDevelopment} pieces developed`;
  }

  /**
   * Analyze pawn structure
   */
  private analyzePawnStructure(): PawnStructure {
    return {
      chains: this.findPawnChains(),
      isolatedPawns: this.findIsolatedPawns(),
      doubledPawns: this.findDoubledPawns(),
      passedPawns: this.findPassedPawns(),
    };
  }

  /**
   * Find open files
   */
  private findOpenFiles(): PositionalFeatures['openFiles'] {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const openFiles: PositionalFeatures['openFiles'] = [];

    for (const file of files) {
      let hasPawns = false;
      let whiteRookOrQueen = false;
      let blackRookOrQueen = false;

      for (let rank = 1; rank <= 8; rank++) {
        const square = `${file}${rank}` as Square;
        const piece = this.chess.get(square);

        if (piece?.type === 'p') {
          hasPawns = true;
        }
        if (piece && (piece.type === 'r' || piece.type === 'q')) {
          if (piece.color === 'w') whiteRookOrQueen = true;
          else blackRookOrQueen = true;
        }
      }

      if (!hasPawns) {
        let controlledBy: ChessColor | 'contested' = 'contested';
        if (whiteRookOrQueen && !blackRookOrQueen) {
          controlledBy = 'white';
        } else if (blackRookOrQueen && !whiteRookOrQueen) {
          controlledBy = 'black';
        }

        openFiles.push({ file, controlledBy });
      }
    }

    return openFiles;
  }

  /**
   * Find open diagonals
   */
  private findOpenDiagonals(): PositionalFeatures['openDiagonals'] {
    // Simplified implementation
    return [];
  }

  // Helper methods

  private getAllSquares(): Square[] {
    const squares: Square[] = [];
    for (let file = 0; file < 8; file++) {
      for (let rank = 0; rank < 8; rank++) {
        squares.push(`${'abcdefgh'[file]}${rank + 1}` as Square);
      }
    }
    return squares;
  }

  private findKing(color: 'w' | 'b'): Square | null {
    const squares = this.getAllSquares();
    for (const square of squares) {
      const piece = this.chess.get(square);
      if (piece?.type === 'k' && piece.color === color) {
        return square;
      }
    }
    return null;
  }

  private findSlidingPieces(color: 'w' | 'b'): Array<{ square: Square; type: string }> {
    const pieces: Array<{ square: Square; type: string }> = [];
    const squares = this.getAllSquares();

    for (const square of squares) {
      const piece = this.chess.get(square);
      if (piece?.color === color && this.isSlidingPiece(piece.type)) {
        pieces.push({ square, type: piece.type });
      }
    }

    return pieces;
  }

  private isSlidingPiece(type: string): boolean {
    return type === 'b' || type === 'r' || type === 'q';
  }

  private isPieceValuable(type: string): boolean {
    return type !== 'p'; // Everything except pawns is valuable for forks
  }

  private getAttackers(square: Square, color: 'w' | 'b'): Square[] {
    const attackers: Square[] = [];
    const squares = this.getAllSquares();

    for (const fromSquare of squares) {
      const piece = this.chess.get(fromSquare);
      if (piece?.color === color) {
        const attacks = this.getAttackedSquares(fromSquare, piece);
        if (attacks.includes(square)) {
          attackers.push(fromSquare);
        }
      }
    }

    return attackers;
  }

  private getAttackedSquares(square: Square, piece: Piece): Square[] {
    // Get all squares this piece attacks
    const moves = this.chess.moves({ square, verbose: true });
    const attacked = moves.map((m) => m.to);

    // For pawns, also include diagonal attacks even if no piece there
    if (piece.type === 'p') {
      const file = square.charCodeAt(0) - 'a'.charCodeAt(0);
      const rank = parseInt(square[1]) - 1;
      const direction = piece.color === 'w' ? 1 : -1;

      const leftDiag = this.coordsToSquare(file - 1, rank + direction);
      const rightDiag = this.coordsToSquare(file + 1, rank + direction);

      if (leftDiag && !attacked.includes(leftDiag)) attacked.push(leftDiag);
      if (rightDiag && !attacked.includes(rightDiag)) attacked.push(rightDiag);
    }

    return attacked;
  }

  private checkForPin(
    sliderSquare: Square,
    kingSquare: Square,
    sliderColor: 'w' | 'b',
    kingColor: 'w' | 'b'
  ): Pin | null {
    // Check if there's exactly one piece between slider and king on the same line
    const path = this.getPathBetween(sliderSquare, kingSquare);
    if (path.length === 0) return null;

    const piecesOnPath = path.filter((sq) => this.chess.get(sq) !== null);
    if (piecesOnPath.length !== 1) return null;

    const pinnedSquare = piecesOnPath[0];
    const pinnedPiece = this.chess.get(pinnedSquare);
    if (!pinnedPiece || pinnedPiece.color !== kingColor) return null;

    const slider = this.chess.get(sliderSquare)!;

    return {
      pinnedPiece: {
        square: pinnedSquare,
        type: this.mapPieceType(pinnedPiece.type),
        color: kingColor === 'w' ? 'white' : 'black',
      },
      pinningPiece: {
        square: sliderSquare,
        type: this.mapPieceType(slider.type),
        color: sliderColor === 'w' ? 'white' : 'black',
      },
      pinnedTo: {
        square: kingSquare,
        type: 'king',
        color: kingColor === 'w' ? 'white' : 'black',
      },
      type: pinnedPiece.type === 'k' ? 'absolute' : 'absolute',
    };
  }

  private checkForSkewer(
    square: Square,
    direction: { file: number; rank: number },
    color: 'w' | 'b'
  ): { frontPiece: any; backPiece: any } | null {
    // Simplified - would need full implementation
    return null;
  }

  private getSlidingDirections(type: string): Array<{ file: number; rank: number }> {
    if (type === 'r') {
      return [
        { file: 1, rank: 0 },
        { file: -1, rank: 0 },
        { file: 0, rank: 1 },
        { file: 0, rank: -1 },
      ];
    } else if (type === 'b') {
      return [
        { file: 1, rank: 1 },
        { file: 1, rank: -1 },
        { file: -1, rank: 1 },
        { file: -1, rank: -1 },
      ];
    } else if (type === 'q') {
      return [
        { file: 1, rank: 0 },
        { file: -1, rank: 0 },
        { file: 0, rank: 1 },
        { file: 0, rank: -1 },
        { file: 1, rank: 1 },
        { file: 1, rank: -1 },
        { file: -1, rank: 1 },
        { file: -1, rank: -1 },
      ];
    }
    return [];
  }

  private getPathBetween(from: Square, to: Square): Square[] {
    const path: Square[] = [];
    const fromFile = from.charCodeAt(0) - 'a'.charCodeAt(0);
    const fromRank = parseInt(from[1]) - 1;
    const toFile = to.charCodeAt(0) - 'a'.charCodeAt(0);
    const toRank = parseInt(to[1]) - 1;

    const fileDir = Math.sign(toFile - fromFile);
    const rankDir = Math.sign(toRank - fromRank);

    // Only works for straight lines or diagonals
    if (fileDir !== 0 && rankDir !== 0 && Math.abs(toFile - fromFile) !== Math.abs(toRank - fromRank)) {
      return [];
    }

    let currentFile = fromFile + fileDir;
    let currentRank = fromRank + rankDir;

    while (currentFile !== toFile || currentRank !== toRank) {
      const square = this.coordsToSquare(currentFile, currentRank);
      if (square) path.push(square);

      currentFile += fileDir;
      currentRank += rankDir;

      if (Math.abs(currentFile - fromFile) > 7 || Math.abs(currentRank - fromRank) > 7) {
        break;
      }
    }

    return path;
  }

  private getPawnShield(kingSquare: Square, color: 'w' | 'b'): Square[] {
    const shield: Square[] = [];
    const file = kingSquare.charCodeAt(0) - 'a'.charCodeAt(0);
    const rank = parseInt(kingSquare[1]) - 1;
    const direction = color === 'w' ? 1 : -1;

    for (let f = file - 1; f <= file + 1; f++) {
      const shieldSquare = this.coordsToSquare(f, rank + direction);
      if (shieldSquare) {
        const piece = this.chess.get(shieldSquare);
        if (piece?.type === 'p' && piece.color === color) {
          shield.push(shieldSquare);
        }
      }
    }

    return shield;
  }

  private getAttackersNearKing(kingSquare: Square, color: 'w' | 'b'): number {
    const enemyColor = color === 'w' ? 'b' : 'w';
    const file = kingSquare.charCodeAt(0) - 'a'.charCodeAt(0);
    const rank = parseInt(kingSquare[1]) - 1;

    let attackers = 0;
    for (let f = file - 2; f <= file + 2; f++) {
      for (let r = rank - 2; r <= rank + 2; r++) {
        const square = this.coordsToSquare(f, r);
        if (square) {
          const piece = this.chess.get(square);
          if (piece?.color === enemyColor) {
            attackers++;
          }
        }
      }
    }

    return attackers;
  }

  private getKingEscapeSquares(kingSquare: Square, color: 'w' | 'b'): Square[] {
    const file = kingSquare.charCodeAt(0) - 'a'.charCodeAt(0);
    const rank = parseInt(kingSquare[1]) - 1;
    const escapeSquares: Square[] = [];

    for (let f = file - 1; f <= file + 1; f++) {
      for (let r = rank - 1; r <= rank + 1; r++) {
        if (f === file && r === rank) continue;
        const square = this.coordsToSquare(f, r);
        if (square) {
          const piece = this.chess.get(square);
          if (!piece || piece.color !== color) {
            escapeSquares.push(square);
          }
        }
      }
    }

    return escapeSquares;
  }

  private countDevelopedPieces(color: 'w' | 'b'): number {
    let developed = 0;
    const backRank = color === 'w' ? '1' : '8';

    const squares = this.getAllSquares();
    for (const square of squares) {
      const piece = this.chess.get(square);
      if (piece?.color === color && (piece.type === 'n' || piece.type === 'b' || piece.type === 'q')) {
        if (!square.includes(backRank)) {
          developed++;
        }
      }
    }

    return developed;
  }

  private findPawnChains(): PawnStructure['chains'] {
    // Simplified implementation
    return [];
  }

  private findIsolatedPawns(): PawnStructure['isolatedPawns'] {
    const isolated: PawnStructure['isolatedPawns'] = [];
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const leftFile = i > 0 ? files[i - 1] : null;
      const rightFile = i < 7 ? files[i + 1] : null;

      for (let rank = 1; rank <= 8; rank++) {
        const square = `${file}${rank}` as Square;
        const piece = this.chess.get(square);

        if (piece?.type === 'p') {
          let hasNeighbor = false;

          if (leftFile) {
            for (let r = 1; r <= 8; r++) {
              const neighborSquare = `${leftFile}${r}` as Square;
              const neighbor = this.chess.get(neighborSquare);
              if (neighbor?.type === 'p' && neighbor.color === piece.color) {
                hasNeighbor = true;
                break;
              }
            }
          }

          if (rightFile && !hasNeighbor) {
            for (let r = 1; r <= 8; r++) {
              const neighborSquare = `${rightFile}${r}` as Square;
              const neighbor = this.chess.get(neighborSquare);
              if (neighbor?.type === 'p' && neighbor.color === piece.color) {
                hasNeighbor = true;
                break;
              }
            }
          }

          if (!hasNeighbor) {
            isolated.push({
              square,
              color: piece.color === 'w' ? 'white' : 'black',
            });
          }
        }
      }
    }

    return isolated;
  }

  private findDoubledPawns(): PawnStructure['doubledPawns'] {
    const doubled: PawnStructure['doubledPawns'] = [];
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

    for (const file of files) {
      const whitePawns: Square[] = [];
      const blackPawns: Square[] = [];

      for (let rank = 1; rank <= 8; rank++) {
        const square = `${file}${rank}` as Square;
        const piece = this.chess.get(square);

        if (piece?.type === 'p') {
          if (piece.color === 'w') whitePawns.push(square);
          else blackPawns.push(square);
        }
      }

      if (whitePawns.length >= 2) {
        doubled.push({ squares: whitePawns, color: 'white' });
      }
      if (blackPawns.length >= 2) {
        doubled.push({ squares: blackPawns, color: 'black' });
      }
    }

    return doubled;
  }

  private findPassedPawns(): PawnStructure['passedPawns'] {
    // Simplified implementation
    return [];
  }

  private coordsToSquare(file: number, rank: number): Square | null {
    if (file < 0 || file > 7 || rank < 0 || rank > 7) return null;
    return `${'abcdefgh'[file]}${rank + 1}` as Square;
  }

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

  private getPieceSymbol(piece: Piece): string {
    const symbols: Record<string, string> = {
      k: 'K',
      q: 'Q',
      r: 'R',
      b: 'B',
      n: 'N',
      p: '',
    };
    return symbols[piece.type] || '';
  }
}
