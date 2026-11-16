import { Category, categoryOf, evaluate } from './evalCore';
import { describeRank } from './describe';

export interface NutsInfo {
  rank: number;
  name: string;
  /** Every two-card holding that makes the nuts. */
  holdings: [number, number][];
}

/** The best possible Hold'em hand on a board of 3 to 5 cards, found by trying every two-card holding. */
export function findNuts(board: readonly number[]): NutsInfo {
  const used = new Uint8Array(52);
  for (const c of board) used[c] = 1;
  let best = 0;
  let holdings: [number, number][] = [];
  for (let a = 0; a < 51; a++) {
    if (used[a]) continue;
    for (let b = a + 1; b < 52; b++) {
      if (used[b]) continue;
      const r = evaluate([...board, a, b]);
      if (r > best) {
        best = r;
        holdings = [[b, a]];
      } else if (r === best) holdings.push([b, a]);
    }
  }
  return { rank: best, name: describeRank(best), holdings };
}

export interface BoardTexture {
  paired: boolean;
  trips: boolean;
  /** Largest number of cards sharing a suit. */
  suitedCount: number;
  suitLabel: 'rainbow' | 'two-tone' | 'monotone' | 'four-flush' | 'five-flush';
  /** Two-card holdings that already make a straight. */
  straightCombos: number;
  /** Two-card holdings that already make a flush. */
  flushCombos: number;
  /** Two-card holdings holding a flush draw (four to a flush using both or one hole card), flop and turn only. */
  flushDrawCombos: number;
  /** Two-card holdings with an 8+ out straight draw, flop and turn only. */
  openEndedCombos: number;
  highCard: number;
  /** 0 (bone dry) to 1 (soaking). A teaching heuristic, not a solver quantity. */
  wetness: number;
  nuts: NutsInfo;
}

/** Describes a flop, turn or river: pairing, suits, and how many holdings have straights, flushes and draws. */
export function boardTexture(board: readonly number[]): BoardTexture {
  if (board.length < 3 || board.length > 5) throw new Error('Texture needs 3 to 5 board cards');
  const rankCount = new Array<number>(13).fill(0);
  const suitCount = [0, 0, 0, 0];
  for (const c of board) {
    rankCount[c >> 2]++;
    suitCount[c & 3]++;
  }
  const maxRank = Math.max(...rankCount);
  const suitedCount = Math.max(...suitCount);
  const used = new Uint8Array(52);
  for (const c of board) used[c] = 1;

  let straightCombos = 0, flushCombos = 0, flushDrawCombos = 0, openEndedCombos = 0, total = 0;
  const drawsMatter = board.length < 5;
  for (let a = 0; a < 51; a++) {
    if (used[a]) continue;
    for (let b = a + 1; b < 52; b++) {
      if (used[b]) continue;
      total++;
      const cards = [...board, a, b];
      const cat = categoryOf(evaluate(cards));
      if (cat === Category.Straight) straightCombos++;
      if (cat === Category.Flush || cat === Category.StraightFlush) flushCombos++;
      if (!drawsMatter || cat >= Category.Straight) continue;
      const sc = [...suitCount];
      sc[a & 3]++;
      sc[b & 3]++;
      if (Math.max(...sc) === 4) flushDrawCombos++;
      // Straight outs: ranks that complete a straight on the next card.
      let outs = 0;
      for (let r = 0; r < 13; r++) {
        // Any suit not already used works for a pure straight check; pick one that is free.
        let card = -1;
        for (let s = 0; s < 4; s++) {
          const c = r * 4 + s;
          if (!used[c] && c !== a && c !== b) { card = c; break; }
        }
        if (card < 0) continue;
        const c2 = categoryOf(evaluate([...cards, card]));
        if (c2 === Category.Straight || c2 === Category.StraightFlush) outs++;
      }
      if (outs >= 2) openEndedCombos++;
    }
  }
  const suitLabel =
    suitedCount >= 5 ? 'five-flush' : suitedCount === 4 ? 'four-flush' : suitedCount === 3 ? 'monotone' : suitedCount === 2 ? 'two-tone' : 'rainbow';
  const wetness = Math.min(1, (straightCombos + flushCombos) / total * 4 + (flushDrawCombos + openEndedCombos) / total * 1.6);
  return {
    paired: maxRank >= 2,
    trips: maxRank >= 3,
    suitedCount,
    suitLabel,
    straightCombos,
    flushCombos,
    flushDrawCombos,
    openEndedCombos,
    highCard: Math.max(...board.map((c) => c >> 2)),
    wetness,
    nuts: findNuts(board),
  };
}
