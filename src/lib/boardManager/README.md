# Chess Board State Manager

A production-grade chess board state management system that serves as the **single source of truth** for all position information, designed to eliminate LLM position hallucinations and provide comprehensive chess analysis.

## Overview

The Chess Board Manager solves the critical problem of LLMs hallucinating chess positions, piece movements, and tactical features. By pre-calculating all position information and providing it in a structured format, the LLM never needs to "calculate" or "remember" positions—it simply uses the verified data provided.

## Key Features

- ✅ **Zero Position Hallucinations**: All position data is pre-calculated and verified
- ✅ **Comprehensive Tactical Analysis**: Automatic detection of pins, forks, hanging pieces, and more
- ✅ **Multiple Position Representations**: FEN, ASCII, JSON, natural language
- ✅ **Full Move Validation**: Detailed error messages for illegal moves
- ✅ **Move History with Variations**: Branch support for exploring different lines
- ✅ **Performance Optimized**: Position context generation in <200ms
- ✅ **Production Ready**: Comprehensive error handling and logging
- ✅ **Fully Tested**: 38 test cases covering all functionality

## Architecture

The system consists of 6 main components:

```
ChessBoardManager (Main API)
├── PositionTracker (Core State Management)
│   └── Maintains FEN, board array, piece mappings
├── MoveValidator (Legal Move Generation)
│   └── Categorizes moves, validates legality
├── FeatureExtractor (Tactical Analysis)
│   └── Detects pins, forks, hanging pieces, positional features
├── PositionSerializer (Output Formats)
│   └── Generates context for LLM, ASCII, JSON
└── StateHistory (Move Navigation)
    └── Supports variations and move browsing
```

## Installation & Usage

### Basic Setup

```typescript
import { ChessBoardManager } from './lib/boardManager';

// Initialize with starting position
const manager = new ChessBoardManager();

// Or initialize with custom FEN
const manager = new ChessBoardManager('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1');
```

### Making Moves

```typescript
// Make a move using UCI notation
const result = manager.makeMoveUCI('e2e4');
if (result.success) {
  console.log(`Move: ${result.san}, New position: ${result.fen}`);
} else {
  console.error(`Error: ${result.error}`);
}

// Make a move using SAN notation
manager.makeMoveSAN('Nf3');

// Make a move using from/to squares
manager.makeMove('g1' as Square, 'f3' as Square);
```

### Getting Position Context for LLM

This is the primary use case - providing comprehensive position context to an LLM:

```typescript
const context = manager.getContextForLLM();

// context contains:
// {
//   position: ComprehensivePositionContext,
//   summary: string,
//   naturalLanguage: string,
//   ascii: string
// }

// Use in LLM prompt
const prompt = `
Current Position:
${context.ascii}

${context.naturalLanguage}

Tactical Features:
${context.position.tacticalFeatures.hangingPieces.map(h => h.description).join('\n')}

Legal Moves: ${context.position.legalMoves.allMovesSAN.join(', ')}

User Question: What should I play here?
`;
```

### Validating Moves

```typescript
// Validate before making
const validation = manager.validateMove('e2' as Square, 'e4' as Square);
if (validation.valid) {
  manager.makeMove('e2' as Square, 'e4' as Square);
} else {
  console.error(validation.error, validation.details);
}
```

### Querying Position

```typescript
// Check if specific piece is on square
if (manager.isPieceOnSquare('e4' as Square, 'pawn', 'white')) {
  console.log('White pawn on e4');
}

// Get piece on square
const piece = manager.getPieceOnSquare('e2' as Square);

// Get all pieces
const pieces = manager.getAllPiecesPositions();
// pieces.white.pawns -> ['a2', 'b2', 'c2', ...]
// pieces.black.king -> ['e8']
```

### Tactical Analysis

```typescript
// Get all tactical features
const tactics = manager.getTacticalFeatures();

// Check for hanging pieces
const hanging = manager.getHangingPieces();
hanging.forEach(h => {
  console.log(h.description);
  // "knight on c6 is undefended"
});

// Check for pins
const pins = manager.getPinnedPieces();
pins.forEach(pin => {
  console.log(`${pin.pinnedPiece.type} on ${pin.pinnedPiece.square} is pinned`);
});

// Check for forks
const forks = manager.getForks();
```

### Move History & Navigation

```typescript
// Make some moves
manager.makeMoveSAN('e4');
manager.makeMoveSAN('e5');
manager.makeMoveSAN('Nf3');

// Get move history
const history = manager.getMoveHistory(); // ['e4', 'e5', 'Nf3']
const formatted = manager.getMoveHistoryFormatted(); // '1.e4 e5 2.Nf3'

// Navigate
manager.undoMove(); // Go back one move
manager.redoMove(); // Go forward one move
manager.goToStart(); // Go to starting position
manager.goToEnd(); // Go to latest position
manager.goToMove(2); // Go to move number 2
```

