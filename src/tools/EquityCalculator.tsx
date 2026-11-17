import { useMemo, useState } from 'react';
import { cardsToString, RANK_CHARS } from '../engine/cards';
import { exactWork, DEFAULT_EXACT_BUDGET, type EquityRequest, type EquityResult, type NextCardEquity, type PlayerSpec } from '../engine/equity';
import { expandRange, parseRange, type Range } from '../engine/ranges';
import { randomSeed } from '../engine/rng';
import { CardField } from '../components/cards/CardField';
import { SuitGlyph, suitTone } from '../components/cards/PlayingCard';
import { RangeEditor } from '../components/range/RangeEditor';
import { Figure, How, Plate, ProgressLine, Segmented, SplitBar } from '../components/ui/primitives';
import { useJob } from '../lib/engine';
import { cx, int, pct } from '../lib/format';
import { useStore } from '../store';

interface Seat {
  kind: 'hand' | 'range';
  cards: number[];
  range: Range;
}

type Mode = 'auto' | 'exact' | 'mc';
interface Output {
  result: EquityResult;
  next: NextCardEquity[] | null;
  boardLen: number;
}

const seat = (cards: number[] = [], range = ''): Seat => ({ kind: range ? 'range' : 'hand', cards, range: parseRange(range) });

export interface EquityCalculatorProps {
  /** Initial state, used when the calculator is embedded in a lesson. */
  initial?: { hands?: string[]; ranges?: (string | null)[]; board?: number[]; game?: 'holdem' | 'plo' | 'plo5' };
  embedded?: boolean;
}

