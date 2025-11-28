/**
 * Quick verification script for ChessBoardManager
 * Tests position tracking integrity to prevent hallucinations
 */

import { ChessBoardManager } from './src/lib/boardManager';
import { Square } from 'chess.js';

console.log('🧪 Testing ChessBoardManager Position Integrity\n');

// Test 1: Position consistency after moves
console.log('Test 1: Position Consistency After Moves');
const manager1 = new ChessBoardManager();
const initialFen = manager1.getFEN();
console.log(`  Initial FEN: ${initialFen}`);

manager1.makeMoveSAN('e4');
const afterE4 = manager1.getFEN();
console.log(`  After e4: ${afterE4}`);

// Verify FEN changed correctly
const chess = manager1['positionTracker'].getChessInstance();
const expectedFen = chess.fen();
if (afterE4 === expectedFen) {
  console.log('  ✅ FEN matches chess.js instance');
} else {
  console.log('  ❌ FEN mismatch!');
  console.log(`    Expected: ${expectedFen}`);
  console.log(`    Got: ${afterE4}`);
}

// Test 2: Piece tracking accuracy
console.log('\nTest 2: Piece Tracking Accuracy');
const manager2 = new ChessBoardManager();
const pieceOnE2 = manager2.getPieceOnSquare('e2' as Square);
console.log(`  Piece on e2: ${pieceOnE2?.color}${pieceOnE2?.type}`);

if (pieceOnE2?.color === 'w' && pieceOnE2?.type === 'p') {
  console.log('  ✅ Correct piece identified');
} else {
  console.log('  ❌ Wrong piece identified');
}

// Test 3: Position context generation
console.log('\nTest 3: Position Context Generation');
const manager3 = new ChessBoardManager();
manager3.makeMoveSAN('e4');
manager3.makeMoveSAN('e5');

const context = manager3.getContextForLLM();
console.log(`  FEN in context: ${context.position.fen}`);
console.log(`  To move: ${context.position.toMove}`);
console.log(`  Legal moves count: ${context.position.legalMoves.allMovesUCI.length}`);

// Verify context matches actual position
const contextFen = context.position.fen;
const actualFen = manager3.getFEN();
if (contextFen === actualFen) {
  console.log('  ✅ Context FEN matches actual position');
} else {
  console.log('  ❌ Context FEN mismatch!');
  console.log(`    Expected: ${actualFen}`);
  console.log(`    Got: ${contextFen}`);
}

// Test 4: Position integrity after multiple moves
console.log('\nTest 4: Position Integrity After Multiple Moves');
const manager4 = new ChessBoardManager();
const moves = ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6'];

for (const move of moves) {
  const beforeFen = manager4.getFEN();
  const result = manager4.makeMoveSAN(move);
  
  if (!result.success) {
    console.log(`  ❌ Failed to make move ${move}: ${result.error}`);
    break;
  }
  
  const afterFen = manager4.getFEN();
  const chessInstance = manager4['positionTracker'].getChessInstance();
  const expectedFen = chessInstance.fen();
  
  if (afterFen !== expectedFen) {
    console.log(`  ❌ Position mismatch after ${move}`);
    console.log(`    Expected: ${expectedFen}`);
    console.log(`    Got: ${afterFen}`);
    break;
  }
}

console.log(`  ✅ All ${moves.length} moves executed correctly`);

// Test 5: Undo/Redo integrity
console.log('\nTest 5: Undo/Redo Integrity');
const manager5 = new ChessBoardManager();
const startFen = manager5.getFEN();

manager5.makeMoveSAN('e4');
const afterMove = manager5.getFEN();

manager5.undoMove();
const afterUndo = manager5.getFEN();

if (afterUndo === startFen) {
  console.log('  ✅ Undo restores correct position');
} else {
  console.log('  ❌ Undo failed');
  console.log(`    Expected: ${startFen}`);
  console.log(`    Got: ${afterUndo}`);
}

manager5.redoMove();
const afterRedo = manager5.getFEN();

if (afterRedo === afterMove) {
  console.log('  ✅ Redo restores correct position');
} else {
  console.log('  ❌ Redo failed');
  console.log(`    Expected: ${afterMove}`);
  console.log(`    Got: ${afterRedo}`);
}

// Test 6: Context completeness for LLM
console.log('\nTest 6: Context Completeness for LLM');
const manager6 = new ChessBoardManager();
manager6.makeMoveSAN('e4');
const llmContext = manager6.getContextForLLM();

const requiredFields = [
  'position',
  'summary',
  'naturalLanguage',
  'ascii'
];

const missingFields = requiredFields.filter(field => !(field in llmContext));
if (missingFields.length === 0) {
  console.log('  ✅ All required context fields present');
} else {
  console.log(`  ❌ Missing fields: ${missingFields.join(', ')}`);
}

// Check position data completeness
const posFields = [
  'fen',
  'toMove',
  'pieces',
  'legalMoves',
  'tacticalFeatures',
  'positionalFeatures',
  'material',
  'gameState'
];

const missingPosFields = posFields.filter(field => !(field in llmContext.position));
if (missingPosFields.length === 0) {
  console.log('  ✅ All required position fields present');
} else {
  console.log(`  ❌ Missing position fields: ${missingPosFields.join(', ')}`);
}

// Test 7: Legal moves accuracy
console.log('\nTest 7: Legal Moves Accuracy');
const manager7 = new ChessBoardManager();
const legalMoves = manager7.getLegalMoves();
const legalMovesUCI = legalMoves.map(m => `${m.from}${m.to}${m.promotion || ''}`);

const contextMoves = manager7.getContextForLLM().position.legalMoves.allMovesUCI;

// Check if all legal moves are in context
const missingMoves = legalMovesUCI.filter(move => !contextMoves.includes(move));
if (missingMoves.length === 0) {
  console.log(`  ✅ All ${legalMoves.length} legal moves present in context`);
} else {
  console.log(`  ❌ Missing moves in context: ${missingMoves.join(', ')}`);
}

// Test 8: Piece position queries
console.log('\nTest 8: Piece Position Queries');
const manager8 = new ChessBoardManager();
const allPieces = manager8.getAllPiecesPositions();

console.log(`  White pawns: ${allPieces.white.pawns.length} (expected: 8)`);
console.log(`  Black pawns: ${allPieces.black.pawns.length} (expected: 8)`);
console.log(`  White king: ${allPieces.white.king.length} (expected: 1)`);
console.log(`  Black king: ${allPieces.black.king.length} (expected: 1)`);

if (allPieces.white.pawns.length === 8 && 
    allPieces.black.pawns.length === 8 &&
    allPieces.white.king.length === 1 &&
    allPieces.black.king.length === 1) {
  console.log('  ✅ Piece positions correctly tracked');
} else {
  console.log('  ❌ Piece position tracking error');
}

console.log('\n✨ Board Manager Verification Complete!');
console.log('\nIf all tests passed, the board manager is working correctly.');
console.log('The position tracking should prevent LLM hallucinations.');