### Variations

```typescript
// Create a variation from current position
const variationId = manager.startVariation();

// Make moves in the variation
manager.makeMoveSAN('d4'); // Alternative move
manager.makeMoveSAN('d5');

// Navigate back to main line
manager.undoMove();
manager.undoMove();
```

## Integration with LLM Service

### Enhanced LLM Service

The package includes `llmServiceEnhanced.ts` which demonstrates how to integrate the board manager with an LLM:

```typescript
import { EnhancedChessLLMService, initializeEnhancedLLMService } from './lib/llmServiceEnhanced';
import { ChessBoardManager } from './lib/boardManager';

// Initialize
initializeEnhancedLLMService(apiKey);
const llmService = getEnhancedLLMService();

// Create board manager
const boardManager = new ChessBoardManager();
boardManager.makeMoveSAN('e4');
boardManager.makeMoveSAN('e5');

// Process user request with full context
const result = await llmService.processMessage(
  "What's the best move here?",
  boardManager,
  stockfishLines // optional
);

// result contains:
// {
//   plan: ActionPlan,  // Board actions (moves, arrows, highlights)
//   response: string,  // LLM's text response
//   followUps: string[] // Suggested questions
// }
```

### Why This Prevents Hallucinations

The enhanced LLM service provides the LLM with:

1. **Exact piece positions** in multiple formats (FEN, natural language, ASCII)
2. **Pre-calculated legal moves** (the LLM can't suggest illegal moves)
3. **Tactical features** (pins, forks, hanging pieces) - no need for LLM to calculate
4. **Positional assessment** (center control, king safety) - pre-analyzed
5. **Material balance** - calculated precisely
6. **Square control** - pre-computed for all squares

The LLM simply references this data rather than trying to maintain board state in its context window.

## API Reference

### ChessBoardManager

#### Constructor
```typescript
constructor(initialFen?: string)
```

#### Move Operations
- `makeMove(from: Square, to: Square, promotion?: PieceSymbol): MoveResult`
- `makeMoveUCI(uciMove: string): MoveResult`
- `makeMoveSAN(san: string): MoveResult`
- `undoMove(): boolean`
- `redoMove(): boolean`

#### Move Validation
- `validateMove(from: Square, to: Square, promotion?: PieceSymbol): ValidationResult`
- `validateMoveUCI(uciMove: string): ValidationResult`
- `validateMoveSAN(san: string): ValidationResult`
- `getLegalMoves(): Move[]`
- `getLegalMovesFromSquare(square: Square): Square[]`

#### Position Query
- `isPieceOnSquare(square: Square, pieceType: ChessPiece, color?: ChessColor): boolean`
- `getPieceOnSquare(square: Square): Piece | null`
- `getAllPiecesPositions(): PiecePlacement`
- `getAttackingPieces(square: Square, attackingColor?: ChessColor): Array<{square: Square, piece: Piece}>`

#### Tactical Features
- `getTacticalFeatures(): TacticalFeatures`
- `getPinnedPieces(): Pin[]`
- `getHangingPieces(): HangingPiece[]`
- `getForks(): Fork[]`

#### Game State
- `isCheck(): boolean`
- `isCheckmate(): boolean`
- `isStalemate(): boolean`
- `isDraw(): boolean`
- `isInsufficientMaterial(): boolean`
- `isThreefoldRepetition(): boolean`

#### Position Representation
- `getFEN(): string`
- `loadFEN(fen: string): void`
- `getPositionContext(): ComprehensivePositionContext`
- `getBoardASCII(): string`
- `getPositionNaturalLanguage(): string`
- `getContextForLLM(): {position, summary, naturalLanguage, ascii}`

#### Move History
- `getMoveHistory(): string[]`
- `getMoveHistoryFormatted(): string`
- `goToMove(moveNumber: number): boolean`
- `goToStart(): void`
- `goToEnd(): void`
- `startVariation(): string`
- `addComment(comment: string): void`

#### Utility
- `reset(): void`
- `getChessInstance(): Chess`

## Performance

Benchmarks from test suite:

- Position context generation: **~121ms** (complex position with full tactical analysis)
- 20 sequential moves: **<1000ms**
- Move validation: **<1ms**

## Testing

Run the comprehensive test suite:

```bash
npm test -- --run ChessBoardManager.test.ts
```

Test coverage includes:
- ✅ Initialization (starting position, custom FEN)
- ✅ Move making (UCI, SAN, promotion, castling, en passant)
- ✅ Move validation (legal/illegal, error messages)
- ✅ Position queries (piece detection, piece positions)
- ✅ Tactical features (pins, forks, hanging pieces)
- ✅ Game state (check, checkmate, stalemate, insufficient material)
- ✅ Position context for LLM (comprehensive data)
- ✅ Move history (undo, redo, navigation)
- ✅ Edge cases (complex positions, endgames)
- ✅ Performance (context generation speed)

## Error Handling

The system provides specific, actionable error messages:

```typescript
// IllegalMoveError
manager.makeMove('e2' as Square, 'e5' as Square);
// "Pawn on e2 cannot move to e5 (can only move 1 or 2 squares forward)"

// NoPieceError
manager.makeMove('e4' as Square, 'e5' as Square);
// "No piece on square e4"

// WrongColorError
manager.makeMove('e7' as Square, 'e5' as Square);
// "Cannot move black piece on e7. It's white to move."

// InvalidFENError
manager.loadFEN('invalid fen');
// "Invalid FEN: [specific reason]"
```

## Best Practices

### For LLM Integration

1. **Always use comprehensive context**: Use `getContextForLLM()` rather than just FEN
2. **Reference tactical features**: Alert users about pins, hanging pieces, etc.
3. **Use legal moves list**: Never let LLM generate moves - only select from provided list
4. **Validate before executing**: Always validate LLM-suggested moves before executing
5. **Provide position visuals**: Include ASCII board in prompts for better LLM understanding

### For General Use

1. **Single source of truth**: Use board manager as the only source of position data
2. **Error handling**: Always check `MoveResult.success` before proceeding
3. **Performance**: Cache position context if querying multiple times without moves
4. **Variations**: Use `startVariation()` when exploring alternatives
5. **History**: Use `goToMove()` for position navigation rather than replaying moves

## Examples

### Example 1: Basic Chess Teaching Assistant

```typescript
const manager = new ChessBoardManager();
manager.makeMoveSAN('e4');
manager.makeMoveSAN('e5');

const context = manager.getContextForLLM();

const prompt = `
Position: ${context.ascii}

${context.naturalLanguage}

Material: ${context.position.material.balance}
Center Control: ${context.position.positionalFeatures.centerControl}

Available moves: ${context.position.legalMoves.allMovesSAN.join(', ')}

User asks: "What should I play next?"

Suggest a good move and explain why.
`;
```

### Example 2: Tactical Training

```typescript
const manager = new ChessBoardManager();
manager.loadFEN('r1bqkb1r/pppp1ppp/2n2n2/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 0 1');

const tactics = manager.getTacticalFeatures();

if (tactics.pins.length > 0) {
  const pin = tactics.pins[0];
  console.log(`Tactical motif found!`);
  console.log(`The ${pin.pinnedPiece.color} ${pin.pinnedPiece.type} on ${pin.pinnedPiece.square} is pinned!`);
  console.log(`It's pinned by the ${pin.pinningPiece.color} ${pin.pinningPiece.type} on ${pin.pinningPiece.square}`);
  console.log(`Can't move without exposing the ${pin.pinnedTo.type}`);
}
```

### Example 3: Move Quality Analysis

```typescript
const manager = new ChessBoardManager();

