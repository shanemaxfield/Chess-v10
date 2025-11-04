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

class StockfishService {
  private worker: Worker | null = null
  private state: StockfishState = {
    ready: false,
    thinking: false,
    lines: [],
    raw: [],
  }
  private listeners: Set<(state: StockfishState) => void> = new Set()
  private linesMap = new Map<number, PvLine>()
  private isEngineLoading: boolean = false
  private isInitialized: boolean = false
  private currentFen: string = ''

  constructor() {
    if (this.isInitialized) {
      this.debug('Stockfish service already initialized, skipping.')
      return
    }
    this.isInitialized = true
    this.loadStockfish()
  }

  private debug(msg: string) {
    console.log(`[STOCKFISH SERVICE] ${msg}`)
  }

  private updateState(newState: Partial<StockfishState>) {
    this.state = { ...this.state, ...newState }
    this.listeners.forEach((listener) => listener(this.state))
  }

  public getState(): StockfishState {
    return this.state
  }

  public subscribe(listener: (state: StockfishState) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private async loadStockfish() {
    if (this.isEngineLoading || this.worker) {
      this.debug('Stockfish is already loading or loaded, skipping.')
      return
    }
    this.isEngineLoading = true
    this.updateState({ ready: false, error: undefined })

    this.debug('Creating Stockfish worker...')
    console.log('[STOCKFISH SERVICE] VERIFICATION: Single initialization check')

    try {
      // Create a classic Web Worker
      this.worker = new Worker(new URL('./stockfish.worker.js', import.meta.url))
      
      this.worker.onmessage = (e) => {
        const { type, data, line } = e.data
        this.debug(`Worker message: ${type}`, data || line)
        this.debug(`Full message data:`, e.data)
        
        switch (type) {
                case 'ready':
                  this.debug('Engine is ready!')
                  this.updateState({ ready: true })
                  this.isEngineLoading = false
                  // Position and analysis will be triggered by App.tsx useEffect when FEN changes
                  break
            
          case 'error':
            this.debug(`Worker error: ${data}`)
            this.updateState({ error: data, ready: false })
            this.isEngineLoading = false
            break
            
          case 'engineLine':
            this.debug(`Received engine line: ${data || line}`)
            this.handleEngineLine(data || line)
            break
        }
      }
      
      this.worker.onerror = (error) => {
        this.debug(`Worker error: ${error}`)
        this.updateState({ error: 'Worker error', ready: false })
        this.isEngineLoading = false
      }
      
    } catch (error: any) {
      this.debug(`Failed to create worker: ${error}`)
      this.updateState({ error: `Failed to create worker: ${error.message}`, ready: false })
      this.isEngineLoading = false
    }
  }

  private handleEngineLine(line: string) {
    if (!line || typeof line !== 'string') {
      this.debug(`Skipping invalid line: ${line}`)
      return
    }
    this.updateState({ raw: [...this.state.raw.slice(-99), line] }) // Keep last 100 lines
    this.debug(`Processing engine line: ${line}`)

    if (line === 'uciok') {
      this.debug('Received uciok, sending isready')
      this.worker?.postMessage({ type: 'init' })
    } else if (line === 'readyok') {
      if (!this.state.ready) {
        this.debug('Engine is ready!')
        this.updateState({ ready: true })
      }
    } else if (line.startsWith('bestmove ')) {
      const parts = line.split(' ')
      const move = parts[1]
      this.debug(`Best move: ${move}`)
      this.updateState({ bestMove: move, thinking: false })
    } else if (line.startsWith('info ')) {
      this.debug(`Parsing info line: ${line}`)
      const info = parseInfoLine(line)
      this.debug(`Parsed info:`, info)
      
      if (info && info.multipv && info.score && info.pv && info.depth) {
        this.debug(`Valid info line - multipv: ${info.multipv}, depth: ${info.depth}, score: ${info.score.value}`)
        const multipv = info.multipv
        const existing = this.linesMap.get(multipv)
        if (!existing || info.depth >= existing.depth) {
          // Convert UCI moves to SAN notation
          const sanMoves = this.convertPvToSan(info.pv)
          
          const pvLine: PvLine = {
            multipv,
            score: info.score,
            depth: info.depth,
            seldepth: info.seldepth,
            pv: info.pv,
            san: sanMoves.length > 0 ? sanMoves : undefined,
            nodes: info.nodes,
            nps: info.nps,
            time: info.time,
          }
          this.linesMap.set(multipv, pvLine)
          const allLines = Array.from(this.linesMap.values()).sort((a, b) => a.multipv - b.multipv)
          this.debug(`Updated lines:`, allLines)
          this.debug(`Calling updateState with ${allLines.length} lines`)
          this.updateState({ lines: allLines })
          this.debug(`State after updateState:`, this.state.lines.length)
        }
      } else {
        this.debug(`Info line missing required fields:`, info)
      }
    } else {
      this.debug(`Unhandled line: ${line}`)
    }
  }

  public init(options?: StockfishOptions) {
    if (!this.state.ready) {
      this.debug('Engine not ready yet')
      // Queue options to be set once ready
      setTimeout(() => this.init(options), 50)
      return
    }
    const { multiPv = 3, threads = 1, skill } = options || {}
    // Don't set skill level for deterministic analysis (removes randomness)
    // Skill level introduces variability in recommendations
    this.debug(`Setting options: MultiPV=${multiPv}, Threads=${threads}${skill !== undefined ? `, Skill=${skill}` : ''}`)
    this.worker?.postMessage({ type: 'init', data: { multiPv, threads, skill } })
  }

  public setPosition(fen: string) {
    // Store current FEN for SAN conversion
    this.currentFen = fen
    
    // Stop any ongoing analysis
    if (this.state.thinking) {
      this.stop()
    }
    
    this.linesMap.clear()
    this.updateState({ lines: [], bestMove: undefined })
    if (this.state.ready) {
      this.worker?.postMessage({ type: 'setPosition', data: fen })
      // Automatically start analysis after setting position
      // Use a small delay to ensure position is set before analysis starts
      setTimeout(() => {
        this.analyze({ depth: 20 }) // Default depth for auto-analysis
      }, 100)
    } else {
      this.debug('Engine not ready yet')
      setTimeout(() => this.setPosition(fen), 50)
    }
  }

  public setPositionFromMoves(moves: string[]) {
    // Reconstruct FEN from moves for SAN conversion
    try {
      const tempChess = new Chess()
      moves.forEach(move => {
        if (move.length >= 4) {
          const from = move.substring(0, 2)
          const to = move.substring(2, 4)
          const promotion = move.length > 4 ? move.substring(4, 5) : undefined
          tempChess.move({ from, to, promotion: promotion as any })
        }
      })
      this.currentFen = tempChess.fen()
    } catch {
      this.currentFen = new Chess().fen()
    }
    
    // Stop any ongoing analysis
    if (this.state.thinking) {
      this.stop()
    }
    
    this.linesMap.clear()
    this.updateState({ lines: [], bestMove: undefined })
    if (this.state.ready) {
      this.worker?.postMessage({ type: 'setPositionFromMoves', data: moves })
      // Automatically start analysis after setting position
      setTimeout(() => {
        this.analyze({ depth: 20 }) // Default depth for auto-analysis
      }, 100)
    } else {
      this.debug('Engine not ready yet')
      setTimeout(() => this.setPositionFromMoves(moves), 50)
    }
  }

  public analyze(params?: AnalyzeParams) {
    this.linesMap.clear()
    this.updateState({ thinking: true, lines: [], bestMove: undefined })
    if (this.state.ready) {
      this.worker?.postMessage({ type: 'analyze', data: params })
    } else {
      this.debug('Engine not ready yet')
      setTimeout(() => this.analyze(params), 50)
    }
  }

  public stop() {
    if (this.state.ready) {
      this.worker?.postMessage({ type: 'stop' })
    }
    this.updateState({ thinking: false })
  }

  public setOption(name: string, value: number | string) {
    if (this.state.ready) {
      this.worker?.postMessage({ type: 'setOption', data: { name, value } })
    } else {
      this.debug('Engine not ready yet')
      setTimeout(() => this.setOption(name, value), 50)
    }
  }

  public newGame() {
    // Reset FEN to starting position
    this.currentFen = new Chess().fen()
    
    // Stop any ongoing analysis
    if (this.state.thinking) {
      this.stop()
    }
    
    this.linesMap.clear()
    this.updateState({ lines: [], bestMove: undefined, thinking: false })
    if (this.state.ready) {
      this.worker?.postMessage({ type: 'newGame' })
      // Auto-analyze starting position after new game
      setTimeout(() => {
        this.analyze({ depth: 20 })
      }, 200)
    } else {
      this.debug('Engine not ready yet')
      setTimeout(() => this.newGame(), 50)
    }
  }

  // Convert UCI moves to SAN notation
  private convertPvToSan(pv: string[]): string[] {
    if (!this.currentFen) return []
    
    try {
      const tempChess = new Chess(this.currentFen)
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
  }
}

export const stockfishService = new StockfishService()