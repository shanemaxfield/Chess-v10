/**
 * TeachingPanel - Main interface for interactive chess teaching
 *
 * Integrates:
 * - Query input
 * - Animation controls
 * - Variation display
 * - Explanation text
 * - Board demonstration
 */

import React, { useState, useEffect, useRef } from 'react';
import { BoardController, PlaybackState, MoveStep } from '../lib/teaching/BoardController';
import { ResponseOrchestrator } from '../lib/teaching/ResponseOrchestrator';
import { getTeachingLLMService } from '../lib/teaching/TeachingLLMService';
import {
  Instruction,
  DemonstrationInstruction,
  PositionAnalysisInstruction,
  Variation,
  parseInstructionFromLLM,
} from '../lib/teaching/MoveInstructionParser';
import { VariationDisplay } from './VariationDisplay';
import { AnimationControls } from './AnimationControls';
import { useGameStore } from '../store/gameStore';

interface TeachingPanelProps {
  className?: string;
}

export const TeachingPanel: React.FC<TeachingPanelProps> = ({ className = '' }) => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [explanation, setExplanation] = useState('');
  const [currentInstruction, setCurrentInstruction] = useState<Instruction | null>(null);
  const [selectedVariation, setSelectedVariation] = useState<Variation | null>(null);
  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    isPlaying: false,
    isPaused: false,
    currentStep: -1,
    totalSteps: 0,
    canStepForward: false,
    canStepBackward: false,
  });
  const [currentSpeed, setCurrentSpeed] = useState<'slow' | 'medium' | 'fast' | 'instant'>('medium');
  const [currentMoveSAN, setCurrentMoveSAN] = useState<string>('');

  const boardControllerRef = useRef<BoardController | null>(null);
  const orchestratorRef = useRef<ResponseOrchestrator | null>(null);

  // Get game store
  const { fen, setFen, setArrows, setHighlightSquares } = useGameStore();

  // Initialize controllers
  useEffect(() => {
    if (!boardControllerRef.current) {
      boardControllerRef.current = new BoardController();

      // Set up step callback
      boardControllerRef.current.onStep((step: MoveStep, state: PlaybackState) => {
        // Update board FEN
        setFen(step.fen);
        setCurrentMoveSAN(step.san);
        setPlaybackState(state);
      });
    }

    if (!orchestratorRef.current) {
      orchestratorRef.current = new ResponseOrchestrator();

      // Set up LLM callback
      const llmService = getTeachingLLMService();
      orchestratorRef.current.setLLMCallback(async (query, context) => {
        const result = await llmService.generateInstruction(query, context);
        return result.explanation;
      });
    }
  }, [setFen]);

  /**
   * Handle query submission
   */
  const handleQuerySubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!query.trim() || !orchestratorRef.current) {
      return;
    }

    setIsLoading(true);
    setExplanation('');
    setCurrentInstruction(null);
    setSelectedVariation(null);

    try {
      // Process query through orchestrator
      const result = await orchestratorRef.current.processQuery(query, fen);

      // Set explanation
      setExplanation(result.responseText);

      // Set instruction
      if (result.instruction) {
        setCurrentInstruction(result.instruction);

        // Load moves into board controller
        if (result.instruction.type === 'opening_demonstration' || result.instruction.type === 'tactical_pattern') {
          const demoInstruction = result.instruction as DemonstrationInstruction;
          loadDemonstration(demoInstruction);
        } else if (result.instruction.type === 'position_analysis') {
          const posInstruction = result.instruction as PositionAnalysisInstruction;
          loadPositionAnalysis(posInstruction);
        }
      }
    } catch (error) {
      console.error('Query processing error:', error);
      setExplanation('Sorry, I encountered an error processing your request.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Load demonstration into board controller
   */
  const loadDemonstration = (instruction: DemonstrationInstruction) => {
    if (!boardControllerRef.current) return;

    const controller = boardControllerRef.current;

    // Load main line moves
    const success = controller.loadMoveSequence(instruction.mainLine.moves, 'san');

    if (success) {
      // Set animation config
      controller.setAnimationConfig({
        speed: currentSpeed,
        pauseAtMove: instruction.mainLine.pauseAfterMove,
      });

      // Update playback state
      setPlaybackState(controller.getPlaybackState());
    } else {
      console.error('Failed to load move sequence');
    }
  };

  /**
   * Load position analysis
   */
  const loadPositionAnalysis = (instruction: PositionAnalysisInstruction) => {
    // For position analysis, we don't auto-play moves
    // Instead, we show the variations for user to click
    setCurrentInstruction(instruction);
  };

  /**
   * Handle variation click
   */
  const handleVariationClick = (variation: Variation) => {
    if (!boardControllerRef.current) return;

    setSelectedVariation(variation);

    // Load variation moves
    const controller = boardControllerRef.current;
    controller.reset();

    const success = controller.loadMoveSequence(variation.moves, 'san');

    if (success) {
      controller.setAnimationConfig({
        speed: currentSpeed,
      });

      setPlaybackState(controller.getPlaybackState());

      // Optionally auto-play the variation
      controller.play();
    }
  };

  /**
   * Playback control handlers
   */
  const handlePlay = async () => {
    if (!boardControllerRef.current) return;
    await boardControllerRef.current.play();
    setPlaybackState(boardControllerRef.current.getPlaybackState());
  };

  const handlePause = () => {
    if (!boardControllerRef.current) return;
    boardControllerRef.current.pause();
    setPlaybackState(boardControllerRef.current.getPlaybackState());
  };

  const handleStop = () => {
    if (!boardControllerRef.current) return;
    boardControllerRef.current.stop();
    boardControllerRef.current.reset();
    setPlaybackState(boardControllerRef.current.getPlaybackState());
  };

  const handleStepForward = async () => {
    if (!boardControllerRef.current) return;
    await boardControllerRef.current.stepForward();
    setPlaybackState(boardControllerRef.current.getPlaybackState());
  };

  const handleStepBackward = async () => {
    if (!boardControllerRef.current) return;
    await boardControllerRef.current.stepBackward();
    setPlaybackState(boardControllerRef.current.getPlaybackState());
  };

  const handleSpeedChange = (speed: 'slow' | 'medium' | 'fast' | 'instant') => {
    setCurrentSpeed(speed);
    if (boardControllerRef.current) {
      boardControllerRef.current.setAnimationConfig({ speed });
    }
  };

  /**
   * Get variations from current instruction
   */
  const getVariations = (): Variation[] => {
    if (!currentInstruction) return [];

    if (currentInstruction.type === 'opening_demonstration' || currentInstruction.type === 'tactical_pattern') {
      return (currentInstruction as DemonstrationInstruction).continuations;
    } else if (currentInstruction.type === 'position_analysis') {
      return (currentInstruction as PositionAnalysisInstruction).topMoves;
    }

    return [];
  };

  return (
    <div className={`teaching-panel ${className}`}>
      {/* Query Input */}
      <div className="mb-4">
        <form onSubmit={handleQuerySubmit}>
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask me anything about chess... (e.g., 'Show me the Italian Game')"
              className="w-full px-4 py-3 pr-12 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
            >
              {isLoading ? (
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          </div>
        </form>

        {/* Quick suggestions */}
        <div className="mt-2 flex flex-wrap gap-2">
          {[
            'Show me the Italian Game',
            'What\'s the best move?',
            'Explain the Sicilian Defense',
          ].map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => setQuery(suggestion)}
              className="text-xs px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      {/* Explanation */}
      {explanation && (
        <div className="mb-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {explanation}
          </p>
        </div>
      )}

      {/* Animation Controls */}
      {playbackState.totalSteps > 0 && (
        <div className="mb-4">
          <AnimationControls
            playbackState={playbackState}
            onPlay={handlePlay}
            onPause={handlePause}
            onStop={handleStop}
            onStepForward={handleStepForward}
            onStepBackward={handleStepBackward}
            onSpeedChange={handleSpeedChange}
            currentSpeed={currentSpeed}
            currentMove={currentMoveSAN}
          />
        </div>
      )}

      {/* Variations */}
      {getVariations().length > 0 && (
        <div className="mb-4">
          <VariationDisplay
            variations={getVariations()}
            onVariationClick={handleVariationClick}
            selectedVariation={selectedVariation}
          />
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-sm text-gray-600 dark:text-gray-400">
            Processing your query...
          </span>
        </div>
      )}
    </div>
  );
};

export default TeachingPanel;
