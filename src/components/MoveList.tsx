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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Move History</h2>
        {moveHistory.length > 0 && (
          <button
            onClick={handleExportPGN}
            className="px-3 py-1 text-sm bg-green-500 hover:bg-green-600 text-white rounded transition-colors"
          >
            Export PGN
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {movePairs.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">No moves yet</p>
        ) : (
          <div className="space-y-1">
            {movePairs.map((pair) => (
              <div key={pair.moveNumber} className="flex items-center gap-2 text-sm">
                <span className="w-8 font-semibold text-gray-600 dark:text-gray-400">
                  {pair.moveNumber}.
                </span>
                <button
                  onClick={() => jumpToPly(pair.whiteIndex)}
                  className={`flex-1 px-2 py-1 rounded text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                    currentPly === pair.whiteIndex ? 'bg-blue-200 dark:bg-blue-900 font-semibold' : ''
                  }`}
                >
                  {pair.white}
                </button>
                {pair.black && (
                  <button
                    onClick={() => jumpToPly(pair.blackIndex!)}
                    className={`flex-1 px-2 py-1 rounded text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                      currentPly === pair.blackIndex ? 'bg-blue-200 dark:bg-blue-900 font-semibold' : ''
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
