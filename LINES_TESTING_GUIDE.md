# Chess Lines Testing Guide

## Overview

I've implemented a comprehensive board and piece control system with a new **Lines** feature. Lines allow you to demonstrate chess sequences move-by-move with automatic playback.

## Available Lines

Here are the 10 hardcoded lines you can test:

### By Index
1. **Line 1** - Italian Opening
2. **Line 2** - Scholar's Mate
3. **Line 3** - Ruy Lopez
4. **Line 4** - Queen's Gambit
5. **Line 5** - Fried Liver Attack
6. **Line 6** - Back Rank Mate Pattern
7. **Line 7** - Sicilian Defense
8. **Line 8** - Fool's Mate
9. **Line 9** - King and Pawn Endgame
10. **Line 10** - Smothered Mate Pattern

## How to Test

### Method 1: Using Line Numbers
Simply type in the chat panel:
- `line 1` - Plays Italian Opening
- `play line 2` - Plays Scholar's Mate
- `line 8` - Plays Fool's Mate (fastest checkmate!)

### Method 2: Search by Name
Type keywords to find and play lines:
- `play italian opening`
- `show scholars mate`
- `demonstrate ruy lopez`
- `play queens gambit`
- `show sicilian defense`

### Method 3: Direct ID (Advanced)
Use the exact line ID:
- `italian-opening`
- `scholars-mate`
- `fools-mate`

## Features

### Automatic Playback
- When you trigger a line, the board resets to the starting position
- Moves play automatically with a 1-second delay between each move
- Watch the line unfold move-by-move!

### Playback Controls
A control panel appears at the bottom when a line is playing:
- **▶ Play/⏸ Pause** - Control automatic playback
- **⏮ Prev** - Go back one move
- **Next ⏭** - Advance one move
- **Stop** - End playback and hide controls
- **Progress Bar** - Visual progress through the line
- **Move List** - See all moves with current position highlighted

### Visual Feedback
- Completed moves: Green
- Current move: Blue (highlighted)
- Upcoming moves: Gray
- Progress percentage displayed
- Move count (e.g., "Move 3 of 12")

## Quick Test Commands

Try these in order to test all functionality:

1. `line 8` - Quick 2-move checkmate (Fool's Mate)
2. `play italian opening` - Classic 12-move opening
3. `show scholars mate` - Famous beginner trap
4. Click **Pause** button while a line is playing
5. Click **Next** button to manually step through
6. Click **Prev** button to go back
7. Click **Stop** to end playback

## Example Session

```
You: line 1
AI: Playing line: "Italian Opening"
    Classic opening focusing on rapid development and center control
    Moves: e4, e5, Nf3, Nc6, Bc4, Bc5, c3, d6, d4, exd4, cxd4, Bb6

[Board resets and starts playing moves automatically]
[Control panel appears at bottom]
[Watch moves play out one by one]

You: line 8
AI: Playing line: "Fool's Mate"
    Quickest possible checkmate in chess
    Moves: f3, e5, g4, Qh4#

[Board resets and plays the fastest checkmate in chess!]
```

## Technical Details

### Files Created/Modified

**New Files:**
- `/src/lib/actions/chessLines.ts` - Line definitions and utilities
- `/src/lib/hooks/useLinePlayer.ts` - Auto-playback hook
- `/src/components/LinePlaybackControls.tsx` - UI controls

**Modified Files:**
- `/src/store/gameStore.ts` - Added line playback state and actions
- `/src/lib/actions/types.ts` - Added LineAction type
- `/src/lib/actions/planActions.ts` - Added line detection
- `/src/components/ChatPanel.tsx` - Added line execution
- `/src/App.tsx` - Integrated line player and controls

### State Management
- Lines are managed through Zustand store
- Automatic playback via React hook with setTimeout
- Pause/resume functionality preserves state
- Manual control (prev/next) available during pause

### Move Execution
- Uses Chess.js SAN (Standard Algebraic Notation)
- Each move validated before execution
- Board automatically resets to starting position
- Full undo/redo support during manual control

## Customization

To add more lines, edit `/src/lib/actions/chessLines.ts`:

```typescript
{
  id: 'my-custom-line',
  name: 'My Custom Line',
  description: 'Description of the line',
  moves: ['e4', 'e5', 'Nf3', 'Nc6'], // SAN notation
  category: 'opening', // or 'tactic', 'endgame', 'checkmate'
}
```

## Notes

- Lines always start from the initial board position
- Move delay is set to 1000ms (1 second) by default
- All moves are in SAN format (e.g., "Nf3", "Qh4#")
- The system validates each move before execution
- If a move fails, playback stops automatically

Enjoy exploring these chess lines! 🎉
