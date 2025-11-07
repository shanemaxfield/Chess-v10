# Chess App

A production-ready, fully functional web chess application built with React, TypeScript, and Vite. Features complete chess rules, drag-and-drop, click-to-move, full keyboard accessibility, and **Stockfish 17.1 engine analysis**.

## Features

### AI Chess Assistant ⭐ **NEW**
- **Natural Language Interface**: Control the board with conversational commands
- **Real-time Board Actions**: Moves, arrows, and highlights execute instantly
- **Smart Suggestions**: Get best move recommendations with visual indicators
- **Interactive Chat**: Follow-up suggestions and explanations
- **Dual-response Format**: Board actions + friendly chat messages
- **Powered by OpenAI GPT-4**: Understands chess strategy and tactics

### Core Functionality
- **Complete Chess Rules**: All standard chess rules implemented via chess.js
  - Legal move validation
  - Check, checkmate, and stalemate detection
  - Castling (kingside and queenside)
  - En passant captures
  - Pawn promotion with modal selection
  - Draw by repetition, 50-move rule, and insufficient material

- **Stockfish 17.1 Engine Analysis** ⭐ **NEW**
  - Real-time position analysis with WASM engine
  - Multi-PV analysis (1-15 principal variations)
  - Configurable search depth (8-24) and time (ms)
  - Multi-threading support (requires COOP/COEP headers)
  - Live evaluation display (centipawns and mate scores)
  - Best move suggestions with one-click application
  - Web Worker-based for non-blocking UI
  - SAN (Standard Algebraic Notation) move display

- **Multiple Input Methods**
  - **Click-to-move**: Click a piece to select, then click destination
  - **Drag-and-drop**: Press and drag pieces with pointer events
  - **Full keyboard control**: Navigate and play entirely with keyboard (see below)

- **Visual Feedback**
  - Highlighted legal moves
  - Last move highlighting
  - Check indication (red king square)
  - Selected square highlighting
  - Keyboard focus cursor with visual ring

- **Game Controls**
  - Undo/Redo moves
  - Jump to any position in move history
  - Reset game
  - Flip board orientation
  - Export game as PGN

- **UI/UX**
  - Dark/light theme (respects system preference)
  - Sound effects with volume control
  - Responsive design (desktop and mobile)
  - Move history panel
  - Live game status display
  - Smooth animations

## Quick Start

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open your browser to `http://localhost:5173`

### Build for Production

```bash
npm run build
```

### Run Tests

```bash
npm run test
```

### Type Check

```bash
npm run typecheck
```

### Run All Checks (Linting, Type Checking, Tests)

```bash
npm run check
```

## LLM Chess Assistant Setup

The app includes an AI chess assistant powered by OpenAI's GPT models. The assistant can:
- Make moves via natural language (e.g., "play e4", "move knight to f3")
- Suggest best moves with visual arrows
- Highlight important squares
- Explain positions and strategies
- Provide follow-up suggestions

### Setup Instructions

1. **Create a `.env` file** in the project root:

```bash
cp .env.example .env
```

2. **Add your OpenAI API key** to the `.env` file:

```env
VITE_OPENAI_API_KEY=your-actual-api-key-here
```

3. **Restart the dev server** if it's already running:

```bash
npm run dev
```

### Using the AI Assistant

1. Look for the **Chat Actions** panel with the 🤖 robot icon
2. Type natural language queries like:
   - "e4" - Makes the e4 move
   - "What's the best move?" - Shows suggested moves with arrows
   - "Show me where my knight can go" - Highlights legal squares
   - "Explain this position" - Gets strategic advice
3. Click on **follow-up suggestions** to continue the conversation
4. Toggle between **AI mode** and **Basic mode** using the button in the header

### Features

- **Dual-response format**: Board actions + chat response
- **Real-time board control**: Moves execute immediately
- **Visual annotations**: Arrows and highlights for clarity
- **Follow-up suggestions**: Interactive quick-reply buttons
- **Backward compatible**: Falls back to basic parser if LLM unavailable

### Note on API Keys

⚠️ The API key is used client-side. For production, consider:
- Using a backend proxy to hide the API key
- Implementing rate limiting
- Setting usage quotas in your OpenAI account

## Keyboard Controls

The app is fully accessible via keyboard:

