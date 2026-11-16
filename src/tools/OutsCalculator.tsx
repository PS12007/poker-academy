import { useMemo, useState } from 'react';
import { CATEGORY_NAMES } from '../engine/evalCore';
import { outsOdds } from '../engine/combinatorics';
import { describeHand } from '../engine/describe';
import { findOuts, outsVersus } from '../engine/outs';
import { handVsHand } from '../engine/equity';
import { cardsToString } from '../engine/cards';
import { CardField } from '../components/cards/CardField';
import { Hand } from '../components/cards/PlayingCard';
import { Figure, Plate, Working } from '../components/ui/primitives';
import { num, oddsText, pct } from '../lib/format';

export interface OutsCalculatorProps {
  initial?: { hole: number[]; board: number[]; villain?: number[] };
  embedded?: boolean;
}

export default function OutsCalculator({ initial, embedded }: OutsCalculatorProps) {
  const [hole, setHole] = useState<number[]>(initial?.hole ?? [50, 30]); // Ah 9h
  const [board, setBoard] = useState<number[]>(initial?.board ?? [46, 22, 0]); // Kh 7h 2c
  const [villain, setVillain] = useState<number[]>(initial?.villain ?? []);

  const ready = hole.length === 2 && (board.length === 3 || board.length === 4);
  const data = useMemo(() => {
    if (!ready) return null;
    const raw = findOuts(hole, board, villain.length === 2 ? villain : []);
    const made = describeHand([...hole, ...board]);
    const vs = villain.length === 2 ? outsVersus(hole, villain, board) : null;
    const eq = villain.length === 2 ? handVsHand([cardsToString(hole), cardsToString(villain)], cardsToString(board)) : null;
    return { raw, made, vs, eq };
  }, [ready, hole, board, villain]);

  const n = data ? (data.vs ? data.vs.outs.length : data.raw.outs.length) : 0;
  const unseen = data ? (data.vs ? data.vs.unseen : data.raw.unseen) : 47;
  const flop = board.length === 3;
  const odds = outsOdds(n);
  const pNext = n / unseen;
  const pRiver = flop ? 1 - ((unseen - n) / unseen) * ((unseen - 1 - n) / (unseen - 1)) : pNext;

  return (
    <div className={embedded ? 'space-y-6' : 'grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]'}>
      <div className="space-y-6">
        <Plate serial="IN" title="The spot">
          <div className="space-y-6">
            <CardField label="Your hand" max={2} size="lg" value={hole} onChange={setHole} blocked={[...board, ...villain]} />
            <CardField label="Board" hint="flop or turn" max={4} value={board} onChange={setBoard} blocked={[...hole, ...villain]} />
            <CardField label="Opponent's hand" hint="optional" max={2} size="sm" value={villain} onChange={setVillain} blocked={[...hole, ...board]} />
          </div>
          <p className="mt-5 text-[13px] text-dim">
            Without an opponent's hand, an out is any card that lifts your hand to a better category than the board
            gives everyone. With one, an out is a card that puts you strictly ahead, so tainted outs disappear.
          </p>
        </Plate>
      </div>

      {!data ? (
        <Plate serial="OUT" title="Outs"><p className="text-dim">Enter two hole cards and a flop or turn.</p></Plate>
      ) : (
        <div className="space-y-6">
          <Plate serial="OUT" title={data.vs ? 'Outs against that hand' : 'Improving cards'} right={`you hold: ${data.made.name}`}>
            <div className="grid grid-cols-3 gap-4">
              <Figure size="lg" tone="madder" value={n} caption={n === 1 ? 'out' : 'outs'} />
              <Figure size="md" value={pct(pNext)} caption={`next card · ${oddsText(pNext)}`} />
              <Figure size="md" value={pct(pRiver)} caption={flop ? `by the river · ${oddsText(pRiver)}` : 'river only'} />
            </div>

            {data.vs ? (
              <div className="mt-6 space-y-4">
                <div>
                  <div className="label mb-2">{data.vs.behind ? 'Cards that put you ahead' : 'You are ahead now. Cards that keep you ahead'}</div>
                  <div className="flex flex-wrap gap-1"><Hand cards={[...data.vs.outs].sort((a, b) => b.rank - a.rank).map((o) => o.card)} size="xs" className="flex-wrap" /></div>
                </div>
                {data.vs.chops.length > 0 && data.vs.chops.length < 20 && (
                  <div>
                    <div className="label mb-2">Cards that split the pot</div>
                    <Hand cards={data.vs.chops} size="xs" className="flex-wrap" />
                  </div>
                )}
                {data.eq && (
                  <p className="text-[13px] text-dim">
                    Exact equity right now: <span className="num text-bone">{pct(data.eq.players[0].equity, 2)}</span> over {data.eq.boards} runouts.
                    {flop && ' This differs from the by-the-river figure because the opponent can redraw on the river and you can hit runner-runner.'}
                  </p>
                )}
              </div>
            ) : (
              <div className="mt-6 divide-y divide-bone/10 border-y border-bone/15">
                {data.raw.byCategory.length === 0 && <p className="py-3 text-[13px] text-dim">No single card improves this hand's category.</p>}
                {data.raw.byCategory.map((g) => (
                  <div key={g.category} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                    <div className="w-36 shrink-0">
                      <div className="text-[14px]">{CATEGORY_NAMES[g.category]}</div>
                      <div className="label">{g.cards.length} {g.cards.length === 1 ? 'card' : 'cards'}</div>
                    </div>
                    <Hand cards={[...g.cards].sort((a, b) => b - a)} size="xs" className="flex-wrap" />
                  </div>
                ))}
              </div>
            )}
          </Plate>

          <Plate serial="WRK" title="Exact against rule of thumb">
            <Working
              steps={[
                { label: 'Unseen cards', expr: `52 − ${52 - unseen} known`, result: unseen },
                { label: 'Hit on the next card', expr: `${n} / ${unseen}`, result: pct(pNext, 2) },
                ...(flop
                  ? [
                      { label: 'Miss both turn and river', expr: `(${unseen - n}/${unseen}) × (${unseen - 1 - n}/${unseen - 1})`, result: pct(1 - pRiver, 2) },
                      { label: 'Hit at least once by the river', expr: `1 − ${num(1 - pRiver, 4)}`, result: pct(pRiver, 2) },
                      { label: 'Rule of 4', expr: `${n} × 4`, result: `${n * 4}% (off by ${num(Math.abs(n * 4 - pRiver * 100), 1)})` },
                      ...(n > 8 ? [{ label: 'Corrected rule for big draws', expr: `${n} × 4 − (${n} − 8)`, result: `${num(odds.rule4Corrected * 100, 0)}% (off by ${num(Math.abs(odds.rule4Corrected - pRiver) * 100, 1)})` }] : []),
                    ]
                  : []),
                { label: 'Rule of 2, one card', expr: `${n} × 2`, result: `${n * 2}% (off by ${num(Math.abs(n * 2 - pNext * 100), 1)})` },
              ]}
            />
            <p className="mt-4 text-[13px] text-dim">
              The rule of 4 assumes you see both cards for one price. If you may face another bet on the turn, use the
              one-card number.
            </p>
          </Plate>
        </div>
      )}
    </div>
  );
}
