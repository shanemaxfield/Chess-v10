import { ScoreInfo } from './uci'

/**
 * Format a centipawn score to pawns with sign
 * Example: 35 -> "+0.35", -150 -> "-1.50"
 */
export function formatCentipawns(cp: number): string {
  const pawns = cp / 100
  const sign = pawns >= 0 ? '+' : ''
  return `${sign}${pawns.toFixed(2)}`
}

/**
 * Format a mate score
 * Example: 5 -> "M5", -3 -> "M-3"
 */
export function formatMate(plies: number): string {
  return `M${plies}`
}

/**
 * Format a score from the perspective of the side to move
 * If flipForBlack is true and it's Black's turn, flip the sign
 */
export function formatScore(
  score: ScoreInfo,
  isWhiteToMove: boolean = true,
  flipForSideToMove: boolean = true
): string {
  const multiplier = flipForSideToMove && !isWhiteToMove ? -1 : 1

  if (score.type === 'cp') {
    return formatCentipawns(score.value * multiplier)
  } else {
    const adjustedMate = score.value * multiplier
    return formatMate(adjustedMate)
  }
}

/**
 * Get a numeric evaluation for sorting (higher is better for side to move)
 * Mate scores are given very high values
 */
export function getNumericEval(score: ScoreInfo, isWhiteToMove: boolean = true): number {
  const multiplier = isWhiteToMove ? 1 : -1

  if (score.type === 'cp') {
    return score.value * multiplier
  } else {
    // Mate in N moves: give it a very high score
    // Positive mate means winning, negative means losing
    const mateValue = score.value > 0 ? 100000 - score.value : -100000 - score.value
    return mateValue * multiplier
  }
}
