import { useCallback, useRef } from 'react'
import { Square } from 'chess.js'
import { useGameStore } from '../store/gameStore'

interface UseDragResult {
  handlePointerDown: (e: React.PointerEvent, square: Square) => void
}

export function usePointerDrag(): UseDragResult {
  const { startDrag, updateDragPosition, endDrag } = useGameStore()
  const isDragging = useRef(false)

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!isDragging.current) return
      updateDragPosition(e.clientX, e.clientY)
    },
    [updateDragPosition]
  )

  const handlePointerUp = useCallback(
    (e: PointerEvent) => {
      if (!isDragging.current) return

      isDragging.current = false

      // Find the square under the pointer
      const element = document.elementFromPoint(e.clientX, e.clientY)
      const square = element?.closest('[data-square]')?.getAttribute('data-square') as Square | null

      endDrag(square)

      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
    },
    [endDrag, handlePointerMove]
  )

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, square: Square) => {
      e.preventDefault()
      isDragging.current = true

      startDrag(square, e.clientX, e.clientY)

      window.addEventListener('pointermove', handlePointerMove)
      window.addEventListener('pointerup', handlePointerUp)
      window.addEventListener('pointercancel', handlePointerUp)
    },
    [startDrag, handlePointerMove, handlePointerUp]
  )

  return {
    handlePointerDown,
  }
}
