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
    <div className="mt-6 w-full max-w-2xl">
      {/* Game Status */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-4">
        <p className="text-center text-lg font-semibold">{getGameStatus()}</p>
      </div>

      {/* Control Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
          onClick={resetGame}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
        >
          New Game
        </button>
        <button
          onClick={undoMove}
          disabled={!canUndo}
          className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Undo
        </button>
        <button
          onClick={redoMove}
          disabled={!canRedo}
          className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Redo
        </button>
        <button
          onClick={flipOrientation}
          className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition-colors"
        >
          Flip Board
        </button>
      </div>

      {/* Sound Settings */}
      <div className="mt-4 bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
        <div className="flex items-center justify-between mb-2">
          <label htmlFor="sound-toggle" className="font-medium">
            Sound Effects
          </label>
          <input
            id="sound-toggle"
            type="checkbox"
            checked={settings.soundEnabled}
            onChange={(e) => updateSettings({ soundEnabled: e.target.checked })}
            className="w-5 h-5 rounded"
          />
        </div>
        {settings.soundEnabled && (
          <div className="flex items-center gap-3">
            <label htmlFor="volume" className="text-sm">
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
              className="flex-1"
            />
            <span className="text-sm w-12">{Math.round(settings.soundVolume * 100)}%</span>
          </div>
        )}
      </div>

      {/* Keyboard Cheat Sheet */}
      <div className="mt-4 bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
        <h3 className="font-semibold mb-2">Keyboard Controls</h3>
        <div className="text-sm space-y-1 text-gray-700 dark:text-gray-300">
          <p><kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded">Arrow Keys</kbd> - Move cursor</p>
          <p><kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded">Enter/Space</kbd> - Select/Move piece</p>
          <p><kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded">Esc</kbd> - Cancel selection</p>
        </div>
      </div>
    </div>
  )
}

export default Controls
