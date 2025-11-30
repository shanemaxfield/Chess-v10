import { useGameStore } from '../store/gameStore'

export default function LinePlaybackControls() {
  const playingLine = useGameStore((state) => state.playingLine)
  const pausePlayingLine = useGameStore((state) => state.pausePlayingLine)
  const resumePlayingLine = useGameStore((state) => state.resumePlayingLine)
  const stopPlayingLine = useGameStore((state) => state.stopPlayingLine)
  const nextLineMove = useGameStore((state) => state.nextLineMove)
  const prevLineMove = useGameStore((state) => state.prevLineMove)

  if (!playingLine) return null

  const { line, currentMoveIndex, status } = playingLine
  const isPlaying = status === 'playing'
  const isPaused = status === 'paused'
  const progress = (currentMoveIndex / line.moves.length) * 100

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
      <div className="panel-elegant min-w-[500px] shadow-2xl">
        {/* Header */}
        <div className="px-5 py-3 border-b border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-blue-50/50 to-transparent dark:from-blue-950/20 dark:to-transparent">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                {line.name}
              </h4>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                {line.description}
              </p>
            </div>
            <button
              onClick={stopPlayingLine}
              className="text-xs px-3 py-1.5 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors font-medium border border-red-200 dark:border-red-800"
            >
              Stop
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="px-5 py-2">
          <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400 mb-2">
            <span>Move {currentMoveIndex} of {line.moves.length}</span>
            <span className="flex-1"></span>
            <span className="font-mono">{Math.round(progress)}%</span>
          </div>
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Controls */}
        <div className="px-5 py-3 flex items-center justify-center gap-2">
          <button
            onClick={() => prevLineMove()}
            disabled={currentMoveIndex === 0}
            className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            title="Previous move"
          >
            ⏮ Prev
          </button>

          {isPlaying ? (
            <button
              onClick={pausePlayingLine}
              className="btn-primary"
              title="Pause playback"
            >
              ⏸ Pause
            </button>
          ) : (
            <button
              onClick={resumePlayingLine}
              disabled={currentMoveIndex >= line.moves.length}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              title="Resume playback"
            >
              ▶ Play
            </button>
          )}

          <button
            onClick={() => nextLineMove()}
            disabled={currentMoveIndex >= line.moves.length}
            className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            title="Next move"
          >
            Next ⏭
          </button>
        </div>

        {/* Current Move Display */}
        <div className="px-5 py-2 border-t border-gray-200/50 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-900/50">
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
            Moves in line:
          </div>
          <div className="flex flex-wrap gap-1">
            {line.moves.map((move, index) => (
              <span
                key={index}
                className={`px-2 py-0.5 rounded text-xs font-mono ${
                  index < currentMoveIndex
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                    : index === currentMoveIndex
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-semibold'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                }`}
              >
                {move}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
