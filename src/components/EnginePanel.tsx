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
  const [multiPv, setMultiPv] = useState(5)
  const [depth, setDepth] = useState(20)
  const [movetimeMs, setMovetimeMs] = useState(0)
  const [threads, setThreads] = useState(1)
  const [selectedPvIndex, setSelectedPvIndex] = useState<number | null>(null)
  const [expandedPvIndex, setExpandedPvIndex] = useState<number | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  
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

  // Unused function - kept for potential future use
  // const handleClearSelection = () => {
  //   setSelectedPvIndex(null)
  //   if (onClearPreview) {
  //     onClearPreview()
  //   }
  // }

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
    <div className="panel-elegant p-3 flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-stone-400" fill="currentColor" viewBox="0 0 20 20">
            <path d="M13 7H7v6h6V7z" />
            <path
              fillRule="evenodd"
              d="M7 2a1 1 0 012 0v1h2V2a1 1 0 112 0v1h2a2 2 0 012 2v2h1a1 1 0 110 2h-1v2h1a1 1 0 110 2h-1v2a2 2 0 01-2 2h-2v1a1 1 0 11-2 0v-1H9v1a1 1 0 11-2 0v-1H5a2 2 0 01-2-2v-2H2a1 1 0 110-2h1V9H2a1 1 0 010-2h1V5a2 2 0 012-2h2V2zM5 5h10v10H5V5z"
              clipRule="evenodd"
            />
          </svg>
          <h2 className="text-sm font-semibold text-stone-100">
            Stockfish
          </h2>
          {engine.thinking && (
            <div className="flex items-center gap-1.5">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-amber-400"></div>
              <span className="text-xs text-amber-400">
                d{engine.lines[0]?.depth || 0}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleUseBestMove}
            disabled={!engine.bestMove || engine.thinking}
            className="px-2 py-1 text-xs btn-success"
          >
            Use Best
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="px-2 py-1 text-xs btn-secondary"
          >
            {showSettings ? 'Hide' : 'Settings'}
          </button>
        </div>
      </div>

      {engine.error && (
        <div className="mb-2 p-2 bg-red-900/30 text-red-300 rounded text-xs border border-red-800">
          {engine.error}
        </div>
      )}

      {/* PV Lines - Compact horizontal scrollable */}
      <div className="flex-1 overflow-y-auto mb-2 elegant-scrollbar">
        {engine.lines.length === 0 && !engine.thinking ? (
          <p className="text-stone-400 text-xs text-center py-4">
            Analysis starts automatically
          </p>
        ) : (
          <div className="space-y-1.5">
            {engine.lines.slice(0, 3).map((line, index) => {
              const isExpanded = expandedPvIndex === index
              const isActiveLine = displayedPvLine && expandedPvIndex === index
              const currentMoveIndex = isActiveLine ? displayedPvLine.currentIndex : null
              const totalMoves = isActiveLine ? displayedPvLine.positions.length : null

              return (
                <div
                  key={line.multipv}
                  className={`rounded transition-all border ${
                    selectedPvIndex === index
                      ? 'bg-amber-900/20 border-amber-700'
                      : 'bg-slate-800/50 border-slate-700'
                  }`}
                >
                  <div
                    onClick={() => handlePvClick(line, index)}
                    className="p-2 cursor-pointer flex items-center justify-between gap-2 hover:bg-opacity-80"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span
                        className={`font-mono font-bold text-sm whitespace-nowrap ${
                          line.score.type === 'mate'
                            ? 'text-red-400'
                            : line.score.value > 0
                            ? 'text-emerald-400'
                            : 'text-amber-400'
                        }`}
                      >
                        {formatScore(line.score, isWhiteToMove, true)}
                      </span>
                      <div className="text-xs text-stone-300 truncate">
                        {line.san && line.san.length > 0 ? (
                          <span>{line.san.slice(0, 8).join(' ')}</span>
                        ) : (
                          <span className="text-stone-500">
                            {line.pv.slice(0, 8).join(' ')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-stone-400 whitespace-nowrap bg-slate-700 px-1.5 py-0.5 rounded">
                        d{line.depth}
                      </span>
                      <button
                        onClick={(e) => handleTogglePvLine(line, index, e)}
                        className="px-1.5 py-0.5 text-xs bg-amber-600 hover:bg-amber-700 text-white rounded transition-colors"
                        title={isExpanded ? "Hide line" : "Show line"}
                      >
                        {isExpanded ? '▼' : '▶'}
                      </button>
                    </div>
                  </div>

                  {isExpanded && isActiveLine && totalMoves !== null && (
                    <div className="px-2 pb-2 border-t border-slate-600 pt-2 flex items-center justify-between gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          prevPvMove()
                        }}
                        disabled={currentMoveIndex === 0}
                        className="px-2 py-1 text-xs btn-secondary"
                      >
                        ◀
                      </button>
                      <span className="text-xs text-stone-400 font-medium">
                        {currentMoveIndex !== null ? currentMoveIndex + 1 : 0} / {totalMoves}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          nextPvMove()
                        }}
                        disabled={currentMoveIndex !== null && currentMoveIndex >= totalMoves - 1}
                        className="px-2 py-1 text-xs btn-secondary"
                      >
                        ▶
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Settings - Collapsible */}
      {showSettings && (
        <div className="space-y-2 p-2 bg-slate-800/50 rounded border border-slate-700">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium mb-1 text-stone-300">
                Lines: {multiPv}
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={multiPv}
                onChange={(e) => handleMultiPvChange(parseInt(e.target.value))}
                className="w-full h-1.5 accent-amber-600"
                disabled={engine.thinking}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-stone-300">
                Depth: {depth}
              </label>
              <input
                type="range"
                min="8"
                max="50"
                value={depth}
                onChange={(e) => setDepth(parseInt(e.target.value))}
                className="w-full h-1.5 accent-amber-600"
                disabled={engine.thinking || movetimeMs > 0}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAnalyze}
              disabled={engine.thinking}
              className="flex-1 btn-primary text-xs py-1"
            >
              Analyze
            </button>
            <button
              onClick={handleStop}
              disabled={!engine.thinking}
              className="flex-1 btn-danger text-xs py-1"
            >
              Stop
            </button>
            <button
              onClick={handleNewGame}
              className="flex-1 btn-secondary text-xs py-1"
            >
              New
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default EnginePanel
