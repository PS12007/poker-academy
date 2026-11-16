import { useState } from 'react';
import type { Rng } from '../engine/rng';
import { cardsToString } from '../engine/cards';
import { handVsHand } from '../engine/equity';
import { Hand } from '../components/cards/PlayingCard';
import { Slider } from '../components/ui/primitives';
import { int, pct } from '../lib/format';
import { DrillShell, type RoundApi } from './Shell';

interface Round {
  hero: number[];
  villain: number[];
  board: number[];
  equity: number;
  boards: number;
}

const TOLERANCE = 5;

function deal(rng: Rng): Round {
  const deck = rng.shuffle(Array.from({ length: 52 }, (_, i) => i));
  // Favour playable cards: take the better of two candidate hands for each player.
  const pick = (a: number[], b: number[]) => (a[0] + a[1] > b[0] + b[1] ? a : b);
  const hero = pick(deck.slice(0, 2), deck.slice(2, 4)).sort((x, y) => y - x);
  const villain = pick(deck.slice(4, 6), deck.slice(6, 8)).sort((x, y) => y - x);
  const board = rng.float() < 0.5 ? [] : deck.slice(8, 11);
  const r = handVsHand([cardsToString(hero), cardsToString(villain)], cardsToString(board));
  return { hero, villain, board, equity: r.players[0].equity, boards: r.boards };
}

function Entry({ round, answered, answer }: Pick<RoundApi<Round>, 'round' | 'answered' | 'answer'>) {
  const [guess, setGuess] = useState(50);
  const truth = round.equity * 100;
  return (
    <div>
      <div className="flex flex-wrap items-end gap-x-10 gap-y-5">
        <div><div className="label mb-2">You</div><Hand cards={round.hero} size="lg" /></div>
        <div><div className="label mb-2">Opponent</div><Hand cards={round.villain} size="lg" /></div>
        <div><div className="label mb-2">{round.board.length ? 'Flop' : 'Before the flop'}</div><Hand cards={round.board} size="md" slots={round.board.length ? 3 : 0} /></div>
      </div>
      <div className="mt-7 max-w-md">
        <Slider label="Your equity, all-in right now" min={0} max={100} step={1} value={guess} onChange={(v) => !answered && setGuess(v)} format={(v) => `${v}%`} />
      </div>
      {!answered && <button type="button" className="btn mt-3" onClick={() => answer(Math.abs(guess - truth) <= TOLERANCE, Math.abs(guess - truth))}>Lock in</button>}
      {answered && (
        <div className="mt-6 flex flex-wrap items-end gap-x-8 gap-y-2 border-t border-bone/15 pt-4">
          <div><div className="figure text-[52px] text-madder">{pct(round.equity)}</div><div className="label mt-1">exact · {int(round.boards)} runouts</div></div>
          <div className="num pb-1 text-[12px] leading-relaxed text-dim">
            <div>you said {guess}% · off by {Math.abs(guess - truth).toFixed(1)}</div>
            <div>within {TOLERANCE} points counts as correct</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EquityDrill() {
  return (
    <DrillShell id="equity" generate={deal} errorLabel="average miss, points">
      {({ round, answered, answer, n }) => <Entry key={n} round={round} answered={answered} answer={answer} />}
    </DrillShell>
  );
}
