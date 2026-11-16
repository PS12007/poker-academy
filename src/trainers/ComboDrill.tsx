import type { Rng } from '../engine/rng';
import { HAND_CLASSES } from '../engine/ranges';
import { RANK_CHARS } from '../engine/cards';
import { Hand } from '../components/cards/PlayingCard';
import { DrillShell, NumericAnswer } from './Shell';

interface Round {
  label: string;
  hole: number[];
  board: number[];
  all: (readonly [number, number])[];
  live: (readonly [number, number])[];
}

function deal(rng: Rng): Round {
  for (;;) {
    const deck = rng.shuffle(Array.from({ length: 52 }, (_, i) => i));
    const hole = deck.slice(0, 2);
    const board = deck.slice(2, 5 + rng.int(3));
    const seen = [...hole, ...board];
    // Pick a target built from ranks that are visible two times in three, so blockers matter.
    const ranks = seen.map((c) => c >> 2);
    const hi = rng.float() < 0.67 ? rng.pick(ranks) : rng.int(13);
    const kind = rng.int(4); // 0 pair, 1 suited, 2 offsuit, 3 any
    const lo = kind === 0 ? hi : rng.float() < 0.5 ? rng.pick(ranks) : rng.int(13);
    if (kind !== 0 && lo === hi) continue;
    const a = Math.max(hi, lo), b = Math.min(hi, lo);
    const classes = HAND_CLASSES.filter((h) => h.hi === a && h.lo === b && (kind === 0 ? h.kind === 'pair' : kind === 1 ? h.kind === 'suited' : kind === 2 ? h.kind === 'offsuit' : h.kind !== 'pair'));
    if (!classes.length) continue;
    const all = classes.flatMap((h) => h.combos);
    const used = new Set(seen);
    const live = all.filter(([x, y]) => !used.has(x) && !used.has(y));
    const label = RANK_CHARS[a] + RANK_CHARS[b] + (kind === 1 ? ' suited' : kind === 2 ? ' offsuit' : kind === 3 ? ' (suited or offsuit)' : '');
    return { label, hole, board, all, live };
  }
}

export default function ComboDrill() {
  return (
    <DrillShell id="combos" generate={deal} errorLabel="average miss, combos">
      {({ round, answered, answer, n }) => {
        const used = new Set([...round.hole, ...round.board]);
        return (
          <div>
            <div className="flex flex-wrap items-end gap-x-10 gap-y-5">
              <div><div className="label mb-2">Your hand</div><Hand cards={round.hole} size="lg" /></div>
              <div><div className="label mb-2">Board</div><Hand cards={round.board} size="lg" /></div>
            </div>
            <p className="mt-6 text-[17px]">How many combos of <span className="display-i text-[26px] text-madder">{round.label}</span> can your opponent hold?</p>
            <div className="mt-4"><NumericAnswer key={n} label="Combos remaining" disabled={answered} onSubmit={(v) => answer(v === round.live.length, Math.abs(v - round.live.length))} /></div>
            {answered && (
              <div className="mt-6 border-t border-bone/15 pt-4">
                <div className="flex items-end gap-5">
                  <div className="figure text-[52px] text-madder">{round.live.length}</div>
                  <div className="label pb-2">of {round.all.length} before removing the cards you can see</div>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-3 gap-y-2">
                  {round.all.map(([a, b]) => <Hand key={`${a}-${b}`} cards={[a, b]} size="xs" className={used.has(a) || used.has(b) ? 'opacity-20' : undefined} />)}
                </div>
              </div>
            )}
          </div>
        );
      }}
    </DrillShell>
  );
}
