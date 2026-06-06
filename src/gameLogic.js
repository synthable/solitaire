export const SUITS = ['S', 'H', 'D', 'C'];

export function createDeck() {
  return SUITS.flatMap((suit) =>
    Array.from({ length: 13 }, (_, i) => ({ suit, rank: i + 1, faceUp: false }))
  );
}

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
