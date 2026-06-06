import { test, describe, mock } from 'node:test';
import assert from 'node:assert';
import { createDeck, shuffle } from './gameLogic.js';

describe('Deck utilities', () => {
  test('createDeck generates 52 cards', () => {
    const deck = createDeck();
    assert.strictEqual(deck.length, 52);
    assert.strictEqual(deck[0].suit, 'S');
    assert.strictEqual(deck[0].rank, 1);
    assert.strictEqual(deck[0].faceUp, false);

    const uniqueSuits = new Set(deck.map(c => c.suit));
    assert.strictEqual(uniqueSuits.size, 4);
  });

  test('shuffle does not mutate original array', () => {
    const deck = createDeck();
    const deckCopy = [...deck];
    const shuffled = shuffle(deck);

    assert.notStrictEqual(shuffled, deck);
    assert.deepStrictEqual(deck, deckCopy);
  });

  test('shuffle preserves elements and their quantity', () => {
    const arr = [1, 2, 3, 4, 5];
    const shuffled = shuffle(arr);

    assert.strictEqual(shuffled.length, arr.length);
    assert.deepStrictEqual([...shuffled].sort(), [...arr].sort());
  });

  test('shuffle reorders elements deterministically when random is mocked', () => {
    const originalRandom = Math.random;
    try {
      mock.method(Math, 'random', () => 0);
      const arr = [1, 2, 3, 4];
      const shuffled = shuffle(arr);
      assert.deepStrictEqual(shuffled, [2, 3, 4, 1]);
    } finally {
      Math.random = originalRandom;
    }
  });

  test('shuffle handles empty arrays', () => {
    const arr = [];
    const shuffled = shuffle(arr);
    assert.deepStrictEqual(shuffled, []);
    assert.notStrictEqual(shuffled, arr);
  });

  test('shuffle handles 1-element arrays', () => {
    const arr = [42];
    const shuffled = shuffle(arr);
    assert.deepStrictEqual(shuffled, [42]);
    assert.notStrictEqual(shuffled, arr);
  });
});
