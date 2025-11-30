import { useGameStore } from '../store/gameStore'

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
    resetGame,
    undoMove,
    redoMove,
    flipOrientation,
    updateSettings,
  } = useGameStore()

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
