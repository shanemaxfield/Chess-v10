/**
 * VariationDisplay - Shows clickable variations with color-coded sources
 *
 * Features:
 * - Display up to 3 variations
 * - Color-coded by source (engine, database, theory, common)
 * - Clickable to play variation on board
 * - Shows evaluation and description
 */

import React from 'react';
import { Variation, getSourceBadge } from '../lib/teaching/MoveInstructionParser';

interface VariationDisplayProps {
  variations: Variation[];
  onVariationClick: (variation: Variation) => void;
  selectedVariation?: Variation;
}

export const VariationDisplay: React.FC<VariationDisplayProps> = ({
  variations,
  onVariationClick,
  selectedVariation,
}) => {
  if (variations.length === 0) {
    return null;
  }

  return (
    <div className="variation-display space-y-2">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
        Continuations
      </h3>

      <div className="space-y-2">
        {variations.map((variation, index) => (
          <VariationCard
            key={index}
            variation={variation}
            index={index}
            onClick={() => onVariationClick(variation)}
            isSelected={selectedVariation === variation}
          />
        ))}
      </div>
    </div>
  );
};

interface VariationCardProps {
  variation: Variation;
  index: number;
  onClick: () => void;
  isSelected: boolean;
}

const VariationCard: React.FC<VariationCardProps> = ({
  variation,
  index,
  onClick,
  isSelected,
}) => {
  // Get color for the variation
  const borderColor = variation.color || '#3b82f6';

  // Source badge style
  const sourceBadge = getSourceBadge(variation.source);
  const sourceBadgeColor = getSourceBadgeColor(variation.source);

  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left p-3 rounded-lg border-2 transition-all
        hover:shadow-md hover:scale-[1.02]
        ${isSelected ? 'ring-2 ring-offset-2 ring-blue-500' : ''}
        bg-white dark:bg-gray-800
      `}
      style={{
        borderColor: isSelected ? borderColor : '#e5e7eb',
        borderLeftWidth: '4px',
        borderLeftColor: borderColor,
      }}
    >
      {/* Header with name and badge */}
      <div className="flex items-center justify-between mb-1">
        <span className="font-semibold text-gray-800 dark:text-gray-100">
          {variation.name}
        </span>

        <div className="flex items-center gap-2">
          {variation.evaluation && (
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
              {variation.evaluation}
            </span>
          )}

          <span
            className="text-xs px-2 py-0.5 rounded font-medium text-white"
            style={{ backgroundColor: sourceBadgeColor }}
          >
            {sourceBadge}
          </span>
        </div>
      </div>

      {/* Moves */}
      <div className="mb-1">
        <span className="text-sm font-mono text-gray-600 dark:text-gray-400">
          {variation.moves.slice(0, 8).join(' ')}
          {variation.moves.length > 8 && '...'}
        </span>
      </div>

      {/* Description */}
      <div className="text-xs text-gray-600 dark:text-gray-400">
        {variation.description}
      </div>
    </button>
  );
};

/**
 * Get source badge background color
 */
function getSourceBadgeColor(source: string): string {
  switch (source) {
    case 'stockfish': return '#3b82f6'; // Blue
    case 'database': return '#10b981';  // Green
    case 'theory': return '#8b5cf6';    // Purple
    case 'common': return '#f59e0b';    // Orange
    case 'llm': return '#ec4899';       // Pink
    default: return '#6b7280';          // Gray
  }
}

export default VariationDisplay;
