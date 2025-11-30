import { useEffect, useRef } from 'react'
import { useGameStore } from '../../store/gameStore'

/**
 * Hook to automatically play chess lines move by move
 * This hook monitors the playingLine state and automatically advances
 * to the next move after the specified delay
 */
export function useLinePlayer() {
  const playingLine = useGameStore((state) => state.playingLine)
  const nextLineMove = useGameStore((state) => state.nextLineMove)
  const stopPlayingLine = useGameStore((state) => state.stopPlayingLine)

  const timeoutRef = useRef<number | null>(null)

  useEffect(() => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    // Only auto-play if we have a line and it's in playing status
    if (!playingLine || playingLine.status !== 'playing') {
      return
    }

    // Check if we've reached the end of the line
    if (playingLine.currentMoveIndex >= playingLine.line.moves.length) {
      // Line is complete, stop playback
      stopPlayingLine()
      return
    }

    // Schedule the next move
    timeoutRef.current = window.setTimeout(() => {
      const success = nextLineMove()
      if (!success) {
        // If move failed, stop playback
        stopPlayingLine()
      }
    }, playingLine.moveDelay)

    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [playingLine, nextLineMove, stopPlayingLine])

  // Return controls for manual interaction
  return {
    isPlaying: playingLine?.status === 'playing',
    isPaused: playingLine?.status === 'paused',
    currentLine: playingLine?.line,
    currentMoveIndex: playingLine?.currentMoveIndex ?? 0,
    totalMoves: playingLine?.line.moves.length ?? 0,
  }
}
