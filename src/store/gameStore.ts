import { create } from 'zustand'
import { Chess, Square, PieceSymbol } from 'chess.js'

export type PlayerColor = 'w' | 'b'
export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k'

export interface PendingPromotion {
  from: Square
  to: Square
}

export interface GameSettings {
  soundEnabled: boolean
  soundVolume: number
}

export interface MoveHistoryEntry {
  san: string
  fen: string
  moveNumber: number
}

interface GameState {
  // Chess engine
  chess: Chess
  fen: string
  moveHistory: MoveHistoryEntry[]
  currentPly: number // Current position in history (for undo/redo)

  // UI state
  selectedSquare: Square | null
  focusCursorSquare: Square | null
  legalMoves: Square[]

  // Drag state
  draggedPiece: { square: Square; x: number; y: number } | null

  // Promotion
  pendingPromotion: PendingPromotion | null

  // Settings
  orientation: PlayerColor
  isDarkMode: boolean
  settings: GameSettings

  // Game status
  isCheck: boolean
  isCheckmate: boolean
  isStalemate: boolean
  isDraw: boolean

  // Actions
  makeMove: (from: Square, to: Square, promotion?: PieceSymbol) => boolean
  selectSquare: (square: Square | null) => void
  setFocusCursor: (square: Square | null) => void
  startDrag: (square: Square, x: number, y: number) => void
  updateDragPosition: (x: number, y: number) => void
  endDrag: (targetSquare: Square | null) => void
  flipOrientation: () => void
  resetGame: () => void
  undoMove: () => void
  redoMove: () => void
  jumpToPly: (ply: number) => void
  confirmPromotion: (piece: PieceSymbol) => void
  cancelPromotion: () => void
  toggleTheme: () => void
  updateSettings: (settings: Partial<GameSettings>) => void
  importPGN: (pgn: string) => boolean
  exportPGN: () => string
}

const initialSettings: GameSettings = {
  soundEnabled: true,
  soundVolume: 0.5,
}

const getGameStatus = (chess: Chess) => {
  return {
    isCheck: chess.isCheck(),
    isCheckmate: chess.isCheckmate(),
    isStalemate: chess.isStalemate(),
    isDraw: chess.isDraw(),
  }
}

const buildMoveHistory = (chess: Chess): MoveHistoryEntry[] => {
  const history = chess.history({ verbose: true })
  const tempChess = new Chess()
  const entries: MoveHistoryEntry[] = []

  history.forEach((move) => {
    tempChess.move(move.san)
    entries.push({
      san: move.san,
      fen: tempChess.fen(),
      moveNumber: Math.ceil((entries.length + 1) / 2),
    })
  })

  return entries
}

