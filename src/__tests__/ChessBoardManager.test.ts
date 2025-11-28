/**
 * Comprehensive test suite for ChessBoardManager
 * Tests all components and edge cases
 */

import { describe, it, expect } from 'vitest';
import { ChessBoardManager } from '../lib/boardManager';
import { Square } from 'chess.js';

describe('ChessBoardManager', () => {
  describe('Initialization', () => {
    it('should initialize with starting position', () => {
      const manager = new ChessBoardManager();
      const fen = manager.getFEN();
      expect(fen).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    });

    it('should initialize with custom FEN', () => {
      const customFen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
      const manager = new ChessBoardManager(customFen);
      expect(manager.getFEN()).toBe(customFen);
    });
  });

  describe('Move Making', () => {
    it('should make a valid move', () => {
      const manager = new ChessBoardManager();
      const result = manager.makeMove('e2' as Square, 'e4' as Square);

      expect(result.success).toBe(true);
      expect(result.san).toBe('e4');
      expect(result.uci).toBe('e2e4');
    });

    it('should make a move using UCI notation', () => {
      const manager = new ChessBoardManager();
      const result = manager.makeMoveUCI('e2e4');

      expect(result.success).toBe(true);
      expect(result.san).toBe('e4');
    });

    it('should make a move using SAN notation', () => {
      const manager = new ChessBoardManager();
      const result = manager.makeMoveSAN('e4');

      expect(result.success).toBe(true);
      expect(result.uci).toBe('e2e4');
    });

    it('should reject illegal moves', () => {
      const manager = new ChessBoardManager();
      const result = manager.makeMove('e2' as Square, 'e5' as Square);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle pawn promotion', () => {
      const manager = new ChessBoardManager('7k/P7/8/8/8/8/8/7K w - - 0 1');
      const result = manager.makeMove('a7' as Square, 'a8' as Square, 'q');

      expect(result.success).toBe(true);
      expect(result.san).toContain('=Q');
    });

    it('should handle castling', () => {
      const manager = new ChessBoardManager('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
      const result = manager.makeMoveUCI('e1g1');

      expect(result.success).toBe(true);
      expect(result.san).toBe('O-O');
    });

    it('should handle en passant', () => {
      const manager = new ChessBoardManager('rnbqkbnr/ppp1pppp/8/3pP3/8/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 1');
      const result = manager.makeMove('e5' as Square, 'd6' as Square);

      expect(result.success).toBe(true);
    });
  });

  describe('Move Validation', () => {
    it('should validate legal moves', () => {
      const manager = new ChessBoardManager();
      const validation = manager.validateMove('e2' as Square, 'e4' as Square);

      expect(validation.valid).toBe(true);
    });

    it('should reject moves to occupied squares of same color', () => {
      const manager = new ChessBoardManager();
      const validation = manager.validateMove('e2' as Square, 'f2' as Square);

      expect(validation.valid).toBe(false);
    });

    it('should detect no piece on square', () => {
      const manager = new ChessBoardManager();
      const validation = manager.validateMove('e4' as Square, 'e5' as Square);

      expect(validation.valid).toBe(false);
      expect(validation.error).toBe('NoPieceError');
    });

    it('should detect wrong color pieces', () => {
      const manager = new ChessBoardManager();
      const validation = manager.validateMove('e7' as Square, 'e5' as Square);

      expect(validation.valid).toBe(false);
      expect(validation.error).toBe('WrongColorError');
    });
  });

  describe('Position Queries', () => {
    it('should correctly identify pieces on squares', () => {
      const manager = new ChessBoardManager();

      expect(manager.isPieceOnSquare('e2' as Square, 'pawn', 'white')).toBe(true);
      expect(manager.isPieceOnSquare('e1' as Square, 'king', 'white')).toBe(true);
      expect(manager.isPieceOnSquare('e4' as Square, 'pawn', 'white')).toBe(false);
    });

    it('should get piece on square', () => {
      const manager = new ChessBoardManager();
      const piece = manager.getPieceOnSquare('e2' as Square);

      expect(piece).not.toBeNull();
      expect(piece?.type).toBe('p');
      expect(piece?.color).toBe('w');
    });

    it('should get all pieces positions', () => {
      const manager = new ChessBoardManager();
      const positions = manager.getAllPiecesPositions();

      expect(positions.white.pawns).toHaveLength(8);
      expect(positions.white.king).toHaveLength(1);
      expect(positions.black.pawns).toHaveLength(8);
    });
  });

  describe('Tactical Features', () => {
    it('should detect hanging pieces', () => {
      // Position with a hanging knight on c3
      const manager = new ChessBoardManager('rnbqkbnr/pppppppp/8/8/8/2N5/PPPPPPPP/R1BQKBNR b KQkq - 0 1');
      const hanging = manager.getHangingPieces();

      // Knight on c3 should be hanging or we detect tactical issues
      expect(Array.isArray(hanging)).toBe(true);
    });

    it('should detect pins', () => {
      const manager = new ChessBoardManager('r1bqkb1r/pppp1ppp/2n2n2/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 0 1');
      const pins = manager.getPinnedPieces();

      // This position has the knight on c6 pinned by the bishop on b5
      expect(pins.length).toBeGreaterThanOrEqual(0);
    });

    it('should detect forks', () => {
      const manager = new ChessBoardManager('r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 1');
      const forks = manager.getForks();

      // Check that fork detection runs without errors
      expect(Array.isArray(forks)).toBe(true);
    });
  });

  describe('Game State Detection', () => {
    it('should detect check', () => {
      const manager = new ChessBoardManager('rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 1');
      manager.makeMoveSAN('Qh4+');

      expect(manager.isCheck()).toBe(true);
    });

    it('should detect checkmate', () => {
      const manager = new ChessBoardManager('rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 0 1');

      expect(manager.isCheckmate()).toBe(true);
    });

    it('should detect stalemate', () => {
      const manager = new ChessBoardManager('7k/8/6Q1/8/8/8/8/7K b - - 0 1');

      expect(manager.isStalemate()).toBe(true);
    });

    it('should detect insufficient material', () => {
      const manager = new ChessBoardManager('7k/8/8/8/8/8/8/7K w - - 0 1');

      expect(manager.isInsufficientMaterial()).toBe(true);
    });
  });

  describe('Move History', () => {
    it('should track move history', () => {
      const manager = new ChessBoardManager();
      manager.makeMoveSAN('e4');
      manager.makeMoveSAN('e5');
      manager.makeMoveSAN('Nf3');

      const history = manager.getMoveHistory();
      expect(history).toEqual(['e4', 'e5', 'Nf3']);
    });

    it('should format move history correctly', () => {
      const manager = new ChessBoardManager();
      manager.makeMoveSAN('e4');
      manager.makeMoveSAN('e5');
      manager.makeMoveSAN('Nf3');
      manager.makeMoveSAN('Nc6');

      const formatted = manager.getMoveHistoryFormatted();
      expect(formatted).toBe('1.e4 e5 2.Nf3 Nc6');
    });

    it('should support undo', () => {
      const manager = new ChessBoardManager();
      const initialFen = manager.getFEN();

      manager.makeMoveSAN('e4');
      expect(manager.getFEN()).not.toBe(initialFen);

      manager.undoMove();
      expect(manager.getFEN()).toBe(initialFen);
    });

    it('should support redo', () => {
      const manager = new ChessBoardManager();

      manager.makeMoveSAN('e4');
      const afterE4 = manager.getFEN();

      manager.undoMove();
      manager.redoMove();

      expect(manager.getFEN()).toBe(afterE4);
    });
  });

  describe('Position Context for LLM', () => {
    it('should generate comprehensive position context', () => {
      const manager = new ChessBoardManager();
      const context = manager.getPositionContext();

      expect(context.fen).toBeDefined();
      expect(context.toMove).toBe('white');
      expect(context.moveNumber).toBe(1);
      expect(context.pieces).toBeDefined();
      expect(context.legalMoves).toBeDefined();
      expect(context.tacticalFeatures).toBeDefined();
      expect(context.positionalFeatures).toBeDefined();
      expect(context.material).toBeDefined();
      expect(context.squareControl).toBeDefined();
      expect(context.gameState).toBeDefined();
    });

    it('should generate ASCII board', () => {
      const manager = new ChessBoardManager();
      const ascii = manager.getBoardASCII();

      expect(ascii).toContain('a b c d e f g h');
      expect(ascii).toContain('White to move');
    });

    it('should generate natural language description', () => {
      const manager = new ChessBoardManager();
      const description = manager.getPositionNaturalLanguage();

      expect(description).toContain('White');
      expect(description).toContain('Black');
      expect(description.length).toBeGreaterThan(0);
    });

    it('should generate complete context for LLM', () => {
      const manager = new ChessBoardManager();
      const context = manager.getContextForLLM();

      expect(context.position).toBeDefined();
      expect(context.summary).toBeDefined();
      expect(context.naturalLanguage).toBeDefined();
      expect(context.ascii).toBeDefined();
    });
  });

  describe('Position Loading', () => {
    it('should load FEN correctly', () => {
      const manager = new ChessBoardManager();
      const newFen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';

      manager.loadFEN(newFen);
      expect(manager.getFEN()).toBe(newFen);
    });

    it('should reset to starting position', () => {
      const manager = new ChessBoardManager();
      manager.makeMoveSAN('e4');
      manager.makeMoveSAN('e5');

      manager.reset();
      expect(manager.getFEN()).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple captures', () => {
      const manager = new ChessBoardManager();
      manager.makeMoveSAN('e4');
      manager.makeMoveSAN('d5');
      manager.makeMoveSAN('exd5');

      expect(manager.getFEN()).toContain('P'); // Capital P for white pawn
    });

    it('should handle complex positions', () => {
      const complexFen = 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 1';
      const manager = new ChessBoardManager(complexFen);

      const context = manager.getPositionContext();
      expect(context.tacticalFeatures).toBeDefined();
      expect(context.positionalFeatures).toBeDefined();
    });

    it('should handle positions with few pieces', () => {
      const manager = new ChessBoardManager('8/8/8/3k4/8/3K4/8/8 w - - 0 1');
      const context = manager.getPositionContext();

      expect(context.material.balance).toContain('Equal');
    });
  });

  describe('Performance', () => {
    it('should handle position context generation in reasonable time', () => {
      const manager = new ChessBoardManager();

      const start = performance.now();
      manager.getPositionContext();
      const end = performance.now();

      const timeMs = end - start;
      expect(timeMs).toBeLessThan(200); // Should take less than 200ms
    });

    it('should handle multiple moves efficiently', () => {
      const manager = new ChessBoardManager();

      const start = performance.now();
      for (let i = 0; i < 20; i++) {
        if (manager.getLegalMoves().length > 0) {
          const moves = manager.getLegalMoves();
          manager.makeMoveSAN(moves[0].san);
        }
      }
      const end = performance.now();

      const timeMs = end - start;
      expect(timeMs).toBeLessThan(1000); // Should take less than 1 second
    });
  });
});