// Make moves
manager.makeMoveSAN('e4');
manager.makeMoveSAN('e5');

// Check tactical consequences
manager.makeMoveSAN('Qh5');  // Questionable move

const hanging = manager.getHangingPieces();
if (hanging.length > 0) {
  console.log('Warning! After Qh5, the following pieces are hanging:');
  hanging.forEach(h => console.log(`- ${h.description}`));
}
```

## Troubleshooting

### Issue: Tests failing

**Solution**: Run `npm install` to ensure all dependencies are installed, then `npm test`

### Issue: Performance slower than expected

**Solution**:
- Cache position context if querying multiple times without moves
- Use `getPositionContext()` only when needed
- Consider using lighter queries for specific data (e.g., `getLegalMoves()` instead of full context)

### Issue: FEN loading fails

**Solution**: Ensure FEN is valid using chess.js validator first. Check for:
- Correct piece placement
- Valid active color (w/b)
- Valid castling rights
- Valid en passant square
- Valid halfmove and fullmove numbers

## Contributing

This board manager is designed to be extended. Key areas for contribution:

1. **Enhanced tactical detection**: Improve skewer and discovered attack detection
2. **Endgame tablebases**: Integration with syzygy or other tablebases
3. **Opening book**: Add opening classification and theory
4. **Pattern recognition**: Identify common tactical patterns
5. **Evaluation function**: Integrate deeper position evaluation

## License

MIT

## Credits

Built with:
- [chess.js](https://github.com/jhlywa/chess.js) - Chess logic and move validation
- TypeScript - Type safety and developer experience
- Vitest - Testing framework
