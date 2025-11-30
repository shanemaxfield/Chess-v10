/**
 * AnimationControls - UI controls for board animation playback
 *
 * Features:
 * - Play/Pause/Stop buttons
 * - Step forward/backward
 * - Speed control (slow/medium/fast/instant)
 * - Progress indicator
 * - Current move display
 */

import React from 'react';
import { PlaybackState } from '../lib/teaching/BoardController';

interface AnimationControlsProps {
  playbackState: PlaybackState;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onStepForward: () => void;
  onStepBackward: () => void;
  onSpeedChange: (speed: 'slow' | 'medium' | 'fast' | 'instant') => void;
  currentSpeed: 'slow' | 'medium' | 'fast' | 'instant';
  currentMove?: string; // SAN notation of current move
}

export const AnimationControls: React.FC<AnimationControlsProps> = ({
  playbackState,
  onPlay,
  onPause,
  onStop,
  onStepForward,
  onStepBackward,
  onSpeedChange,
  currentSpeed,
  currentMove,
}) => {
  const { isPlaying, currentStep, totalSteps, canStepForward, canStepBackward } = playbackState;

  // Calculate progress percentage
  const progress = totalSteps > 0 ? ((currentStep + 1) / totalSteps) * 100 : 0;

  return (
    <div className="animation-controls bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
            Move {currentStep + 1} of {totalSteps}
          </span>
          {currentMove && (
            <span className="text-xs font-mono font-semibold text-gray-800 dark:text-gray-200">
              {currentMove}
            </span>
          )}
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Playback controls */}
      <div className="flex items-center justify-center gap-2 mb-3">
        {/* Step Backward */}
        <button
          onClick={onStepBackward}
          disabled={!canStepBackward}
          className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Step Backward"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-gray-700 dark:text-gray-300"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M8.445 14.832A1 1 0 0010 14v-2.798l5.445 3.63A1 1 0 0017 14V6a1 1 0 00-1.555-.832L10 8.798V6a1 1 0 00-1.555-.832l-6 4a1 1 0 000 1.664l6 4z" />
          </svg>
        </button>

        {/* Play/Pause */}
        {!isPlaying ? (
          <button
            onClick={onPlay}
            disabled={!canStepForward && currentStep >= totalSteps - 1}
            className="p-3 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Play"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-white"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
            </svg>
          </button>
        ) : (
          <button
            onClick={onPause}
            className="p-3 rounded-lg bg-orange-500 hover:bg-orange-600 transition-colors"
            title="Pause"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-white"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V4z" />
            </svg>
          </button>
        )}

        {/* Stop */}
        <button
          onClick={onStop}
          className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          title="Stop"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-gray-700 dark:text-gray-300"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
          </svg>
        </button>

        {/* Step Forward */}
        <button
          onClick={onStepForward}
          disabled={!canStepForward}
          className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Step Forward"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-gray-700 dark:text-gray-300"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M4.555 5.168A1 1 0 003 6v8a1 1 0 001.555.832L10 11.202V14a1 1 0 001.555.832l6-4a1 1 0 000-1.664l-6-4A1 1 0 0010 6v2.798l-5.445-3.63z" />
          </svg>
        </button>
      </div>

      {/* Speed control */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
            Speed
          </span>
          <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 capitalize">
            {currentSpeed}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-1">
          {(['slow', 'medium', 'fast', 'instant'] as const).map((speed) => (
            <button
              key={speed}
              onClick={() => onSpeedChange(speed)}
              className={`
                px-2 py-1 text-xs font-medium rounded transition-colors
                ${
                  currentSpeed === speed
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }
              `}
            >
              {speed === 'instant' ? 'Now' : speed.charAt(0).toUpperCase() + speed.slice(1)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AnimationControls;