export const useGameStore = create<GameState>((set, get) => ({
  // Initial state
  chess: new Chess(),
  fen: new Chess().fen(),
  moveHistory: [],
  currentPly: 0,

  selectedSquare: null,
  focusCursorSquare: 'e1',
  legalMoves: [],

  draggedPiece: null,

  pendingPromotion: null,

  orientation: 'w',
  isDarkMode: false,
  settings: initialSettings,

  isCheck: false,
  isCheckmate: false,
  isStalemate: false,
  isDraw: false,

  makeMove: (from, to, promotion) => {
    const { chess, currentPly, moveHistory } = get()

    // If we're not at the latest position, create a new branch
    if (currentPly < moveHistory.length) {
      const tempChess = new Chess()
      for (let i = 0; i < currentPly; i++) {
        const entry = moveHistory[i]
        tempChess.load(entry.fen)
      }
      const newChess = new Chess(tempChess.fen())
      set({ chess: newChess })
    }

    const piece = chess.get(from)

    // Check if this is a pawn promotion
    if (piece?.type === 'p') {
      const toRank = to[1]
      const isPromotion = (piece.color === 'w' && toRank === '8') || (piece.color === 'b' && toRank === '1')

      if (isPromotion && !promotion) {
        // Store pending promotion
        set({
          pendingPromotion: { from, to },
          selectedSquare: null,
          legalMoves: [],
        })
        return false
      }
    }

    try {
      const moveObj: { from: Square; to: Square; promotion?: PieceSymbol } = { from, to }
      if (promotion) {
        moveObj.promotion = promotion
      }

      const move = chess.move(moveObj)
      if (!move) return false

      const newFen = chess.fen()
      const newHistory = buildMoveHistory(chess)
      const status = getGameStatus(chess)

      set({
        fen: newFen,
        moveHistory: newHistory,
        currentPly: newHistory.length,
        selectedSquare: null,
        legalMoves: [],
        pendingPromotion: null,
        ...status,
      })

      return true
    } catch {
      return false
    }
  },

  selectSquare: (square) => {
    const { chess, selectedSquare } = get()

    if (!square) {
      set({ selectedSquare: null, legalMoves: [] })
      return
    }

    const piece = chess.get(square)

    // If no piece selected, select this square if it has a piece of the current turn
    if (!selectedSquare) {
      if (piece && piece.color === chess.turn()) {
        const moves = chess.moves({ square, verbose: true })
        const legalSquares = moves.map((m) => m.to as Square)
        set({ selectedSquare: square, legalMoves: legalSquares })
      }
      return
    }

    // If clicking the same square, deselect
    if (selectedSquare === square) {
      set({ selectedSquare: null, legalMoves: [] })
      return
    }

    // If clicking a legal move target, make the move
    const { legalMoves } = get()
    if (legalMoves.includes(square)) {
      get().makeMove(selectedSquare, square)
      return
    }

    // Otherwise, select the new square if it has a piece of the current turn
    if (piece && piece.color === chess.turn()) {
      const moves = chess.moves({ square, verbose: true })
      const legalSquares = moves.map((m) => m.to as Square)
      set({ selectedSquare: square, legalMoves: legalSquares })
    } else {
      set({ selectedSquare: null, legalMoves: [] })
    }
  },

  setFocusCursor: (square) => {
    set({ focusCursorSquare: square })
  },

  startDrag: (square, x, y) => {
    const { chess } = get()
    const piece = chess.get(square)

    if (!piece || piece.color !== chess.turn()) return

    const moves = chess.moves({ square, verbose: true })
    const legalSquares = moves.map((m) => m.to as Square)

    set({
      draggedPiece: { square, x, y },
      legalMoves: legalSquares,
      selectedSquare: square,
    })
  },

  updateDragPosition: (x, y) => {
    const { draggedPiece } = get()
    if (draggedPiece) {
      set({ draggedPiece: { ...draggedPiece, x, y } })
    }
  },

  endDrag: (targetSquare) => {
    const { draggedPiece, legalMoves } = get()

    if (!draggedPiece) return

    if (targetSquare && legalMoves.includes(targetSquare)) {
      get().makeMove(draggedPiece.square, targetSquare)
    }

    set({
      draggedPiece: null,
      legalMoves: [],
      selectedSquare: null,
    })
  },

  flipOrientation: () => {
    const { orientation } = get()
    set({ orientation: orientation === 'w' ? 'b' : 'w' })
  },

  resetGame: () => {
    const newChess = new Chess()
    const status = getGameStatus(newChess)

    set({
      chess: newChess,
      fen: newChess.fen(),
      moveHistory: [],
      currentPly: 0,
      selectedSquare: null,
      focusCursorSquare: 'e1',
      legalMoves: [],
      draggedPiece: null,
      pendingPromotion: null,
      ...status,
    })
  },

  undoMove: () => {
    const { currentPly, moveHistory } = get()
    if (currentPly === 0) return

    const newPly = currentPly - 1
    const targetFen = newPly === 0 ? new Chess().fen() : moveHistory[newPly - 1].fen

    const newChess = new Chess(targetFen)
    const status = getGameStatus(newChess)

    set({
      chess: newChess,
      fen: targetFen,
      currentPly: newPly,
      selectedSquare: null,
      legalMoves: [],
      ...status,
    })
  },

  redoMove: () => {
    const { currentPly, moveHistory } = get()
    if (currentPly >= moveHistory.length) return

    const targetFen = moveHistory[currentPly].fen
    const newChess = new Chess(targetFen)
    const status = getGameStatus(newChess)

    set({
      chess: newChess,
      fen: targetFen,
      currentPly: currentPly + 1,
      ...status,
    })
  },

  jumpToPly: (ply) => {
    const { moveHistory } = get()
    if (ply < 0 || ply > moveHistory.length) return

    const targetFen = ply === 0 ? new Chess().fen() : moveHistory[ply - 1].fen
    const newChess = new Chess(targetFen)
    const status = getGameStatus(newChess)

    set({
      chess: newChess,
      fen: targetFen,
      currentPly: ply,
      selectedSquare: null,
      legalMoves: [],
      ...status,
    })
  },

  confirmPromotion: (piece) => {
    const { pendingPromotion } = get()
    if (!pendingPromotion) return

    get().makeMove(pendingPromotion.from, pendingPromotion.to, piece)
  },

  cancelPromotion: () => {
    set({ pendingPromotion: null })
  },

  toggleTheme: () => {
    set((state) => ({ isDarkMode: !state.isDarkMode }))
  },

  updateSettings: (newSettings) => {
    set((state) => ({
      settings: { ...state.settings, ...newSettings },
    }))
  },

  importPGN: (pgn) => {
    try {
      const newChess = new Chess()
      newChess.loadPgn(pgn)

      const newHistory = buildMoveHistory(newChess)
      const status = getGameStatus(newChess)

      set({
        chess: newChess,
        fen: newChess.fen(),
        moveHistory: newHistory,
        currentPly: newHistory.length,
        selectedSquare: null,
        legalMoves: [],
        ...status,
      })

      return true
    } catch {
      return false
    }
  },

  exportPGN: () => {
    const { chess } = get()
    return chess.pgn()
  },
}))
