import { useState, useEffect, useCallback, useRef } from 'react'
import { Chess } from 'chess.js'
import { stockfishService, PvLine, StockfishState, StockfishOptions, AnalyzeParams } from './stockfishService'

export interface UseStockfishReturn extends StockfishState {
  init: (options?: StockfishOptions) => void
  setPosition: (fen: string) => void
  setPositionFromMoves: (moves: string[]) => void
  analyze: (params?: AnalyzeParams) => void
  stop: () => void
  setOption: (name: string, value: number | string) => void
  newGame: () => void
  convertPvToSan: (pv: string[], fen?: string) => string[]
}

// Global flag to prevent duplicate initialization
let hasInitialized = false

export function useStockfish(chessInstance?: Chess): UseStockfishReturn {
  const [state, setState] = useState<StockfishState>(stockfishService.getState())
  const currentFenRef = useRef<string>('')

  // Subscribe to stockfish service updates
  useEffect(() => {
    const unsubscribe = stockfishService.subscribe((newState) => {
      console.log('[USE STOCKFISH] State updated:', {
        ready: newState.ready,
        thinking: newState.thinking,
        linesCount: newState.lines.length,
        bestMove: newState.bestMove,
        hasError: !!newState.error
      })
      setState(newState)
    })

    // Auto-initialize the engine with default options (only once globally)
    // Note: We don't set Skill Level for deterministic analysis (chess.com style)
    // Skill Level introduces randomness which causes different recommendations
    if (!hasInitialized) {
      hasInitialized = true
      console.log('[STOCKFISH] Auto-initializing engine with default options')
      setTimeout(() => {
        stockfishService.init({ multiPv: 3, threads: 1 })
      }, 100)
    }

    return unsubscribe
  }, [])

  const convertPvToSan = useCallback(
    (pv: string[], fen?: string): string[] => {
      if (!chessInstance) return []

      try {
        const tempChess = new Chess(fen || currentFenRef.current)
        const sanMoves: string[] = []

        for (const uciMove of pv) {
          if (uciMove.length < 4) break

          const from = uciMove.substring(0, 2)
          const to = uciMove.substring(2, 4)
          const promotion = uciMove.length > 4 ? uciMove.substring(4, 5) : undefined

          try {
            const move = tempChess.move({ from, to, promotion: promotion as any })
            if (move) {
              sanMoves.push(move.san)
            } else {
              break
            }
          } catch {
            break
          }
        }

        return sanMoves
      } catch {
        return []
      }
    },
    [chessInstance]
  )

  const init = useCallback((options?: StockfishOptions) => {
    console.log('[STOCKFISH] init() called with options:', options)
    stockfishService.init(options)
  }, [])

  const setPosition = useCallback((fen: string) => {
    currentFenRef.current = fen
    stockfishService.setPosition(fen)
  }, [])

  const setPositionFromMoves = useCallback((moves: string[]) => {
    stockfishService.setPositionFromMoves(moves)
  }, [])

  const analyze = useCallback((params?: AnalyzeParams) => {
    stockfishService.analyze(params)
  }, [])

  const stop = useCallback(() => {
    stockfishService.stop()
  }, [])

  const setOption = useCallback((name: string, value: number | string) => {
    stockfishService.setOption(name, value)
  }, [])

  const newGame = useCallback(() => {
    currentFenRef.current = ''
    stockfishService.newGame()
  }, [])

  return {
    ...state,
    init,
    setPosition,
    setPositionFromMoves,
    analyze,
    stop,
    setOption,
    newGame,
    convertPvToSan,
  }
}
