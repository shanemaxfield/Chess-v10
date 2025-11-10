import { useState, useEffect } from 'react'
import { UseStockfishReturn, PvLine } from '../engine/useStockfish'
import { formatScore } from '../utils/eval'
import { useGameStore } from '../store/gameStore'

interface EnginePanelProps {
  engine: UseStockfishReturn
  isWhiteToMove: boolean
  onUseBestMove?: () => void
  onPreviewPv?: (movesUci: string[]) => void
  onClearPreview?: () => void
}

function EnginePanel({
  engine,
  isWhiteToMove,
  onUseBestMove,
  onPreviewPv,
  onClearPreview,
}: EnginePanelProps) {
  const [multiPv, setMultiPv] = useState(3)
  const [depth, setDepth] = useState(20)
  const [movetimeMs, setMovetimeMs] = useState(0)
  const [threads, setThreads] = useState(1)
  const [selectedPvIndex, setSelectedPvIndex] = useState<number | null>(null)
  const [expandedPvIndex, setExpandedPvIndex] = useState<number | null>(null)
  
  const { chess, showPvLine, hidePvLine, nextPvMove, prevPvMove, displayedPvLine } = useGameStore()

  // Sync expanded state with displayed line
  useEffect(() => {
    if (!displayedPvLine && expandedPvIndex !== null) {
      setExpandedPvIndex(null)
    }
  }, [displayedPvLine, expandedPvIndex])

  // Note: Engine is auto-initialized by useStockfish hook
  // We only need to update options when user changes them

  const handleMultiPvChange = (value: number) => {
    setMultiPv(value)
    engine.setOption('MultiPV', value)
  }

  const handleThreadsChange = (value: number) => {
    setThreads(value)
    engine.setOption('Threads', value)
  }

  const handleAnalyze = () => {
    if (movetimeMs > 0) {
      engine.analyze({ movetimeMs })
    } else {
      engine.analyze({ depth })
    }
  }

  const handleStop = () => {
    engine.stop()
  }

  const handleUseBestMove = () => {
    if (onUseBestMove) {
      onUseBestMove()
    }
  }

  const handleNewGame = () => {
    engine.newGame()
    setSelectedPvIndex(null)
    if (onClearPreview) {
      onClearPreview()
    }
  }

  const handlePvClick = (line: PvLine, index: number) => {
    setSelectedPvIndex(index)
    if (onPreviewPv) {
      onPreviewPv(line.pv)
    }
  }

  const handleClearSelection = () => {
    setSelectedPvIndex(null)
    if (onClearPreview) {
      onClearPreview()
    }
  }

  const handleTogglePvLine = (line: PvLine, index: number, e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (expandedPvIndex === index) {
      // Hide the line
      hidePvLine()
      setExpandedPvIndex(null)
    } else {
      // Show the line
      const currentFen = chess.fen()
      showPvLine(currentFen, line.pv)
      setExpandedPvIndex(index)
      setSelectedPvIndex(index)
    }
  }

  if (!engine.ready) {
    return (
      <div className="panel-elegant p-6">
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
          <span className="ml-3 text-stone-600 dark:text-stone-400">
            Loading Stockfish engine...
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="panel-elegant p-5 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4 pb-4 border-b border-stone-200 dark:border-stone-700">
        <svg className="w-5 h-5 text-stone-600 dark:text-stone-400" fill="currentColor" viewBox="0 0 20 20">
          <path d="M13 7H7v6h6V7z" />
          <path
            fillRule="evenodd"
            d="M7 2a1 1 0 012 0v1h2V2a1 1 0 112 0v1h2a2 2 0 012 2v2h1a1 1 0 110 2h-1v2h1a1 1 0 110 2h-1v2a2 2 0 01-2 2h-2v1a1 1 0 11-2 0v-1H9v1a1 1 0 11-2 0v-1H5a2 2 0 01-2-2v-2H2a1 1 0 110-2h1V9H2a1 1 0 010-2h1V5a2 2 0 012-2h2V2zM5 5h10v10H5V5z"
            clipRule="evenodd"
          />
        </svg>
        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
          Engine Analysis
        </h2>
      </div>

      {engine.error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg border border-red-200 dark:border-red-800 text-sm">
          {engine.error}
        </div>
      )}

      {/* Status */}
      {engine.thinking && (
        <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 rounded-lg flex items-center gap-2 border border-amber-200 dark:border-amber-800">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-amber-600"></div>
          <span className="text-sm">
            Analyzing... Depth {engine.lines[0]?.depth || 0}
          </span>
        </div>
      )}

      {/* PV Lines */}
      <div className="flex-1 overflow-y-auto mb-4 elegant-scrollbar">
        {engine.lines.length === 0 && !engine.thinking ? (
          <p className="text-stone-500 dark:text-stone-400 text-sm text-center py-8">
            Analysis will start automatically when position changes
          </p>
        ) : (
          <div className="space-y-2">
            {engine.lines.map((line, index) => {
              const isExpanded = expandedPvIndex === index
              const isActiveLine = displayedPvLine && expandedPvIndex === index
              const currentMoveIndex = isActiveLine ? displayedPvLine.currentIndex : null
              const totalMoves = isActiveLine ? displayedPvLine.positions.length : null

              return (
                <div
                  key={line.multipv}
                  className={`rounded-lg transition-all border ${
                    selectedPvIndex === index
                      ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700'
                      : 'bg-stone-50 dark:bg-stone-800/50 border-stone-200 dark:border-stone-700'
                  }`}
                >
                  <div
                    onClick={() => handlePvClick(line, index)}
                    className="p-3 cursor-pointer flex items-center justify-between gap-3 hover:bg-opacity-80"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span
                        className={`font-mono font-bold text-base whitespace-nowrap ${
                          line.score.type === 'mate'
                            ? 'text-red-600 dark:text-red-400'
                            : line.score.value > 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {formatScore(line.score, isWhiteToMove, true)}
                      </span>
                      <div className="text-sm text-stone-700 dark:text-stone-300 truncate">
                        {line.san && line.san.length > 0 ? (
                          <span>{line.san.slice(0, 10).join(' ')}</span>
                        ) : (
                          <span className="text-stone-500">
                            {line.pv.slice(0, 10).join(' ')}
                          </span>
                        )}
                        {line.pv.length > 10 && (
                          <span className="text-stone-500 dark:text-stone-400">...</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-stone-500 dark:text-stone-400 whitespace-nowrap bg-stone-100 dark:bg-stone-700 px-2 py-0.5 rounded">
                        d{line.depth}
                      </span>
                      <button
                        onClick={(e) => handleTogglePvLine(line, index, e)}
                        className="px-2 py-1 text-xs bg-amber-500 hover:bg-amber-600 text-white rounded transition-colors"
                        title={isExpanded ? "Hide line" : "Show line"}
                      >
                        {isExpanded ? '▼' : '▶'}
                      </button>
                    </div>
                  </div>

                  {isExpanded && isActiveLine && totalMoves !== null && (
                    <div className="px-3 pb-3 border-t border-stone-200 dark:border-stone-600 pt-2 flex items-center justify-between gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          prevPvMove()
                        }}
                        disabled={currentMoveIndex === 0}
                        className="px-3 py-1.5 text-xs btn-secondary"
                      >
                        ◀ Prev
                      </button>
                      <span className="text-xs text-stone-600 dark:text-stone-400 font-medium">
                        {currentMoveIndex !== null ? currentMoveIndex + 1 : 0} / {totalMoves}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          nextPvMove()
                        }}
                        disabled={currentMoveIndex !== null && currentMoveIndex >= totalMoves - 1}
                        className="px-3 py-1.5 text-xs btn-secondary"
                      >
                        Next ▶
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Settings */}
      <div className="space-y-3 mb-4 p-3 bg-stone-50 dark:bg-stone-800/50 rounded-lg border border-stone-200 dark:border-stone-700">
        {/* MultiPV */}
        <div>
          <label className="block text-xs font-medium mb-1.5 text-stone-700 dark:text-stone-300">
            Lines (MultiPV): <span className="text-amber-600 dark:text-amber-400">{multiPv}</span>
          </label>
          <input
            type="range"
            min="1"
            max="30"
            value={multiPv}
            onChange={(e) => handleMultiPvChange(parseInt(e.target.value))}
            className="w-full h-2 accent-amber-600"
            disabled={engine.thinking}
          />
          <div className="flex justify-between text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            <span>1</span>
            <span>30</span>
          </div>
        </div>

        {/* Depth */}
        <div>
          <label className="block text-xs font-medium mb-1.5 text-stone-700 dark:text-stone-300">
            Depth: <span className="text-amber-600 dark:text-amber-400">{depth}</span>
          </label>
          <input
            type="range"
            min="8"
            max="50"
            value={depth}
            onChange={(e) => setDepth(parseInt(e.target.value))}
            className="w-full h-2 accent-amber-600"
            disabled={engine.thinking || movetimeMs > 0}
          />
          <div className="flex justify-between text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            <span>8</span>
            <span>50</span>
          </div>
        </div>

        {/* Time */}
        <div>
          <label className="block text-xs font-medium mb-1.5 text-stone-700 dark:text-stone-300">
            Time (ms) {movetimeMs > 0 && <span className="text-amber-600">✓</span>}
          </label>
          <input
            type="number"
            min="0"
            max="60000"
            step="100"
            value={movetimeMs}
            onChange={(e) => setMovetimeMs(parseInt(e.target.value) || 0)}
            className="w-full px-3 py-1.5 border border-stone-300 dark:border-stone-600 rounded-lg text-sm bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
            disabled={engine.thinking}
            placeholder="0 = use depth"
          />
        </div>

        {/* Threads */}
        <div>
          <label className="block text-xs font-medium mb-1.5 text-stone-700 dark:text-stone-300 flex items-center gap-1">
            Threads: <span className="text-amber-600 dark:text-amber-400">{threads}</span>
            <span
              className="text-xs text-stone-400 cursor-help"
              title=">1 requires cross-origin isolation (COOP/COEP headers)"
            >
              ⓘ
            </span>
          </label>
          <select
            value={threads}
            onChange={(e) => handleThreadsChange(parseInt(e.target.value))}
            className="w-full px-3 py-1.5 border border-stone-300 dark:border-stone-600 rounded-lg text-sm bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
            disabled={engine.thinking}
          >
            <option value="1">1 (default)</option>
            <option value="2">2</option>
            <option value="4">4</option>
            <option value="8">8</option>
          </select>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button
          onClick={handleAnalyze}
          disabled={engine.thinking}
          className="btn-primary text-sm"
          title="Manual analysis (auto-analysis runs continuously)"
        >
          {engine.thinking ? 'Analyzing...' : 'Analyze'}
        </button>
        <button
          onClick={handleStop}
          disabled={!engine.thinking}
          className="btn-danger text-sm"
        >
          Stop
        </button>
        <button
          onClick={handleUseBestMove}
          disabled={!engine.bestMove || engine.thinking}
          className="btn-success text-sm"
        >
          Use Best
        </button>
        <button
          onClick={handleNewGame}
          className="btn-secondary text-sm"
        >
          New Game
        </button>
      </div>

      {/* Raw Output (collapsed by default) */}
      <details className="mt-4">
        <summary className="cursor-pointer text-xs text-stone-600 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 px-3 py-2 bg-stone-100 dark:bg-stone-800 rounded-lg">
          Show raw engine output
        </summary>
        <div className="mt-2 p-3 bg-stone-950 text-emerald-400 rounded-lg text-xs font-mono max-h-40 overflow-y-auto elegant-scrollbar border border-stone-700">
          {engine.raw.slice(-20).map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      </details>
    </div>
  )
}

export default EnginePanel
