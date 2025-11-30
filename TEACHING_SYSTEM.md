# Interactive LLM Chess Teaching Tool - Technical Documentation

## Overview

The Chess Teaching Tool is a production-ready system that combines an LLM assistant with interactive board demonstrations to create an engaging chess learning experience. The system handles natural language queries about chess and responds with both explanations and live board demonstrations.

## Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────┐
│                    TeachingPanel (UI)                   │
│  ┌───────────┐  ┌────────────────┐  ┌──────────────┐   │
│  │ Query     │  │ Animation      │  │ Variation    │   │
│  │ Input     │  │ Controls       │  │ Display      │   │
│  └───────────┘  └────────────────┘  └──────────────┘   │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│              ResponseOrchestrator (Core Logic)          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Query        │  │ Openings     │  │ Teaching     │  │
│  │ Analyzer     │  │ Library      │  │ LLM Service  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│            BoardController (Animation Engine)           │
│  • Move playback (play/pause/step forward/backward)     │
│  • Configurable animation speed                         │
│  • Multiple move format support (SAN, UCI, PGN)         │
└─────────────────────────────────────────────────────────┘
```

## Module Descriptions

### 1. BoardController (`src/lib/teaching/BoardController.ts`)

**Purpose**: Core animation engine for chess move playback.

**Key Features**:
- Accept move sequences in multiple formats (PGN, UCI, SAN)
- Animate moves with configurable speed (slow, medium, fast, instant)
- Play, pause, step forward/backward controls
- Auto-play with pause at specified moves
- FEN position tracking

**Example Usage**:
```typescript
const controller = new BoardController();

