import { useGameStore } from '../store/gameStore'

function MoveList() {
  const { moveHistory, currentPly, jumpToPly, exportPGN } = useGameStore()

  const handleExportPGN = () => {
    const pgn = exportPGN()
    const blob = new Blob([pgn], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'game.pgn'
    a.click()
    URL.revokeObjectURL(url)
  }

  // Group moves by pairs (white, black)
  const movePairs: Array<{ moveNumber: number; white: string; black?: string; whiteIndex: number; blackIndex?: number }> = []

  for (let i = 0; i < moveHistory.length; i++) {
    const move = moveHistory[i]
    const isWhiteMove = i % 2 === 0

    if (isWhiteMove) {
      movePairs.push({
        moveNumber: move.moveNumber,
        white: move.san,
        whiteIndex: i + 1,
      })
    } else {
      const lastPair = movePairs[movePairs.length - 1]
      if (lastPair) {
        lastPair.black = move.san
        lastPair.blackIndex = i + 1
      }
    }
  }

  return (
    <div className="panel-elegant p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Move History</h2>
        {moveHistory.length > 0 && (
          <button
            onClick={handleExportPGN}
            className="px-3 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors font-medium border border-blue-200 dark:border-blue-800"
          >
            Export PGN
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto elegant-scrollbar">
        {movePairs.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8 text-sm">No moves yet</p>
        ) : (
          <div className="space-y-1">
            {movePairs.map((pair) => (
              <div key={pair.moveNumber} className="flex items-center gap-2 text-sm">
                <span className="w-7 font-semibold text-gray-600 dark:text-gray-400 text-xs">
                  {pair.moveNumber}.
                </span>
                <button
                  onClick={() => jumpToPly(pair.whiteIndex)}
                  className={`flex-1 px-2 py-1.5 rounded-lg text-left transition-all font-medium ${
                    currentPly === pair.whiteIndex
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100 border border-blue-300 dark:border-blue-700'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {pair.white}
                </button>
                {pair.black && (
                  <button
                    onClick={() => jumpToPly(pair.blackIndex!)}
                    className={`flex-1 px-2 py-1.5 rounded-lg text-left transition-all font-medium ${
                      currentPly === pair.blackIndex
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100 border border-blue-300 dark:border-blue-700'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {pair.black}
                  </button>
                )}
                {!pair.black && <div className="flex-1" />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default MoveList