export default function EquityCalculator({ initial, embedded }: EquityCalculatorProps) {
  const fourColor = useStore((s) => s.settings.fourColor);
  const [seats, setSeats] = useState<Seat[]>(() =>
    initial?.hands
      ? initial.hands.map((h, i) => {
          const r = initial.ranges?.[i];
          return r ? seat([], r) : seat(parseHand(h));
        })
      : [seat([51, 46]), seat([], 'QQ+, AKs, AKo')],
  );
  const [board, setBoard] = useState<number[]>(initial?.board ?? []);
  const [dead, setDead] = useState<number[]>([]);
  const [mode, setMode] = useState<Mode>('auto');
  const [iterations, setIterations] = useState(400_000);
  const [seed, setSeed] = useState(1);
  const [showDead, setShowDead] = useState(false);
  const [game, setGame] = useState<'holdem' | 'plo' | 'plo5'>(initial?.game ?? 'holdem');
  const holeSize = game === 'holdem' ? 2 : game === 'plo' ? 4 : 5;
  const omaha = game !== 'holdem';
  const switchGame = (g: 'holdem' | 'plo' | 'plo5') => {
    setGame(g);
    const size = g === 'holdem' ? 2 : g === 'plo' ? 4 : 5;
    setSeats((ss) => ss.map((x) => ({ ...x, kind: g === 'holdem' ? x.kind : 'hand', cards: x.cards.slice(0, size) })));
  };
  const job = useJob<Output>();

  const usedBy = (skip: number) => [...board, ...dead, ...seats.flatMap((s, i) => (i !== skip && s.kind === 'hand' ? s.cards : []))];
  const update = (i: number, patch: Partial<Seat>) => setSeats((ss) => ss.map((s, j) => (j === i ? { ...s, ...patch } : s)));

  const problem = useMemo(() => {
    if (![0, 3, 4, 5].includes(board.length)) return 'The board needs 0, 3, 4 or 5 cards.';
    for (let i = 0; i < seats.length; i++) {
      const s = seats[i];
      if (s.kind === 'hand' && s.cards.length !== holeSize) return `Player ${i + 1} needs ${holeSize} cards.`;
      if (s.kind === 'range' && !expandRange(s.range, [...board, ...dead]).length) return `Player ${i + 1} has an empty range.`;
    }
    return null;
  }, [seats, board, dead, holeSize]);

  const request = useMemo((): EquityRequest | null => {
    if (problem) return null;
    const blocked = [...board, ...dead];
    const players: PlayerSpec[] = seats.map((s) => {
      if (s.kind === 'hand') return { hands: [s.cards] };
      const combos = expandRange(s.range, blocked);
      return { hands: combos.map((c) => [c.c1, c.c2]), weights: combos.map((c) => c.w) };
    });
    return { game: omaha ? 'omaha' : 'holdem', players, board, dead, mode, iterations, seed };
  }, [problem, seats, board, dead, mode, iterations, seed, omaha]);

  const work = request ? exactWork(request) : 0;
  const willBeExact = mode === 'exact' || (mode === 'auto' && work <= DEFAULT_EXACT_BUDGET);
  const allHands = seats.every((s) => s.kind === 'hand');

  const run = (withSeed = seed) => {
    if (!request) return;
    const req = { ...request, seed: withSeed };
    job.run(async (api, onProgress) => {
      const result = await api.equity(req, onProgress);
      const next = allHands && (board.length === 3 || board.length === 4) ? await api.equityByNextCard({ ...req, mode: 'exact' }) : null;
      return { result, next, boardLen: board.length };
    });
  };

  const out = job.result;
  const tones = ['bg-madder', 'bg-bone', 'bg-verd', 'bg-brass', 'bg-lapis', 'bg-dim', 'bg-madder/60', 'bg-bone/60', 'bg-verd/60'];

  return (
    <div className={cx('grid gap-6', !embedded && 'xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]')}>
      <div className="space-y-6">
        {seats.map((s, i) => (
          <Plate
            key={i}
            serial={`P${i + 1}`}
            title={i === 0 ? 'Player one' : `Player ${i + 1}`}
            right={
              <span className="flex items-center gap-3">
                {!omaha && <button type="button" className={cx('hover:text-bone', s.kind === 'hand' && 'text-bone underline underline-offset-4')} onClick={() => update(i, { kind: 'hand' })}>Hand</button>}
                {!omaha && <button type="button" className={cx('hover:text-bone', s.kind === 'range' && 'text-bone underline underline-offset-4')} onClick={() => update(i, { kind: 'range' })}>Range</button>}
                {seats.length > 2 && (
                  <button type="button" className="text-madder hover:underline" onClick={() => setSeats((ss) => ss.filter((_, j) => j !== i))} aria-label={`Remove player ${i + 1}`}>
                    Remove
                  </button>
                )}
              </span>
            }
          >
            {s.kind === 'hand' ? (
              <CardField label="Hole cards" max={holeSize} value={s.cards} onChange={(cards) => update(i, { cards })} blocked={usedBy(i)} size={omaha ? 'md' : 'lg'} />
            ) : (
              <RangeEditor value={s.range} onChange={(range) => update(i, { range })} dead={[...board, ...dead]} compact minimal={embedded} />
            )}
          </Plate>
        ))}
        {seats.length < 9 && (
          <button type="button" className="btn w-full" onClick={() => setSeats((ss) => [...ss, seat()])}>
            + Add a player
          </button>
        )}
      </div>

      <div className="space-y-6">
        <Plate serial="GM" title="Game">
          <Segmented label="Game" value={game} onChange={switchGame} options={[{ value: 'holdem', label: "Hold'em" }, { value: 'plo', label: 'Omaha' }, { value: 'plo5', label: 'Omaha 5' }]} />
          {omaha && <p className="mt-3 text-[13px] text-dim">Each hand must use exactly two hole cards and three board cards. Ranges are Hold'em only.</p>}
        </Plate>

        <Plate serial="BD" title="Board" right={<button type="button" className="hover:text-bone" onClick={() => setShowDead((d) => !d)}>{showDead ? 'Hide dead cards' : 'Dead cards'}</button>}>
          <CardField label="Community cards" hint="0, 3, 4 or 5" max={5} value={board} onChange={setBoard} blocked={[...dead, ...seats.flatMap((s) => (s.kind === 'hand' ? s.cards : []))]} />
          {showDead && (
            <div className="mt-5 border-t border-bone/15 pt-4">
              <CardField label="Dead cards" hint="folded or exposed" max={8} size="sm" value={dead} onChange={setDead} blocked={[...board, ...seats.flatMap((s) => (s.kind === 'hand' ? s.cards : []))]} />
            </div>
          )}
        </Plate>

        <Plate serial="RUN" title="Method">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Segmented label="Method" value={mode} onChange={setMode} options={[{ value: 'auto', label: 'Auto' }, { value: 'exact', label: 'Exact' }, { value: 'mc', label: 'Monte Carlo' }]} />
            <span className="num text-[10.5px] text-dim">
              {request ? (willBeExact ? `exact · ${int(work)} evaluations` : `sampling · exact would need ${work > 1e12 ? '> 10¹²' : int(work)}`) : ''}
            </span>
          </div>
          {!willBeExact && (
            <div className="mt-4 grid grid-cols-2 gap-5">
              <div>
                <label className="label block" htmlFor="eq-iters">Trials</label>
                <select id="eq-iters" className="field" value={iterations} onChange={(e) => setIterations(Number(e.target.value))}>
                  {[100_000, 400_000, 1_000_000, 4_000_000].map((n) => (
                    <option key={n} value={n} className="bg-ink">{int(n)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label block" htmlFor="eq-seed">Seed</label>
                <input id="eq-seed" className="field" type="number" value={seed} onChange={(e) => setSeed(Number(e.target.value) >>> 0)} />
              </div>
            </div>
          )}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button type="button" className="btn btn-primary" disabled={!request || job.status === 'running'} onClick={() => run()}>
              Compute equity
            </button>
            {!willBeExact && out && (
              <button type="button" className="btn" disabled={job.status === 'running'} onClick={() => { const s = randomSeed(); setSeed(s); run(s); }}>
                Rerun with a new seed
              </button>
            )}
            {problem && <span className="text-[13px] text-dim">{problem}</span>}
          </div>
          {job.status === 'running' && <div className="mt-4"><ProgressLine value={job.progress} onCancel={job.cancel} /></div>}
          {job.status === 'cancelled' && <p className="label mt-4">Cancelled.</p>}
          {job.error && <p className="mt-4 text-[13px] text-madder" role="alert">{job.error}</p>}
        </Plate>

        {out && job.status !== 'running' && (
          <Plate
            serial="OUT"
            title="Equity"
            right={
              <span className="num normal-case tracking-normal">
                {out.result.method === 'exact' ? `exact · ${int(out.result.boards)} showdowns` : `Monte Carlo · ${int(out.result.samples)} trials · seed ${out.result.seed}`} · {out.result.ms} ms
              </span>
            }
          >
            <div className="mb-5">
              <SplitBar parts={out.result.players.map((p, i) => ({ value: p.equity, className: tones[i], label: `Player ${i + 1}` }))} />
            </div>
            <div className="divide-y divide-bone/10">
              {out.result.players.map((p, i) => (
                <div key={i} className="grid grid-cols-[auto_1fr] items-end gap-x-5 py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-2 self-center">
                    <span className={cx('h-2.5 w-2.5 rotate-45', tones[i])} />
                    <span className="label w-6">P{i + 1}</span>
                  </div>
                  <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
                    <Figure
                      size={seats.length > 3 ? 'sm' : 'md'}
                      value={pct(p.equity, 2)}
                      how={i === 0 ? (
                        out.result.method === 'exact' ? (
                          <>
                            Exact enumeration. Every compatible assignment of hands and every possible board completion
                            was dealt: {int(out.result.boards)} showdowns. Holdings that share a card with the board, the
                            dead cards or another player are skipped, which is how blockers are accounted for. Equity is
                            wins plus the player's share of split pots.
                          </>
                        ) : (
                          <>
                            Monte Carlo with seed {out.result.seed}. Each of {int(out.result.samples)} trials draws one
                            holding per player by weight, rejects the trial if any cards clash, then deals a random
                            board. The interval is the estimate plus or minus 1.96 standard errors, where the standard
                            error is the per-trial standard deviation divided by the square root of the trial count.
                            The same seed gives the same result.
                          </>
                        )
                      ) : undefined}
                    />
                    <div className="num pb-1 text-right text-[11px] leading-relaxed text-dim">
                      <div>win {pct(p.win, 2)} · tie {pct(p.tie, 2)}</div>
                      {p.ci && <div>95% CI {pct(p.ci[0], 2)} to {pct(p.ci[1], 2)} · se {pct(p.se ?? 0, 3)}</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Plate>
        )}

        {out?.next && job.status !== 'running' && (
          <Plate serial="NXT" title={`Player one equity by ${out.boardLen === 3 ? 'turn' : 'river'} card`} right={<How align="right">For each unseen card, the board was extended by that card and the equity recomputed exactly. The average of the bars equals the current equity.</How>}>
            <NextCardChart data={out.next} fourColor={fourColor} base={out.result.players[0].equity} />
          </Plate>
        )}
      </div>
    </div>
  );
}

function parseHand(text: string): number[] {
  const m = text.match(/[2-9TJQKA][cdhs]/gi) ?? [];
  return m.map((c) => RANK_CHARS.indexOf(c[0].toUpperCase()) * 4 + 'cdhs'.indexOf(c[1].toLowerCase()));
}

/** One thin bar per possible next card, grouped by rank. */
export function NextCardChart({ data, fourColor, base }: { data: NextCardEquity[]; fourColor: boolean; base: number }) {
  const sorted = [...data].sort((a, b) => b.card - a.card);
  return (
    <div>
      <div className="relative flex h-40 items-end gap-[2px]" role="img" aria-label={`Equity after each possible next card. Current equity ${pct(base)}.`}>
        <div className="pointer-events-none absolute inset-x-0 border-t border-dashed border-bone/40" style={{ bottom: `${base * 100}%` }}>
          <span className="num absolute -top-4 right-0 text-[9px] text-dim">now {pct(base)}</span>
        </div>
        {sorted.map((d) => (
          <div key={d.card} className="group relative flex h-full flex-1 items-end" title={`${cardsToString([d.card])}: ${pct(d.equity[0])}`}>
            <div
              className="w-full transition-[height] duration-500"
              style={{ height: `${Math.max(1, d.equity[0] * 100)}%`, background: suitTone(d.card & 3, fourColor), opacity: d.equity[0] >= base ? 0.95 : 0.4 }}
            />
            <span className="num pointer-events-none absolute -top-5 left-1/2 hidden -translate-x-1/2 whitespace-nowrap bg-ink px-1 text-[10px] text-bone group-hover:block">
              {cardsToString([d.card])} {pct(d.equity[0], 0)}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-[2px]">
        {sorted.map((d) => (
          <div key={d.card} className="flex flex-1 flex-col items-center font-mono text-[7px] leading-tight sm:text-[9px]" style={{ color: suitTone(d.card & 3, fourColor) }}>
            {RANK_CHARS[d.card >> 2]}
            <SuitGlyph suit={d.card & 3} size={5} />
          </div>
        ))}
      </div>
      <p className="mt-3 text-[12px] text-dim">Solid bars are cards that improve player one's equity. Faded bars are cards that hurt it.</p>
    </div>
  );
}
