import { useReducer, useEffect, useRef, useState, memo } from 'react';
import './App.css';

/* ─── Constants ─── */
const SUITS = ['S', 'H', 'D', 'C'];
const SUIT_SYM = { S: '♠', H: '♥', D: '♦', C: '♣' };
const RANK_STR = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };
const rl = (r) => RANK_STR[r] ?? String(r);
const red = (s) => s === 'H' || s === 'D';

/* Card dimensions (px) */
const CW = 72;
const CH = 100;
const FD_OFF = 18; /* face-down card cascade offset */
const FU_OFF = 28; /* face-up card cascade offset   */

/* ─── Deck utilities ─── */
function createDeck() {
  return SUITS.flatMap((suit) =>
    Array.from({ length: 13 }, (_, i) => ({ suit, rank: i + 1, faceUp: false }))
  );
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function deal() {
  const deck = shuffle(createDeck());
  let idx = 0;
  const tableau = Array.from({ length: 7 }, (_, col) =>
    Array.from({ length: col + 1 }, (__, row) => ({
      ...deck[idx++],
      faceUp: row === col,
    }))
  );
  return {
    stock: deck.slice(idx).map((c) => ({ ...c, faceUp: false })),
    waste: [],
    foundations: [[], [], [], []],
    tableau,
    selected: null,
    history: [],
    moves: 0,
    elapsed: 0,
  };
}

/* ─── Game logic ─── */
const isWon = (state) => state.foundations.every((f) => f.length === 13);

function canPlaceOnFoundation(card, foundation) {
  if (!card) return false;
  if (!foundation.length) return card.rank === 1;
  const top = foundation[foundation.length - 1];
  return card.suit === top.suit && card.rank === top.rank + 1;
}

function canPlaceOnTableau(card, column) {
  if (!card) return false;
  if (!column.length) return card.rank === 13;
  const top = column[column.length - 1];
  return top.faceUp && red(card.suit) !== red(top.suit) && card.rank === top.rank - 1;
}

function getValidStack(column, fromIndex) {
  const stack = [column[fromIndex]];
  for (let i = fromIndex + 1; i < column.length; i++) {
    const prev = column[i - 1];
    const curr = column[i];
    if (!curr.faceUp || red(curr.suit) === red(prev.suit) || curr.rank !== prev.rank - 1) break;
    stack.push(curr);
  }
  return stack;
}

function getSelectedCards(state) {
  const s = state.selected;
  if (!s) return [];
  if (s.pile === 'waste') return state.waste[s.cardIndex] ? [state.waste[s.cardIndex]] : [];
  if (s.pile === 'tableau') return getValidStack(state.tableau[s.pileIndex], s.cardIndex);
  return [];
}

function takeSnapshot(state) {
  // eslint-disable-next-line no-unused-vars
  const { history, ...rest } = state;
  return JSON.parse(JSON.stringify(rest));
}

function autoFlip(col) {
  if (col.length && !col[col.length - 1].faceUp) {
    col[col.length - 1].faceUp = true;
  }
}

/* ─── Reducer ─── */
function reducer(state, action) {
  if (isWon(state) && action.type !== 'NEW_GAME' && action.type !== 'UNDO') {
    return state;
  }

  switch (action.type) {
    case 'NEW_GAME':
      return deal();

    case 'TICK':
      return { ...state, elapsed: state.elapsed + 1 };

    case 'DRAW': {
      const snap = takeSnapshot(state);
      if (!state.stock.length) {
        if (!state.waste.length) return state;
        return {
          ...state,
          stock: [...state.waste].reverse().map((c) => ({ ...c, faceUp: false })),
          waste: [],
          selected: null,
          history: [...state.history, snap],
        };
      }
      const drawn = { ...state.stock[state.stock.length - 1], faceUp: true };
      return {
        ...state,
        stock: state.stock.slice(0, -1),
        waste: [...state.waste, drawn],
        selected: null,
        history: [...state.history, snap],
        moves: state.moves + 1,
      };
    }

    case 'SELECT': {
      const { pile, pileIndex, cardIndex } = action;
      const s = state.selected;
      if (s && s.pile === pile && s.pileIndex === pileIndex && s.cardIndex === cardIndex) {
        return { ...state, selected: null };
      }
      const card =
        pile === 'waste'
          ? state.waste[cardIndex]
          : pile === 'tableau'
          ? state.tableau[pileIndex]?.[cardIndex]
          : null;
      if (!card?.faceUp) return state;
      return { ...state, selected: { pile, pileIndex, cardIndex } };
    }

    case 'PLACE': {
      if (!state.selected) return { ...state, selected: null };
      const { destPile, destPileIndex } = action;
      const cards = getSelectedCards(state);
      if (!cards.length) return { ...state, selected: null };

      let valid = false;
      if (destPile === 'foundation') {
        valid =
          cards.length === 1 &&
          canPlaceOnFoundation(cards[0], state.foundations[destPileIndex]);
      } else if (destPile === 'tableau') {
        const sameSrc =
          state.selected.pile === 'tableau' &&
          state.selected.pileIndex === destPileIndex;
        valid = !sameSrc && canPlaceOnTableau(cards[0], state.tableau[destPileIndex]);
      }
      if (!valid) return { ...state, selected: null };

      const snap = takeSnapshot(state);
      const newWaste = state.waste.map((c) => ({ ...c }));
      const newFoundations = state.foundations.map((f) => f.map((c) => ({ ...c })));
      const newTableau = state.tableau.map((col) => col.map((c) => ({ ...c })));
      const movedCards = cards.map((c) => ({ ...c }));
      const { pile: srcPile, pileIndex: srcIdx, cardIndex: srcCardIdx } = state.selected;

      if (srcPile === 'waste') {
        newWaste.splice(srcCardIdx, 1);
      } else {
        newTableau[srcIdx].splice(srcCardIdx);
        autoFlip(newTableau[srcIdx]);
      }

      if (destPile === 'foundation') {
        newFoundations[destPileIndex].push(...movedCards);
      } else {
        newTableau[destPileIndex].push(...movedCards);
      }

      return {
        ...state,
        waste: newWaste,
        foundations: newFoundations,
        tableau: newTableau,
        selected: null,
        history: [...state.history, snap],
        moves: state.moves + 1,
      };
    }

    case 'DESELECT':
      return { ...state, selected: null };

    case 'AUTO_MOVE': {
      const { pile, pileIndex, cardIndex } = action;
      let card;
      if (pile === 'waste') {
        card = state.waste[cardIndex];
        if (!card) return state;
      } else if (pile === 'tableau') {
        card = state.tableau[pileIndex]?.[cardIndex];
        if (!card?.faceUp) return state;
      } else return state;

      const isTopCard =
        pile === 'waste' || cardIndex === state.tableau[pileIndex].length - 1;

      const snap = takeSnapshot(state);
      const newWaste = state.waste.map((c) => ({ ...c }));
      const newFoundations = state.foundations.map((f) => f.map((c) => ({ ...c })));
      const newTableau = state.tableau.map((col) => col.map((c) => ({ ...c })));

      const removeFromSource = () => {
        if (pile === 'waste') {
          newWaste.splice(cardIndex, 1);
        } else {
          newTableau[pileIndex].splice(cardIndex);
          autoFlip(newTableau[pileIndex]);
        }
      };

      if (isTopCard) {
        for (let f = 0; f < 4; f++) {
          if (canPlaceOnFoundation(card, state.foundations[f])) {
            removeFromSource();
            newFoundations[f].push({ ...card });
            return {
              ...state,
              waste: newWaste,
              foundations: newFoundations,
              tableau: newTableau,
              selected: null,
              history: [...state.history, snap],
              moves: state.moves + 1,
            };
          }
        }
      }

      const stack =
        pile === 'tableau'
          ? getValidStack(state.tableau[pileIndex], cardIndex).map((c) => ({ ...c }))
          : [{ ...card }];
      for (let t = 0; t < 7; t++) {
        if (pile === 'tableau' && t === pileIndex) continue;
        if (canPlaceOnTableau(stack[0], state.tableau[t])) {
          removeFromSource();
          newTableau[t].push(...stack);
          return {
            ...state,
            waste: newWaste,
            foundations: newFoundations,
            tableau: newTableau,
            selected: null,
            history: [...state.history, snap],
            moves: state.moves + 1,
          };
        }
      }

      return { ...state, selected: null };
    }

    case 'UNDO': {
      if (!state.history.length) return state;
      const prev = state.history[state.history.length - 1];
      return { ...prev, history: state.history.slice(0, -1) };
    }

    default:
      return state;
  }
}

/* ─── Layout helpers ─── */
function cardTopOffset(column, index) {
  let top = 0;
  for (let i = 0; i < index; i++) {
    top += column[i].faceUp ? FU_OFF : FD_OFF;
  }
  return top;
}

function columnHeight(column) {
  if (!column.length) return CH;
  return (
    column.slice(0, -1).reduce((h, c) => h + (c.faceUp ? FU_OFF : FD_OFF), 0) + CH
  );
}

/* ─── Card component ─── */
const Card = memo(function Card({ card, style, isSelected, onClick, onDoubleClick }) {
  const prevFaceUp = useRef(card.faceUp);
  const [flipping, setFlipping] = useState(false);
  const [landing, setLanding] = useState(card.faceUp);

  useEffect(() => {
    if (!prevFaceUp.current && card.faceUp) {
      setFlipping(true);
      const t = setTimeout(() => setFlipping(false), 320);
      return () => clearTimeout(t);
    }
    prevFaceUp.current = card.faceUp;
  }, [card.faceUp]);

  useEffect(() => {
    if (!landing) return;
    const t = setTimeout(() => setLanding(false), 110);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!card.faceUp) {
    return (
      <div
        className="card card-back"
        style={style}
        onClick={onClick ?? undefined}
      >
        <div className="card-back-inner" />
      </div>
    );
  }

  const sym = SUIT_SYM[card.suit];
  const rank = rl(card.rank);
  const colorCls = red(card.suit) ? 'red' : 'black';
  const animCls = flipping ? ' flipping' : landing ? ' landing' : '';

  return (
    <div
      className={`card card-face ${colorCls}${isSelected ? ' selected' : ''}${animCls}`}
      style={style}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
    >
      <div className="card-corner tl">
        <span className="card-rank">{rank}</span>
        <span className="card-suit">{sym}</span>
      </div>
      <div className="card-center">{sym}</div>
      <div className="card-corner br">
        <span className="card-rank">{rank}</span>
        <span className="card-suit">{sym}</span>
      </div>
    </div>
  );
});

function EmptySlot({ className, label, onClick }) {
  return (
    <div
      className={`card empty-slot${className ? ' ' + className : ''}`}
      onClick={onClick}
    >
      {label && <span className="empty-label">{label}</span>}
    </div>
  );
}

function TableauColumn({
  col,
  colIdx,
  selStack,
  validDrop,
  onCardClick,
  onCardDblClick,
  onEmptyClick,
}) {
  const height = columnHeight(col);
  return (
    <div
      className={`tableau-col${validDrop ? ' valid-drop' : ''}`}
      style={{ width: CW, height, position: 'relative', minHeight: CH }}
    >
      {col.length === 0 ? (
        <EmptySlot className={validDrop ? 'valid-drop' : ''} onClick={onEmptyClick} />
      ) : (
        col.map((card, i) => {
          const top = cardTopOffset(col, i);
          const style = { position: 'absolute', top, left: 0, zIndex: i + 1 };
          const isSel = selStack != null && i >= selStack.from && i <= selStack.to;
          return (
            <Card
              key={`${card.suit}${card.rank}`}
              card={card}
              style={style}
              isSelected={isSel}
              onClick={card.faceUp ? () => onCardClick(colIdx, i) : null}
              onDoubleClick={card.faceUp ? () => onCardDblClick(colIdx, i) : null}
            />
          );
        })
      )}
    </div>
  );
}

const fmt = (secs) =>
  `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;

/* ─── Main App ─── */
export default function App() {
  const [state, dispatch] = useReducer(reducer, null, deal);
  const gameWon = isWon(state);

  useEffect(() => {
    if (gameWon) return;
    const id = setInterval(() => dispatch({ type: 'TICK' }), 1000);
    return () => clearInterval(id);
  }, [gameWon]);

  const selectedCards = getSelectedCards(state);
  const validFoundation = state.foundations.map(
    (f) => selectedCards.length === 1 && canPlaceOnFoundation(selectedCards[0], f)
  );
  const validTableau = state.tableau.map((col, i) => {
    if (!selectedCards.length) return false;
    if (state.selected?.pile === 'tableau' && state.selected.pileIndex === i) return false;
    return canPlaceOnTableau(selectedCards[0], col);
  });

  const selStack =
    state.selected?.pile === 'tableau'
      ? {
          colIdx: state.selected.pileIndex,
          from: state.selected.cardIndex,
          to: state.selected.cardIndex + selectedCards.length - 1,
        }
      : null;

  const onStockClick = () => dispatch({ type: 'DRAW' });

  const onWasteClick = () => {
    const topIdx = state.waste.length - 1;
    if (topIdx < 0) return;
    if (state.selected?.pile === 'waste') {
      dispatch({ type: 'DESELECT' });
    } else if (state.selected) {
      dispatch({ type: 'DESELECT' });
    } else {
      dispatch({ type: 'SELECT', pile: 'waste', pileIndex: 0, cardIndex: topIdx });
    }
  };

  const onWasteDblClick = () => {
    if (!state.waste.length) return;
    dispatch({
      type: 'AUTO_MOVE',
      pile: 'waste',
      pileIndex: 0,
      cardIndex: state.waste.length - 1,
    });
  };

  const onFoundationClick = (fIdx) => {
    if (state.selected) dispatch({ type: 'PLACE', destPile: 'foundation', destPileIndex: fIdx });
  };

  const onTableauCardClick = (colIdx, cardIdx) => {
    if (state.selected) {
      const s = state.selected;
      if (s.pile === 'tableau' && s.pileIndex === colIdx && s.cardIndex === cardIdx) {
        dispatch({ type: 'DESELECT' });
      } else {
        dispatch({ type: 'PLACE', destPile: 'tableau', destPileIndex: colIdx });
      }
    } else {
      dispatch({ type: 'SELECT', pile: 'tableau', pileIndex: colIdx, cardIndex: cardIdx });
    }
  };

  const onTableauCardDblClick = (colIdx, cardIdx) => {
    dispatch({ type: 'AUTO_MOVE', pile: 'tableau', pileIndex: colIdx, cardIndex: cardIdx });
  };

  const onTableauEmptyClick = (colIdx) => {
    if (state.selected) dispatch({ type: 'PLACE', destPile: 'tableau', destPileIndex: colIdx });
  };

  const wasteTop = state.waste.length ? state.waste[state.waste.length - 1] : null;
  const isWasteSelected = state.selected?.pile === 'waste';

  return (
    <div className="app">
      <header className="hud">
        <div className="hud-brand">♠ SOLITAIRE</div>
        <div className="hud-stats">
          <span className="hud-stat">
            MOVES <strong>{state.moves}</strong>
          </span>
          <span className="hud-stat">
            TIME <strong>{fmt(state.elapsed)}</strong>
          </span>
        </div>
        <div className="hud-actions">
          <button
            className="hud-btn"
            onClick={() => dispatch({ type: 'UNDO' })}
            disabled={!state.history.length}
          >
            ↩ UNDO
          </button>
          <button className="hud-btn primary" onClick={() => dispatch({ type: 'NEW_GAME' })}>
            NEW GAME
          </button>
        </div>
      </header>

      <main className="board">
        <div className="top-row">
          <div className="pile-wrapper" onClick={onStockClick} style={{ cursor: 'pointer' }}>
            {state.stock.length > 0 ? (
              <Card card={{ suit: 'S', rank: 1, faceUp: false }} />
            ) : (
              <EmptySlot label="↺" />
            )}
          </div>

          <div className="pile-wrapper">
            {wasteTop ? (
              <Card
                card={wasteTop}
                isSelected={isWasteSelected}
                onClick={onWasteClick}
                onDoubleClick={onWasteDblClick}
              />
            ) : (
              <EmptySlot />
            )}
          </div>

          <div className="pile-spacer" />

          {state.foundations.map((f, i) => {
            const topCard = f.length ? f[f.length - 1] : null;
            const vd = validFoundation[i];
            return (
              <div
                key={i}
                className={`pile-wrapper${vd ? ' valid-drop' : ''}`}
                onClick={() => onFoundationClick(i)}
                style={{ cursor: state.selected ? 'pointer' : 'default' }}
              >
                {topCard ? (
                  <Card
                    card={topCard}
                    isSelected={false}
                    onDoubleClick={() => {}}
                  />
                ) : (
                  <EmptySlot
                    className={vd ? 'valid-drop' : ''}
                    label={SUIT_SYM[SUITS[i]]}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className="tableau-row">
          {state.tableau.map((col, i) => (
            <TableauColumn
              key={i}
              col={col}
              colIdx={i}
              selStack={selStack?.colIdx === i ? selStack : null}
              validDrop={validTableau[i]}
              onCardClick={onTableauCardClick}
              onCardDblClick={onTableauCardDblClick}
              onEmptyClick={() => onTableauEmptyClick(i)}
            />
          ))}
        </div>
      </main>

      {gameWon && (
        <div className="win-overlay">
          <div className="win-modal">
            <div className="win-emoji">🎉</div>
            <h2 className="win-title">You Won!</h2>
            <div className="win-stats">
              <div className="win-stat">
                <span className="win-label">MOVES</span>
                <strong className="win-value">{state.moves}</strong>
              </div>
              <div className="win-stat">
                <span className="win-label">TIME</span>
                <strong className="win-value">{fmt(state.elapsed)}</strong>
              </div>
            </div>
            <button className="win-btn" onClick={() => dispatch({ type: 'NEW_GAME' })}>
              New Game
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