| Key | Action |
|-----|--------|
| **Arrow Keys** | Move focus cursor around the board |
| **Enter** or **Space** | Select piece / Make move / Confirm promotion |
| **Escape** | Cancel selection / Close promotion modal |

### Keyboard Workflow

1. Use **arrow keys** to move the focus cursor to a square
2. Press **Enter** or **Space** on a piece of the current player to select it
3. Legal target squares will be highlighted
4. Use **arrow keys** to navigate to a legal destination
5. Press **Enter** or **Space** to make the move
6. Press **Escape** at any time to cancel the selection

### Promotion with Keyboard

When a pawn reaches the promotion rank:
1. A modal appears with four promotion options
2. Use **Left/Right arrow keys** to navigate between pieces
3. Press **Enter** to confirm selection
4. Press **Escape** to cancel

## Project Structure

```
Chess-v10/
├── src/
│   ├── components/           # React components
│   │   ├── ChessBoard.tsx   # Main board component
│   │   ├── Square.tsx       # Individual square
│   │   ├── Piece.tsx        # Piece wrapper
│   │   ├── PieceSVG.tsx     # SVG piece assets
│   │   ├── MoveList.tsx     # Move history
│   │   ├── PromotionModal.tsx
│   │   ├── Controls.tsx     # Game controls
│   │   ├── EnginePanel.tsx  # Stockfish analysis panel
│   │   ├── ChatPanel.tsx    # AI chess assistant chat (NEW)
│   │   └── TopBar.tsx       # Header with theme toggle
│   ├── engine/              # Stockfish integration
│   │   ├── stockfish.worker.ts  # Web Worker wrapper
│   │   └── useStockfish.ts      # React hook for engine
│   ├── hooks/               # Custom React hooks
│   │   ├── useKeyboardController.ts
│   │   └── usePointerDrag.ts
│   ├── store/
│   │   └── gameStore.ts     # Zustand store (game state)
│   ├── lib/                 # Utilities
│   │   ├── chessEngine.ts   # Chess.js wrapper
│   │   ├── llmService.ts    # OpenAI LLM integration (NEW)
│   │   ├── sound.ts         # Sound effects
│   │   ├── theme.ts         # Theme utilities
│   │   └── actions/         # Chat action system (NEW)
│   │       ├── types.ts     # Action type definitions
│   │       ├── planActions.ts    # Parse commands to actions
│   │       ├── MoveController.ts
│   │       ├── ArrowController.ts
│   │       └── HighlightController.ts
│   ├── config/              # Configuration (NEW)
│   │   └── llmConfig.ts     # LLM settings
│   ├── utils/               # Helper utilities
│   │   ├── uci.ts           # UCI protocol parsing
│   │   └── eval.ts          # Evaluation formatting
│   ├── types/
│   │   └── stockfish.d.ts   # Stockfish type declarations
│   ├── styles/
│   │   └── index.css        # Tailwind + custom styles
│   ├── __tests__/           # Test files
│   ├── test/
│   │   └── setup.ts         # Test configuration
│   ├── App.tsx
│   └── main.tsx
├── public/
│   └── stockfish/           # Stockfish WASM files
│       ├── stockfish-17.1-lite-single-03e3232.js
│       └── stockfish-17.1-lite-single-03e3232.wasm
├── .env.example             # Environment variables template (NEW)
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── README.md
```

## Technology Stack

- **Framework**: React 18
- **Language**: TypeScript 5
- **Build Tool**: Vite 5
- **Styling**: TailwindCSS 3
- **State Management**: Zustand 4
- **Chess Logic**: chess.js 1.0.0-beta.8
- **Engine**: Stockfish 17.1 (WASM)
- **AI Assistant**: OpenAI GPT-4 (via OpenAI SDK)
- **Testing**: Vitest + React Testing Library
- **Linting**: ESLint

## Architecture Highlights

### State Management (Zustand)
The `gameStore` centralizes all game state:
- Chess engine instance
- Current FEN and move history
- UI state (selected square, focus cursor, drag state)
- Pending promotions
- Settings (sound, theme, orientation)
- Game status (check, checkmate, stalemate, draw)

### Performance Optimizations
- Square components use `React.memo` to prevent unnecessary re-renders
- Legal moves are computed only when needed
- Drag state is managed efficiently with pointer events
- Board orientation changes don't affect game logic

