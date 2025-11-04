import { ArrowAction } from "./types";

export type ArrowState = {
  id: string;
  from: string;
  to: string;
  color?: string;
};

/**
 * ArrowController - Manages arrow overlays on the board
 * Returns a new list of arrows to render
 */
export function reconcileArrows(
  existing: ArrowState[],
  actions: ArrowAction[]
): ArrowState[] {
  const next = [...existing];

  for (const a of actions) {
    const id = `${a.from}-${a.to}-${a.color ?? "default"}`;

    // Simple idempotent add (no removal logic needed for skeleton)
    if (!next.find(x => x.id === id)) {
      next.push({
        id,
        from: a.from,
        to: a.to,
        color: a.color
      });
    }
  }

  return next;
}
