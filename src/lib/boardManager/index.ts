/**
 * Chess Board State Manager
 * Production-grade chess board state management system
 *
 * Usage:
 * ```typescript
 * import { ChessBoardManager } from './lib/boardManager';
 *
 * const manager = new ChessBoardManager();
 *
 * // Make moves
 * manager.makeMove('e2' as Square, 'e4' as Square);
 *
 * // Get comprehensive position context for LLM
 * const context = manager.getPositionContext();
 *
 * // Validate moves
 * const validation = manager.validateMove('e2' as Square, 'e4' as Square);
 *
 * // Get tactical features
 * const tactics = manager.getTacticalFeatures();
 * ```
 */

export { ChessBoardManager } from './ChessBoardManager';
export { PositionTracker } from './PositionTracker';
export { MoveValidator } from './MoveValidator';
export { FeatureExtractor } from './FeatureExtractor';
export { PositionSerializer } from './PositionSerializer';
export { StateHistory } from './StateHistory';

export * from './types';
export * from './errors';