### Accessibility
- Full keyboard navigation with visible focus indicators
- Semantic HTML structure
- ARIA labels where appropriate
- Focus never trapped
- Works without mouse

## Game Rules Implemented

All standard chess rules are implemented via chess.js:

- ✅ Legal move generation for all pieces
- ✅ Check detection
- ✅ Checkmate detection
- ✅ Stalemate detection
- ✅ Castling (kingside and queenside)
  - Only when king and rook haven't moved
  - Only when squares between are empty
  - Only when king is not in check
  - Only when king doesn't pass through check
- ✅ En passant capture
- ✅ Pawn promotion (with piece selection modal)
- ✅ Draw by threefold repetition
- ✅ Draw by 50-move rule
- ✅ Draw by insufficient material
- ✅ Move history with PGN export

## Sound Effects

The app includes procedurally generated sound effects using the Web Audio API:
- Normal move
- Capture
- Check
- Castling
- Illegal move attempt
- Game end

Sounds can be toggled on/off and volume adjusted in the controls panel.

## Testing

The test suite covers:
- ✅ Game store (move validation, undo/redo, promotions)
- ✅ Chess engine utilities
- ✅ Component rendering and interactions
- ✅ Special moves (en passant, castling)
- ✅ Game state detection (check, checkmate, stalemate)

Run tests with:
```bash
npm run test          # Run once
npm run test:ui       # Run with UI
```

## Stockfish Engine Analysis

The app includes a full integration with Stockfish 17.1 (WASM) for position analysis.

### Features

- **Multi-PV Analysis**: View up to 15 best lines simultaneously
- **Configurable Depth**: Analyze from depth 8 to 24
- **Time-based Search**: Set analysis time in milliseconds
- **Real-time Evaluation**: See position scores in centipawns or mate sequences
- **Best Move Application**: Apply the engine's suggested move with one click
- **SAN Display**: Variations shown in Standard Algebraic Notation

### Engine Panel Controls

| Control | Description |
|---------|-------------|
| **MultiPV Slider** | Number of principal variations (1-15) |
| **Depth Slider** | Search depth (8-24 plies) |
| **Time Input** | Analysis time in milliseconds (overrides depth) |
| **Threads** | Number of CPU threads (1, 2, 4, 8) |
| **Analyze Button** | Start engine analysis |
| **Stop Button** | Stop current analysis |
| **Use Best Move** | Apply engine's recommended move |
| **New Game** | Reset engine state |

### Multi-Threading

The engine supports multi-threading for faster analysis. However, this requires **Cross-Origin Isolation**:

```html
<!-- Add these headers to enable multi-threading -->
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

Without these headers, the engine will default to single-threaded mode (Threads = 1).

### How It Works

1. **Web Worker Architecture**: The engine runs in a dedicated Web Worker to keep the UI responsive
2. **UCI Protocol**: Communicates using the Universal Chess Interface protocol
3. **WASM Performance**: Stockfish WASM provides near-native performance
4. **Position Sync**: Automatically syncs with board position on each move
5. **Live Updates**: Analysis updates in real-time as the engine searches deeper

### Evaluation Display

- **Centipawns**: Displayed as ±X.XX (e.g., +0.35 = slight white advantage)
- **Mate Scores**: Displayed as M# (e.g., M5 = mate in 5 moves)
- **Side-to-Move**: Evaluation flips for Black's perspective

### Usage Example

```typescript
// The engine is automatically integrated in App.tsx
const engine = useStockfish(chess)

// Initialize with options
engine.init({ multiPv: 5, threads: 1, skill: 20 })

// Set position
engine.setPosition(chess.fen())

// Start analysis
engine.analyze({ depth: 20 })
// or
engine.analyze({ movetimeMs: 2000 })

// Access results
engine.lines // Array of PV lines with scores
engine.bestMove // Best move in UCI format
engine.thinking // Boolean: is engine currently analyzing
```

## Browser Support

Modern browsers with ES2020 support:
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## License

MIT

## Contributing

This is a demonstration project. Feel free to fork and modify as needed.

## Acknowledgments

- Chess piece SVGs based on standard chess iconography
- Chess logic powered by [chess.js](https://github.com/jhlywa/chess.js)
- Engine analysis powered by [Stockfish 17.1](https://stockfishchess.org/)
- UI inspired by chess.com and lichess.org
