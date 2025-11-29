import React, { useEffect, useState } from 'react'
import { PvLine } from '../engine/useStockfish'
import { useGameStore } from '../store/gameStore'
import { formatScore } from '../utils/eval'

interface LineExplorerProps {
  lines: PvLine[]
  currentFen: string
}

export const LineExplorer: React.FC<LineExplorerProps> = ({ lines, currentFen }) => {
  const [selectedLineIndex, setSelectedLineIndex] = useState(0)
  const { showPvLine, hidePvLine, nextPvMove, prevPvMove, displayedPvLine } = useGameStore()

  // Take the top 3 lines
  const topLines = lines.slice(0, 3)

  useEffect(() => {
    // When component mounts or selected line changes, show the selected line
    if (topLines.length > 0 && selectedLineIndex < topLines.length) {
      const selectedLine = topLines[selectedLineIndex]
      showPvLine(currentFen, selectedLine.pv)
    }

    // Cleanup: hide line when component unmounts
    return () => {
      hidePvLine()
    }
  }, [selectedLineIndex, currentFen])

  useEffect(() => {
    // Handle keyboard navigation
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        nextPvMove()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        prevPvMove()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [nextPvMove, prevPvMove])

  const handleLineClick = (index: number) => {
    setSelectedLineIndex(index)
  }

  if (topLines.length === 0) {
    return null
  }

  const getCurrentMoveIndex = () => {
    return displayedPvLine?.currentIndex ?? 0
  }

  const formatMoves = (line: PvLine) => {
    const moves = line.san || line.pv
    if (moves.length === 0) return 'No moves'

    // Format as numbered moves (1. e4 e5 2. Nf3 Nc6...)
    const formatted: string[] = []
    for (let i = 0; i < moves.length; i += 2) {
      const moveNum = Math.floor(i / 2) + 1
      const whiteMove = moves[i]
      const blackMove = moves[i + 1]
      if (blackMove) {
        formatted.push(`${moveNum}. ${whiteMove} ${blackMove}`)
      } else {
        formatted.push(`${moveNum}. ${whiteMove}`)
      }
    }
    return formatted.join(' ')
  }

  return (
    <div className="mt-3 p-3 bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg border border-slate-700 shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-amber-400">Top Lines</h3>
        <div className="text-xs text-slate-400">
          Use ← → to navigate moves
        </div>
      </div>

      <div className="space-y-2">
        {topLines.map((line, index) => {
          const isSelected = index === selectedLineIndex
          const currentMoveIndex = isSelected ? getCurrentMoveIndex() : 0
          const totalMoves = line.pv.length

          return (
            <div
              key={line.multipv}
              onClick={() => handleLineClick(index)}
              className={`p-3 rounded-lg cursor-pointer transition-all ${
                isSelected
                  ? 'bg-gradient-to-r from-amber-900/40 to-amber-800/30 border-2 border-amber-500/50 shadow-md'
                  : 'bg-slate-800/50 border border-slate-700 hover:border-slate-600 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400">
                    Line {line.multipv}
                  </span>
                  <span
                    className={`text-sm font-bold ${
                      line.score.value > 0
                        ? 'text-green-400'
                        : line.score.value < 0
                        ? 'text-red-400'
                        : 'text-slate-300'
                    }`}
                  >
                    {formatScore(line.score)}
                  </span>
                </div>
                {isSelected && (
                  <div className="text-xs text-amber-400 font-medium">
                    Move {currentMoveIndex + 1} / {totalMoves}
                  </div>
                )}
              </div>

              <div className="text-sm text-slate-300 font-mono leading-relaxed">
                {formatMoves(line)}
              </div>

              {isSelected && totalMoves > 0 && (
                <div className="mt-2">
                  <div className="w-full bg-slate-700 rounded-full h-1.5">
                    <div
                      className="bg-gradient-to-r from-amber-500 to-amber-400 h-1.5 rounded-full transition-all duration-200"
                      style={{
                        width: `${((currentMoveIndex + 1) / totalMoves) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-3 text-xs text-slate-500 text-center">
        Click a line to explore it • Use arrow keys to navigate
      </div>
    </div>
  )
}
