import { HighlightAction } from "./types";

export type HighlightState = {
  squares: string[];
  color?: string;
};

/**
 * HighlightController - Manages square highlighting on the board
 * Returns a new list of highlights to render
 */
export function reconcileHighlights(
  existing: HighlightState[],
  actions: HighlightAction[]
): HighlightState[] {
  let next = [...existing];

  for (const h of actions) {
    if (h.mode === "clear-and-add") {
      // Replace all highlights with this one
      next = [{ squares: h.squares, color: h.color }];
    } else {
      // Add mode (default): append to existing highlights
      next.push({ squares: h.squares, color: h.color });
    }
  }

  return next;
}