// Load move sequence
controller.loadMoveSequence(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'], 'san');

// Set animation config
controller.setAnimationConfig({
  speed: 'medium',
  pauseAfterMove: 5,
});

// Set callback for each step
controller.onStep((step, state) => {
  console.log(`Move: ${step.san}, FEN: ${step.fen}`);
  updateBoard(step.fen);
});

// Start playback
await controller.play();
```

**API**:
- `loadMoveSequence(moves: string[], format: 'san' | 'uci' | 'pgn'): boolean`
- `loadPgn(pgn: string): boolean`
- `setAnimationConfig(config: AnimationConfig): void`
- `play(): Promise<void>`
- `pause(): void`
- `stop(): void`
- `stepForward(): Promise<boolean>`
- `stepBackward(): Promise<boolean>`
- `jumpToMove(index: number): boolean`
- `reset(): void`
- `getPlaybackState(): PlaybackState`

---

### 2. OpeningsLibrary (`src/lib/teaching/OpeningsLibrary.ts`)

**Purpose**: Hardcoded shortcuts for 20 most common chess openings for instant responses.

**Included Openings**:
1. Italian Game
2. Spanish Opening (Ruy Lopez)
3. Sicilian Defense
4. French Defense
5. Caro-Kann Defense
6. Queen's Gambit
7. King's Indian Defense
8. Nimzo-Indian Defense
9. English Opening
10. Scotch Game
11. London System
12. Najdorf Sicilian
13. Dragon Sicilian
14. Slav Defense
15. Grünfeld Defense
16. Pirc Defense
17. Alekhine's Defense
18. Scandinavian Defense
19. Vienna Game
20. Kings Gambit

**Data Structure**:
```typescript
interface ChessOpening {
  name: string;
  ecoCode: string;
  aliases: string[];
  mainLine: string[]; // SAN moves
  description: string;
  continuations: OpeningContinuation[]; // Up to 3 variations
  keywords: string[];
}
```

**Example Usage**:
```typescript
import { findOpening, searchOpenings } from './OpeningsLibrary';

// Find specific opening
const italian = findOpening('Italian Game');
console.log(italian.mainLine); // ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4']

// Search for openings
const results = searchOpenings('sicilian');
```

---

### 3. QueryAnalyzer (`src/lib/teaching/QueryAnalyzer.ts`)

**Purpose**: Pattern recognition for chess queries, categorizing user input into specific types.

**Query Types**:
- `opening_demonstration`: "Show me the Italian Game"
- `position_analysis`: "What's the best move?"
- `tactical_pattern`: "Show me a fork"
- `move_explanation`: "Why is Nc3 better?"
- `comparison`: "Compare the Dragon and Najdorf"
- `general_question`: Everything else

**Example Usage**:
```typescript
import { analyzeQuery } from './QueryAnalyzer';

const analysis = analyzeQuery("Show me the main line Italian");

console.log(analysis.type); // 'opening_demonstration'
console.log(analysis.confidence); // 0.95
console.log(analysis.extractedData.openingName); // 'Italian Game'
console.log(analysis.requiresOpeningLibrary); // true
```

**Pattern Matching**:
- Uses regex patterns to identify query types
- Extracts relevant data (opening names, moves, tactics)
- Determines which data sources are needed

---

### 4. MoveInstructionParser (`src/lib/teaching/MoveInstructionParser.ts`)

**Purpose**: Converts LLM JSON output into structured board commands.

**Instruction Types**:

**DemonstrationInstruction** (for openings, tactical patterns):
```typescript
{
  type: 'opening_demonstration',
  mainLine: {
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'],
    description: 'The Italian Game main line',
    pauseAfterMove: 5
  },
  continuations: [
    {
      name: 'Classical Variation',
      moves: ['Bc5', 'd3', 'Nf6'],
      description: 'Black mirrors development',
      source: 'theory',
      evaluation: '='
    }
  ],
  explanation: 'The Italian Game is...'
}
```

**PositionAnalysisInstruction**:
```typescript
{
  type: 'position_analysis',
  topMoves: [
    {
      name: 'Best move',
      moves: ['Nf3', 'd6', 'd4'],
      description: 'Controls center',
      source: 'stockfish',
      evaluation: '+0.8'
    }
  ],
  explanation: 'In this position...'
}
```

**Source Colors**:
- `stockfish`: Blue (#3b82f6)
- `database`: Green (#10b981)
- `theory`: Purple (#8b5cf6)
- `common`: Orange (#f59e0b)
- `llm`: Pink (#ec4899)

---

### 5. ResponseOrchestrator (`src/lib/teaching/ResponseOrchestrator.ts`)

**Purpose**: Main coordinator that integrates LLM, Stockfish, and Openings Library.

**Workflow**:
1. Analyze query using QueryAnalyzer
2. Execute parallel search:
   - Check OpeningsLibrary for instant matches
   - Run Stockfish analysis (if needed)
   - Query LLM for explanations (if needed)
3. Combine results intelligently
4. Return structured instruction

**Example Usage**:
```typescript
const orchestrator = new ResponseOrchestrator();

// Set callbacks
orchestrator.setLLMCallback(async (query, context) => {
  return await llmService.generateInstruction(query, context);
});

orchestrator.setStockfishCallback(async (fen, depth, multiPV) => {
  return await stockfishService.analyze(fen, depth, multiPV);
});

// Process query
const result = await orchestrator.processQuery(
  "Show me the Italian Game",
  currentFen
);

console.log(result.instruction);
console.log(result.responseText);
```

---

### 6. TeachingLLMService (`src/lib/teaching/TeachingLLMService.ts`)

**Purpose**: LLM integration with specialized prompts for chess teaching.

**System Prompt**:
- Designed to generate structured JSON responses
- Includes examples for different query types
- Enforces consistent formatting
- Educates with clear explanations

**Output Format**:
The LLM returns two parts:
1. JSON instruction (in code block)
2. Human-readable explanation

**Example LLM Response**:
````
```json
{
  "type": "opening_demonstration",
  "mainLine": {
    "moves": ["e4", "e5", "Nf3", "Nc6", "Bc4"],
    "description": "The main line of the Italian Game",
    "pauseAfterMove": 5
  },
  "continuations": [...]
}
```

The Italian Game is one of the oldest chess openings, dating back to the 16th century.
It focuses on rapid development and control of the center. The key move Bc4 targets
the weak f7 square...
````

---

## UI Components

### TeachingPanel (`src/components/TeachingPanel.tsx`)

**Main interface** that integrates all teaching features:
- Query input with suggestions
- Explanation display
- Animation controls integration
- Variation display integration
- Loading states

### VariationDisplay (`src/components/VariationDisplay.tsx`)

**Shows clickable variations** with:
- Color-coded sources (engine, theory, common)
- Evaluation badges
- Move notation
- Descriptions
- Click to play on board

### AnimationControls (`src/components/AnimationControls.tsx`)

**Playback controls**:
- Play/Pause/Stop buttons
- Step forward/backward
- Speed control (slow/medium/fast/instant)
- Progress bar
- Current move display

### TabView (`src/components/TabView.tsx`)

Simple tab component to switch between:
- Teaching Panel
- Chat Panel (original)

---

## Integration with Existing System

The teaching system integrates with:

1. **GameStore (Zustand)**: Updates board FEN, arrows, highlights
2. **Stockfish Engine**: Optional integration for position analysis
3. **ChessBoardManager**: Production-grade board state management
4. **Existing UI**: Seamlessly integrates via TabView

---

## Usage Examples

### Example 1: Opening Demonstration

**User Query**: "Show me the main line Italian"

**System Flow**:
1. QueryAnalyzer identifies as `opening_demonstration`
2. OpeningsLibrary returns Italian Game data instantly
3. BoardController loads main line: `['e4', 'e5', 'Nf3', 'Nc6', 'Bc4']`
4. Animates moves on board at medium speed
5. Pauses after move 5
6. Displays 3 continuations:
   - Classical Variation (theory)
   - Two Knights Defense (theory)
   - Evans Gambit (common)
7. User clicks a continuation to explore

### Example 2: Position Analysis

**User Query**: "What's the best move?"

**System Flow**:
1. QueryAnalyzer identifies as `position_analysis`
2. Stockfish analyzes current position (depth 15, MultiPV 3)
3. LLM generates explanation
4. Displays top 3 moves with:
   - Move sequence
   - Evaluation (e.g., "+0.8")
   - Source: Stockfish (blue badge)
   - Description
5. User clicks a line to see it played out

### Example 3: Tactical Pattern

**User Query**: "Show me a Greek gift sacrifice"

**System Flow**:
1. QueryAnalyzer identifies as `tactical_pattern`
2. LLM generates example position and moves
3. BoardController plays out the tactic
4. Shows when to sacrifice, expected responses
5. Explains why the tactic works

---

## Configuration

### Animation Speed Settings

```typescript
type Speed = 'slow' | 'medium' | 'fast' | 'instant';

const SPEED_DELAYS = {
  slow: 2000,    // 2 seconds per move
  medium: 1000,  // 1 second per move
  fast: 500,     // 0.5 seconds per move
  instant: 0     // Immediate
};
```

### Orchestrator Configuration

```typescript
const config = {
  maxContinuations: 3,        // Max variations to show
  enableStockfish: true,      // Use engine analysis
  enableLLM: true,            // Use LLM explanations
  enableOpeningsLibrary: true, // Use opening shortcuts
  stockfishDepth: 15,         // Analysis depth
  stockfishMultiPV: 3,        // Number of principal variations
};
```

---

## Future Enhancements

### Planned Features (Not Yet Implemented)

1. **Ghost Pieces for "What-If" Scenarios**
   - Show semi-transparent pieces for alternative moves
   - Visualize multiple variations simultaneously

2. **Masters Database Integration**
   - Historical games from top players
   - Opening statistics and success rates

3. **Lichess Studies Integration**
   - Import public studies
   - Follow curated learning paths

4. **Position Caching**
   - Cache frequently requested positions
   - Faster repeated queries

5. **User Progress Tracking**
   - Remember studied positions
   - Adaptive difficulty
   - Personalized recommendations

6. **Variation Trees**
   - Visual tree structure
   - Navigate complex variations
   - Compare multiple lines side-by-side

7. **Plugin Architecture**
   - Easy addition of new data sources
   - Custom analysis engines
   - Community extensions

---

## Testing Scenarios

### Recommended Test Queries

1. **Opening Demonstrations**:
   - "Show me the main line Italian"
   - "Explain the Sicilian Defense"
   - "What is the Queen's Gambit?"

2. **Position Analysis**:
   - "What's the best move?"
   - "Analyze this position"
   - "What should I play?"

3. **Tactical Patterns**:
   - "Show me a fork"
   - "What is a pin?"
   - "Explain a Greek gift sacrifice"

4. **Comparisons**:
   - "Compare the Dragon and Najdorf"
   - "Italian vs Spanish opening"

5. **Move Explanations**:
   - "Why is Nc3 better than Nd2?"
   - "Explain the move Bb5"

---

## File Structure

```
src/
├── components/
│   ├── TeachingPanel.tsx         # Main teaching interface
│   ├── VariationDisplay.tsx      # Clickable variations
│   ├── AnimationControls.tsx     # Playback controls
│   └── TabView.tsx               # Tab switching
├── lib/
│   └── teaching/
│       ├── BoardController.ts           # Animation engine
│       ├── OpeningsLibrary.ts           # 20 common openings
│       ├── QueryAnalyzer.ts             # Pattern recognition
│       ├── MoveInstructionParser.ts     # JSON → Commands
│       ├── ResponseOrchestrator.ts      # Main coordinator
│       └── TeachingLLMService.ts        # LLM integration
└── App.tsx                       # Integration point
```

---

## API Quick Reference

### BoardController
```typescript
controller.loadMoveSequence(moves, 'san')
controller.setAnimationConfig({ speed: 'medium' })
controller.onStep((step, state) => { /* callback */ })
controller.play()
controller.pause()
controller.stepForward()
controller.stepBackward()
```

### QueryAnalyzer
```typescript
const analysis = analyzeQuery(userQuery)
// Returns: { type, confidence, extractedData, requiresStockfish, requiresLLM, requiresOpeningLibrary }
```

### OpeningsLibrary
```typescript
const opening = findOpening('Italian Game')
const results = searchOpenings('sicilian')
```

### ResponseOrchestrator
```typescript
orchestrator.setLLMCallback(llmCallback)
orchestrator.setStockfishCallback(stockfishCallback)
const result = await orchestrator.processQuery(query, currentFen)
```

---

## Troubleshooting

### Common Issues

1. **LLM not responding**
   - Check `VITE_OPENAI_API_KEY` in `.env` file
   - Verify API key is valid
   - Check browser console for errors

2. **Moves not animating**
   - Check BoardController callback is set
   - Verify move format (SAN, UCI, PGN)
   - Check console for validation errors

3. **Openings not found**
   - Check spelling and aliases
   - Use searchOpenings() to find variations
   - Add custom openings to library if needed

4. **TypeScript errors**
   - Run `npm install` to ensure all dependencies
   - Check import paths are correct
   - Verify types are exported properly

---

## Performance Considerations

1. **Parallel Search**: Multiple data sources queried simultaneously
2. **Opening Library**: Instant responses for common openings (no API calls)
3. **Lazy Loading**: LLM only called when needed
4. **Memoization**: Results cached during session
5. **Progressive Enhancement**: Show first result immediately, add others as they arrive

---

## Credits

Built with:
- React 18.2
- TypeScript 5.2
- chess.js 1.0.0-beta.8
- Stockfish 17.1 (WASM)
- OpenAI GPT-4o-mini
- Zustand 4.4.7
- Tailwind CSS 3.3.6

---

## License

Part of the Chess-v10 project.
