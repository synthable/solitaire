# Solitaire

A fully playable **Klondike Solitaire** game built as a React single-page app, powered by Vite.

## Features

- Draw-1 stock with unlimited recycles (no penalty)
- Undo any number of moves
- Auto-move via double-click (foundation first, then tableau)
- Move counter and elapsed-time HUD
- Win overlay with final stats
- Animated card flips and landings

## Getting Started

### Prerequisites

- Node.js ≥ 20.19.0

### Install & Run

```bash
npm install
npm run dev
```

Open the local URL shown in your terminal (default: `http://localhost:5173`).

### Build for Production

```bash
npm run build
npm run preview
```

## How to Play

### Objective

Move all 52 cards to the four **foundation** piles (top-right), one per suit, built up from Ace to King.

### Controls

| Action | How |
|---|---|
| Draw a card from the stock | Click the face-down stock pile (top-left) |
| Recycle waste back to stock | Click the empty stock slot when the stock is empty |
| Select a card / stack | Click a face-up card in the waste or tableau |
| Place selected card(s) | Click the destination foundation or tableau column |
| Deselect | Click the selected card again |
| Auto-move (foundation or tableau) | Double-click a face-up card |
| Undo last move | Click **↩ UNDO** in the header |
| Start a new game | Click **NEW GAME** in the header |

### Rules

- **Tableau**: Build columns in descending rank, alternating colours (red / black). Only a King may be placed on an empty column.
- **Foundation**: Build each suit pile from Ace up to King.
- **Stock / Waste**: Draw one card at a time; the waste top card is always playable.
- **Stack moves**: Any valid face-up run in a tableau column can be moved as a group.

## License

[MIT](LICENSE)

