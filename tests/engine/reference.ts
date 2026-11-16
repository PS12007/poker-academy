/**
 * Slow, obviously-correct reference evaluator used only by tests.
 * Returns [category, ...tiebreak ranks] encoded as one number in base 13.
 */
export function referenceScore5(cards: readonly number[]): number {
  const ranks = cards.map((c) => c >> 2).sort((a, b) => b - a);
  const suits = cards.map((c) => c & 3);
  const flush = suits.every((s) => s === suits[0]);
  const counts = new Map<number, number>();
  for (const r of ranks) counts.set(r, (counts.get(r) ?? 0) + 1);
  // Sort by count desc, then rank desc.
  const groups = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const shape = groups.map((g) => g[1]).join('');
  const distinct = groups.length === 5;
  let straightHigh = -1;
  if (distinct) {
    if (ranks[0] - ranks[4] === 4) straightHigh = ranks[0];
    else if (ranks[0] === 12 && ranks[1] === 3 && ranks[2] === 2 && ranks[3] === 1 && ranks[4] === 0) straightHigh = 3;
  }
  let cat: number;
  let tie: number[];
  if (straightHigh >= 0 && flush) { cat = 8; tie = [straightHigh]; }
  else if (shape === '41') { cat = 7; tie = groups.map((g) => g[0]); }
  else if (shape === '32') { cat = 6; tie = groups.map((g) => g[0]); }
  else if (flush) { cat = 5; tie = ranks; }
  else if (straightHigh >= 0) { cat = 4; tie = [straightHigh]; }
  else if (shape === '311') { cat = 3; tie = groups.map((g) => g[0]); }
  else if (shape === '221') { cat = 2; tie = groups.map((g) => g[0]); }
  else if (shape === '2111') { cat = 1; tie = groups.map((g) => g[0]); }
  else { cat = 0; tie = ranks; }
  let score = cat;
  for (let i = 0; i < 5; i++) score = score * 13 + (tie[i] ?? 0);
  return score;
}

export function referenceCategory(score: number): number {
  return Math.floor(score / 13 ** 5);
}

/** Best 5 of N by trying every 5-card subset. */
export function referenceBest(cards: readonly number[]): number {
  let best = -1;
  const n = cards.length;
  for (let a = 0; a < n - 4; a++)
    for (let b = a + 1; b < n - 3; b++)
      for (let c = b + 1; c < n - 2; c++)
        for (let d = c + 1; d < n - 1; d++)
          for (let e = d + 1; e < n; e++) {
            const s = referenceScore5([cards[a], cards[b], cards[c], cards[d], cards[e]]);
            if (s > best) best = s;
          }
  return best;
}
