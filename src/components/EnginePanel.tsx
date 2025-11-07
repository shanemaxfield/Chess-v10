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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-400">
            Loading Stockfish engine...
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 flex flex-col h-full">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path d="M13 7H7v6h6V7z" />
          <path
            fillRule="evenodd"
            d="M7 2a1 1 0 012 0v1h2V2a1 1 0 112 0v1h2a2 2 0 012 2v2h1a1 1 0 110 2h-1v2h1a1 1 0 110 2h-1v2a2 2 0 01-2 2h-2v1a1 1 0 11-2 0v-1H9v1a1 1 0 11-2 0v-1H5a2 2 0 01-2-2v-2H2a1 1 0 110-2h1V9H2a1 1 0 010-2h1V5a2 2 0 012-2h2V2zM5 5h10v10H5V5z"
            clipRule="evenodd"
          />
        </svg>
        Engine Analysis
      </h2>

      {engine.error && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded">
          {engine.error}
        </div>
      )}

      {/* Status */}
      {engine.thinking && (
        <div className="mb-4 p-3 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span>
            Engine thinking... Depth:{' '}
            {engine.lines[0]?.depth || 0}
          </span>
        </div>
      )}

      {/* PV Lines */}
      <div className="flex-1 overflow-y-auto mb-4">
        {engine.lines.length === 0 && !engine.thinking ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-8">
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
                  className={`rounded transition-colors ${
                    selectedPvIndex === index
                      ? 'bg-blue-200 dark:bg-blue-800'
                      : 'bg-gray-100 dark:bg-gray-700'
                  }`}
                >
                  <div
                    onClick={() => handlePvClick(line, index)}
                    className="p-2.5 cursor-pointer flex items-center justify-between gap-3 hover:bg-opacity-80"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span
                        className={`font-mono font-bold text-lg whitespace-nowrap ${
                          line.score.type === 'mate'
                            ? 'text-red-600 dark:text-red-400'
                            : line.score.value > 0
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-blue-600 dark:text-blue-400'
                        }`}
                      >
                        {formatScore(line.score, isWhiteToMove, true)}
                      </span>
                      <div className="text-sm text-gray-700 dark:text-gray-300 truncate">
                        {line.san && line.san.length > 0 ? (
                          <span>{line.san.slice(0, 10).join(' ')}</span>
                        ) : (
                          <span className="text-gray-500">
                            {line.pv.slice(0, 10).join(' ')}
                          </span>
                        )}
                        {line.pv.length > 10 && (
                          <span className="text-gray-500 dark:text-gray-400">...</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {line.depth}
                      </span>
                      <button
                        onClick={(e) => handleTogglePvLine(line, index, e)}
                        className="px-2 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
                        title={isExpanded ? "Hide line" : "Show line"}
                      >
                        {isExpanded ? '▼' : '▶'}
                      </button>
                    </div>
                  </div>
                  
                  {isExpanded && isActiveLine && totalMoves !== null && (
                    <div className="px-2.5 pb-2.5 border-t border-gray-300 dark:border-gray-600 pt-2 flex items-center justify-between gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          prevPvMove()
                        }}
                        disabled={currentMoveIndex === 0}
                        className="px-2 py-1 text-xs bg-gray-500 hover:bg-gray-600 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        ◀ Prev
                      </button>
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        Move {currentMoveIndex !== null ? currentMoveIndex + 1 : 0} / {totalMoves}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          nextPvMove()
                        }}
                        disabled={currentMoveIndex !== null && currentMoveIndex >= totalMoves - 1}
                        className="px-2 py-1 text-xs bg-gray-500 hover:bg-gray-600 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
      <div className="space-y-4 mb-4">
        {/* MultiPV */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Lines (MultiPV): {multiPv}
          </label>
          <input
            type="range"
            min="1"
            max="15"
            value={multiPv}
            onChange={(e) => handleMultiPvChange(parseInt(e.target.value))}
            className="w-full"
            disabled={engine.thinking}
          />
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>1</span>
            <span>15</span>
          </div>
        </div>

        {/* Depth */}
        <div>
          <label className="block text-sm font-medium mb-2">Depth: {depth}</label>
          <input
            type="range"
            min="8"
            max="50"
            value={depth}
            onChange={(e) => setDepth(parseInt(e.target.value))}
            className="w-full"
            disabled={engine.thinking || movetimeMs > 0}
          />
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>8</span>
            <span>50</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Note: Very deep analysis (30+) can take several minutes
          </p>
        </div>

        {/* Time */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Time (ms) {movetimeMs > 0 && `(overrides depth)`}
          </label>
          <input
            type="number"
            min="0"
            max="60000"
            step="100"
            value={movetimeMs}
            onChange={(e) => setMovetimeMs(parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
            disabled={engine.thinking}
            placeholder="0 = use depth"
          />
        </div>

        {/* Threads */}
        <div>
          <label className="block text-sm font-medium mb-2 flex items-center gap-2">
            Threads: {threads}
            <span
              className="text-xs text-gray-500 dark:text-gray-400 cursor-help"
              title=">1 requires cross-origin isolation (COOP/COEP headers)"
            >
              ⓘ
            </span>
          </label>
          <select
            value={threads}
            onChange={(e) => handleThreadsChange(parseInt(e.target.value))}
            className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
            disabled={engine.thinking}
          >
            <option value="1">1 (default)</option>
            <option value="2">2</option>
            <option value="4">4</option>
            <option value="8">8</option>
          </select>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Multi-threading requires COOP/COEP headers
          </p>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button
          onClick={handleAnalyze}
          disabled={engine.thinking}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Manual analysis (auto-analysis runs continuously)"
        >
          {engine.thinking ? 'Analyzing...' : 'Analyze (Manual)'}
        </button>
        <button
          onClick={handleStop}
          disabled={!engine.thinking}
          className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Stop
        </button>
        <button
          onClick={handleUseBestMove}
          disabled={!engine.bestMove || engine.thinking}
          className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Use Best Move
        </button>
        <button
          onClick={handleNewGame}
          className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
        >
          New Game
        </button>
      </div>

      {/* Raw Output (collapsed by default) */}
      <details className="mt-4">
        <summary className="cursor-pointer text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
          Show raw engine output
        </summary>
        <div className="mt-2 p-2 bg-gray-900 text-green-400 rounded text-xs font-mono max-h-40 overflow-y-auto">
          {engine.raw.slice(-20).map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      </details>
    </div>
  )
}

export default EnginePanel
