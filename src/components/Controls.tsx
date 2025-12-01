import { useGameStore } from '../store/gameStore'
import { useState } from 'react'

function Controls() {
  const {
    chess,
    isCheckmate,
    isStalemate,
    isDraw,
    isCheck,
    currentPly,
    moveHistory,
    settings,
    moveQueue,
    isPlayingSequence,
    sequenceDelay,
    resetGame,
    undoMove,
    redoMove,
    flipOrientation,
    updateSettings,
    playMoveSequence,
    stopSequence,
    setSequenceDelay,
  } = useGameStore()

  const [moveInput, setMoveInput] = useState('')

  const turn = chess.turn()
  const canUndo = currentPly > 0
  const canRedo = currentPly < moveHistory.length

  const getGameStatus = () => {
    if (isCheckmate) {
      return `Checkmate — ${turn === 'w' ? 'Black' : 'White'} wins!`
    }
    if (isStalemate) {
      return 'Stalemate — Draw'
    }
    if (isDraw) {
      return 'Draw'
    }
    if (isCheck) {
      return `Check — ${turn === 'w' ? 'White' : 'Black'} to move`
    }
    return `${turn === 'w' ? 'White' : 'Black'} to move`
  }

  const handlePlaySequence = () => {
    if (!moveInput.trim()) return

    // Use the comprehensive move sequence parser
    playMoveSequence(moveInput)
  }

  const handleStopSequence = () => {
    stopSequence()
    setMoveInput('')
  }

  return (
    <div className="w-full max-w-2xl space-y-4">
      {/* Game Status */}
      <div className="panel-elegant p-4">
        <p className="text-center text-base font-semibold text-gray-900 dark:text-gray-100">
          {getGameStatus()}
        </p>
      </div>

      {/* Control Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
          onClick={resetGame}
          className="btn-primary text-sm"
        >
          New Game
        </button>
        <button
          onClick={undoMove}
          disabled={!canUndo}
          className="btn-secondary text-sm"
        >
          ← Undo
        </button>
        <button
          onClick={redoMove}
          disabled={!canRedo}
          className="btn-secondary text-sm"
        >
          Redo →
        </button>
        <button
          onClick={flipOrientation}
          className="btn-secondary text-sm"
        >
          ⟲ Flip
        </button>
      </div>

      {/* Sound Settings */}
      <div className="panel-elegant p-4">
        <div className="flex items-center justify-between mb-3">
          <label htmlFor="sound-toggle" className="font-medium text-gray-900 dark:text-gray-100 text-sm">
            Sound Effects
          </label>
          <input
            id="sound-toggle"
            type="checkbox"
            checked={settings.soundEnabled}
            onChange={(e) => updateSettings({ soundEnabled: e.target.checked })}
            className="w-5 h-5 rounded accent-blue-600"
          />
        </div>
        {settings.soundEnabled && (
          <div className="flex items-center gap-3">
            <label htmlFor="volume" className="text-sm text-gray-700 dark:text-gray-300">
              Volume:
            </label>
            <input
              id="volume"
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={settings.soundVolume}
              onChange={(e) => updateSettings({ soundVolume: parseFloat(e.target.value) })}
              className="flex-1 accent-blue-600"
            />
            <span className="text-sm w-12 text-gray-700 dark:text-gray-300 font-medium">
              {Math.round(settings.soundVolume * 100)}%
            </span>
          </div>
        )}
      </div>

      {/* Move Sequence Demonstrator */}
      <div className="panel-elegant p-4">
        <h3 className="font-semibold mb-3 text-gray-900 dark:text-gray-100 text-sm">
          Move Sequence Demo
        </h3>
        <div className="space-y-3">
          <div>
            <label htmlFor="move-input" className="text-xs text-gray-700 dark:text-gray-300 mb-1 block">
              Enter move sequence (any format - PGN, SAN, comma/space separated):
            </label>
            <input
              id="move-input"
              type="text"
              value={moveInput}
              onChange={(e) => setMoveInput(e.target.value)}
              disabled={isPlayingSequence}
              placeholder="1. e4 e5 2. Nf3 Nc6 3. Bb5"
              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isPlayingSequence) {
                  handlePlaySequence()
                }
              }}
            />
          </div>

          <div className="flex items-center gap-3">
            <label htmlFor="delay-slider" className="text-xs text-gray-700 dark:text-gray-300">
              Delay:
            </label>
            <input
              id="delay-slider"
              type="range"
              min="500"
              max="3000"
              step="100"
              value={sequenceDelay}
              onChange={(e) => setSequenceDelay(parseInt(e.target.value))}
              disabled={isPlayingSequence}
              className="flex-1 accent-blue-600 disabled:opacity-50"
            />
            <span className="text-xs w-16 text-gray-700 dark:text-gray-300 font-medium">
              {(sequenceDelay / 1000).toFixed(1)}s
            </span>
          </div>

          <div className="flex gap-2">
            {!isPlayingSequence ? (
              <button
                onClick={handlePlaySequence}
                disabled={!moveInput.trim()}
                className="btn-primary text-sm flex-1"
              >
                ▶ Play Sequence
              </button>
            ) : (
              <button
                onClick={handleStopSequence}
                className="btn-secondary text-sm flex-1"
              >
                ⏹ Stop
              </button>
            )}
          </div>

          {moveQueue.length > 0 && !isPlayingSequence && (
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Queued: {moveQueue.map(m => m.san).join(', ')}
            </div>
          )}

          {isPlayingSequence && (
            <div className="text-xs text-blue-600 dark:text-blue-400 animate-pulse">
              Playing sequence...
            </div>
          )}
        </div>
      </div>

      {/* Keyboard Cheat Sheet */}
      <div className="panel-elegant p-4">
        <h3 className="font-semibold mb-3 text-gray-900 dark:text-gray-100 text-sm">Keyboard Controls</h3>
        <div className="text-xs space-y-2 text-gray-700 dark:text-gray-300">
          <p>
            <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600 font-mono">
              ← →
            </kbd>
            {' '}Navigate move history
          </p>
          <p>
            <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600 font-mono">
              Drag
            </kbd>
            {' '}Move pieces
          </p>
          <p>
            <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600 font-mono">
              Esc
            </kbd>
            {' '}Cancel promotion
          </p>
        </div>
      </div>
    </div>
  )
}

export default Controls
