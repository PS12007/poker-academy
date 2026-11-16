import { useState } from 'react';
import type { Rng } from '../engine/rng';
import { Category, CATEGORY_NAMES } from '../engine/evalCore';
import { describeHand } from '../engine/describe';
import { findOuts } from '../engine/outs';
import { Hand } from '../components/cards/PlayingCard';
import { pct } from '../lib/format';
import { DrillShell, type RoundApi } from './Shell';

interface Round {
  hole: number[];
  board: number[];
  outs: number[];
  groups: { category: Category; cards: number[] }[];
  made: string;
}

function deal(rng: Rng): Round {
  for (;;) {
    const deck = rng.shuffle(Array.from({ length: 52 }, (_, i) => i));
    const hole = deck.slice(0, 2);
    const board = deck.slice(2, rng.float() < 0.7 ? 5 : 6);
    const r = findOuts(hole, board);
    if (r.current >= Category.Straight) continue;
    const groups = r.byCategory.filter((g) => g.category >= Category.Straight);
    const outs = groups.flatMap((g) => g.cards);
    // Skip boards with nothing to count, and the few where the board gives everyone the same draw.
    if (outs.length < 3 || outs.length > 16) continue;
    return { hole, board, outs, groups, made: describeHand([...hole, ...board]).name };
  }
}

function Entry({ round, answered, answer }: Pick<RoundApi<Round>, 'round' | 'answered' | 'answer'>) {
  const [text, setText] = useState('');
  {
      {
        const guess = Number(text);
        const unseen = 52 - 2 - round.board.length;
        return (
          <div>
            <div className="flex flex-wrap items-end gap-x-10 gap-y-5">
              <div>
                <div className="label mb-2">Your hand</div>
                <Hand cards={round.hole} size="lg" />
              </div>
              <div>
                <div className="label mb-2">{round.board.length === 3 ? 'Flop' : 'Turn'}</div>
                <Hand cards={round.board} size="lg" />
              </div>
            </div>
            <form
              className="mt-7 flex items-end gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (answered || text.trim() === '' || !Number.isFinite(guess)) return;
                answer(guess === round.outs.length, Math.abs(guess - round.outs.length));
              }}
            >
              <div className="w-56">
                <label className="label block" htmlFor="outs-guess">Cards that make a straight or better</label>
                <input id="outs-guess" className="field !text-[22px]" inputMode="numeric" autoFocus autoComplete="off" value={text} disabled={answered} onChange={(e) => setText(e.target.value.replace(/\D/g, ''))} />
              </div>
              <button type="submit" className="btn" disabled={answered || text === ''}>Lock in</button>
            </form>
            {answered && (
              <div className="mt-6 border-t border-bone/15 pt-4">
                <div className="flex items-end gap-6">
                  <div>
                    <div className="figure text-[52px] text-madder">{round.outs.length}</div>
                    <div className="label mt-1">outs{text ? ` · you said ${text}` : ''}</div>
                  </div>
                  <div className="num pb-1 text-[12px] leading-relaxed text-dim">
                    <div>next card: {round.outs.length} / {unseen} = {pct(round.outs.length / unseen)}</div>
                    <div>rule of 2: {round.outs.length * 2}%</div>
                    <div>you hold: {round.made}</div>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  {round.groups.map((g) => (
                    <div key={g.category} className="flex flex-wrap items-center gap-3">
                      <span className="label w-28">{CATEGORY_NAMES[g.category]} · {g.cards.length}</span>
                      <Hand cards={[...g.cards].sort((a, b) => b - a)} size="xs" className="flex-wrap" />
                    </div>
                  ))}
                </div>
              </div>
            )}
            {!answered && text !== '' && <span className="sr-only" aria-live="polite">{text}</span>}
          </div>
        );
      }
  }
}

export default function OutsDrill() {
  return (
    <DrillShell id="outs" generate={deal} timeLimit={10} errorLabel="average miss, outs">
      {({ round, answered, answer, n }) => <Entry key={n} round={round} answered={answered} answer={answer} />}
    </DrillShell>
  );
}
