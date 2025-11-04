import { MoveAction } from "./types";
import { Chess } from "chess.js";

/**
 * MoveController - Executes piece movements on the chess board
 * Accepts current chess instance and a batch of MoveAction
 */
export function applyMoves(
  chess: Chess,
  moves: MoveAction[],
  onApplied?: () => void
): boolean {
  let anySuccessful = false;

  for (const m of moves) {
    try {
      // Attempt the move - must be legal
      const result = chess.move({
        from: m.from,
        to: m.to,
        promotion: m.promotion
      });

      // If result is valid, mark as successful
      if (result) {
        anySuccessful = true;
      }
    } catch (error) {
      // Silently skip illegal moves for now (skeleton implementation)
      console.warn(`Illegal move attempted: ${m.from} to ${m.to}`, error);
    }
  }

  if (anySuccessful && onApplied) {
    onApplied();
  }

  return anySuccessful;
}
