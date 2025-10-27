import { useState, useEffect, useRef, useCallback } from 'react'
import { Chess } from 'chess.js'
import { parseInfoLine, ScoreInfo } from '../utils/uci'

export interface PvLine {
  multipv: number
  score: ScoreInfo
  depth: number
  seldepth?: number
  pv: string[] // UCI moves
  san?: string[] // SAN moves (if chess instance provided)
  nodes?: number
  nps?: number
  time?: number
}

export interface StockfishState {
  ready: boolean
  thinking: boolean
  lines: PvLine[]
  bestMove?: string
  raw: string[]
  error?: string
}

export interface StockfishOptions {
  multiPv?: number
  threads?: number
  skill?: number
}

export interface AnalyzeParams {
  depth?: number
  movetimeMs?: number
}

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

export function useStockfish(chessInstance?: Chess): UseStockfishReturn {
  const workerRef = useRef<Worker | null>(null)
  const [state, setState] = useState<StockfishState>({
    ready: false,
    thinking: false,
    lines: [],
    raw: [],
  })

  // Track lines by multipv and depth to keep the best (deepest) version
  const linesMapRef = useRef<Map<number, PvLine>>(new Map())
  const currentFenRef = useRef<string>('')

  // Initialize worker
  useEffect(() => {
    console.log('[STOCKFISH] Creating worker...')
    const worker = new Worker(new URL('./stockfish.worker.ts', import.meta.url), {
      type: 'module',
    })
    console.log('[STOCKFISH] Worker created')

    worker.addEventListener('message', (e: MessageEvent) => {
      const { type, data } = e.data

      switch (type) {
        case 'ready':
          console.log('[STOCKFISH] Engine ready!')
          setState((prev) => ({ ...prev, ready: true }))
          break

        case 'engineLine':
          // Log debug messages to console
          console.log('[STOCKFISH]', data)
          handleEngineLine(data)
          break

        case 'bestmove':
          console.log('[STOCKFISH] Best move:', data)
          setState((prev) => ({
            ...prev,
            bestMove: data,
            thinking: false,
          }))
          break

        case 'error':
          console.error('[STOCKFISH ERROR]', data)
          setState((prev) => ({
            ...prev,
            error: data,
            thinking: false,
          }))
          break
      }
    })

    workerRef.current = worker

    // Auto-initialize the engine with default options
    console.log('[STOCKFISH] Auto-initializing engine with default options')
    setTimeout(() => {
      if (workerRef.current) {
        console.log('[STOCKFISH] Sending auto-init message')
        workerRef.current.postMessage({
          type: 'init',
          payload: { multiPv: 3, threads: 1, skill: 20 },
        })
      }
    }, 0)

    return () => {
      worker.terminate()
    }
  }, [])

  const handleEngineLine = useCallback(
    (line: string) => {
      // Add to raw output
      setState((prev) => ({
        ...prev,
        raw: [...prev.raw.slice(-99), line], // Keep last 100 lines
      }))

      // Parse info lines
      const info = parseInfoLine(line)
      if (info && info.multipv && info.score && info.pv && info.depth) {
        const multipv = info.multipv

        // Only update if this is a deeper search or first time seeing this multipv
        const existing = linesMapRef.current.get(multipv)
        if (!existing || info.depth >= existing.depth) {
          const pvLine: PvLine = {
            multipv,
            score: info.score,
            depth: info.depth,
            seldepth: info.seldepth,
            pv: info.pv,
            nodes: info.nodes,
            nps: info.nps,
            time: info.time,
          }

          // Convert to SAN if chess instance provided
          if (chessInstance && currentFenRef.current) {
            pvLine.san = convertPvToSan(info.pv, currentFenRef.current)
          }

          linesMapRef.current.set(multipv, pvLine)

          // Update state with all lines sorted by multipv
          const allLines = Array.from(linesMapRef.current.values()).sort(
            (a, b) => a.multipv - b.multipv
          )

          setState((prev) => ({
            ...prev,
            lines: allLines,
          }))
        }
      }
    },
    [chessInstance]
  )

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
    console.log('[STOCKFISH] workerRef.current:', workerRef.current ? 'exists' : 'null')
    if (workerRef.current) {
      console.log('[STOCKFISH] Sending init message to worker')
      workerRef.current.postMessage({
        type: 'init',
        payload: options,
      })
      console.log('[STOCKFISH] Init message sent')
    } else {
      console.error('[STOCKFISH] Cannot send init - worker is null!')
    }
  }, [])

  const setPosition = useCallback((fen: string) => {
    currentFenRef.current = fen
    linesMapRef.current.clear()
    setState((prev) => ({
      ...prev,
      lines: [],
      bestMove: undefined,
    }))

    if (workerRef.current) {
      workerRef.current.postMessage({
        type: 'setPosition',
        payload: { fen },
      })
    }
  }, [])

  const setPositionFromMoves = useCallback((moves: string[]) => {
    linesMapRef.current.clear()
    setState((prev) => ({
      ...prev,
      lines: [],
      bestMove: undefined,
    }))

    if (workerRef.current) {
      workerRef.current.postMessage({
        type: 'setPositionFromMoves',
        payload: { moves },
      })
    }
  }, [])

  const analyze = useCallback((params?: AnalyzeParams) => {
    linesMapRef.current.clear()
    setState((prev) => ({
      ...prev,
      thinking: true,
      lines: [],
      bestMove: undefined,
    }))

    if (workerRef.current) {
      workerRef.current.postMessage({
        type: 'analyze',
        payload: params,
      })
    }
  }, [])

  const stop = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'stop' })
    }
    setState((prev) => ({ ...prev, thinking: false }))
  }, [])

  const setOption = useCallback((name: string, value: number | string) => {
    if (workerRef.current) {
      workerRef.current.postMessage({
        type: 'setOption',
        payload: { name, value },
      })
    }
  }, [])

  const newGame = useCallback(() => {
    linesMapRef.current.clear()
    currentFenRef.current = ''
    setState((prev) => ({
      ...prev,
      lines: [],
      bestMove: undefined,
      thinking: false,
    }))

    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'newGame' })
    }
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
