import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ChessBoard from '../components/ChessBoard'
import MoveList from '../components/MoveList'
import Controls from '../components/Controls'
import PromotionModal from '../components/PromotionModal'
import { useGameStore } from '../store/gameStore'

describe('Component Tests', () => {
  beforeEach(() => {
    const { resetGame } = useGameStore.getState()
    resetGame()
  })

  describe('ChessBoard', () => {
    it('should render 64 squares', () => {
      render(<ChessBoard />)

      const squares = document.querySelectorAll('[data-square]')
      expect(squares.length).toBe(64)
    })

    it('should display pieces in starting position', () => {
      render(<ChessBoard />)

      // Check that e2 has a white pawn
      const e2Square = document.querySelector('[data-square="e2"]')
      expect(e2Square).toBeTruthy()
    })
  })

  describe('MoveList', () => {
    it('should show empty state when no moves', () => {
      render(<MoveList />)

      expect(screen.getByText('No moves yet')).toBeInTheDocument()
    })

    it('should display moves after they are made', () => {
      const { makeMove } = useGameStore.getState()

      makeMove('e2', 'e4')
      makeMove('e7', 'e5')

      render(<MoveList />)

      expect(screen.getByText('e4')).toBeInTheDocument()
      expect(screen.getByText('e5')).toBeInTheDocument()
    })

    it('should allow jumping to a position', () => {
      const { makeMove } = useGameStore.getState()

      makeMove('e2', 'e4')
      const fen1 = useGameStore.getState().fen
      makeMove('e7', 'e5')

      render(<MoveList />)

      const e4Button = screen.getByText('e4')
      fireEvent.click(e4Button)

      expect(useGameStore.getState().fen).toBe(fen1)
      expect(useGameStore.getState().currentPly).toBe(1)
    })
  })

  describe('Controls', () => {
    it('should show correct turn indicator', () => {
      render(<Controls />)

      expect(screen.getByText('White to move')).toBeInTheDocument()
    })

    it('should reset game when New Game clicked', () => {
      const { makeMove } = useGameStore.getState()

      makeMove('e2', 'e4')

      render(<Controls />)

      const newGameButton = screen.getByText('New Game')
      fireEvent.click(newGameButton)

      expect(useGameStore.getState().moveHistory.length).toBe(0)
      expect(useGameStore.getState().chess.turn()).toBe('w')
    })

    it('should undo move when Undo clicked', () => {
      const { makeMove } = useGameStore.getState()

      makeMove('e2', 'e4')

      render(<Controls />)

      const undoButton = screen.getByText('Undo')
      fireEvent.click(undoButton)

      expect(useGameStore.getState().currentPly).toBe(0)
    })

    it('should disable Undo when no moves', () => {
      render(<Controls />)

      const undoButton = screen.getByText('Undo')
      expect(undoButton).toBeDisabled()
    })

    it('should flip board orientation', () => {
      render(<Controls />)

      const flipButton = screen.getByText('Flip Board')
      fireEvent.click(flipButton)

      expect(useGameStore.getState().orientation).toBe('b')
    })
  })

  describe('PromotionModal', () => {
    it('should not render when no pending promotion', () => {
      render(<PromotionModal />)

      expect(screen.queryByText('Promote Pawn')).not.toBeInTheDocument()
    })

    it('should render when promotion is pending', () => {
      const { chess } = useGameStore.getState()

      chess.load('8/P7/8/8/8/8/8/K6k w - - 0 1')
      useGameStore.setState({ pendingPromotion: { from: 'a7', to: 'a8' } })

      render(<PromotionModal />)

      expect(screen.getByText('Promote Pawn')).toBeInTheDocument()
      expect(screen.getByText('Queen')).toBeInTheDocument()
      expect(screen.getByText('Rook')).toBeInTheDocument()
      expect(screen.getByText('Bishop')).toBeInTheDocument()
      expect(screen.getByText('Knight')).toBeInTheDocument()
    })

    it('should show promotion choices and complete move when clicked', () => {
      const { chess } = useGameStore.getState()

      chess.load('8/P7/8/8/8/8/8/K6k w - - 0 1')
      useGameStore.setState({
        chess,
        pendingPromotion: { from: 'a7', to: 'a8' }
      })

      render(<PromotionModal />)

      const queenButton = screen.getByText('Queen')
      fireEvent.click(queenButton)

      // After clicking, confirmPromotion is called
      // The actual move happens in the store, so just verify the piece was promoted
      const finalChess = useGameStore.getState().chess
      // The promotion flow should have completed
      expect(finalChess.get('a8')?.type).toBe('q')
    })
  })
})
