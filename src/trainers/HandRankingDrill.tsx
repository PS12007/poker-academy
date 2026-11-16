import { useState } from 'react';
import type { Rng } from '../engine/rng';
import { categoryOf } from '../engine/evalCore';
import { describeHand, type HandDescription } from '../engine/describe';
import { Hand } from '../components/cards/PlayingCard';
import { Choices, DrillShell } from './Shell';

interface Round {
  hands: [number[], number[]];
  board: number[];
  d: [HandDescription, HandDescription];
  winner: 0 | 1 | 2; // 2 = split
}

function deal(rng: Rng): Round {
  // Keep dealing until the spot is instructive: same category or a split about two times in three.
  for (let tries = 0; ; tries++) {
    const deck = rng.shuffle(Array.from({ length: 52 }, (_, i) => i));
    const hands: [number[], number[]] = [deck.slice(0, 2), deck.slice(2, 4)];
    const board = deck.slice(4, 9);
    const d: [HandDescription, HandDescription] = [describeHand([...hands[0], ...board]), describeHand([...hands[1], ...board])];
    const close = categoryOf(d[0].rank) === categoryOf(d[1].rank);
    if (close || tries > 12 || rng.float() < 0.12) {
      return { hands, board, d, winner: d[0].rank === d[1].rank ? 2 : d[0].rank > d[1].rank ? 0 : 1 };
    }
  }
}

export default function HandRankingDrill() {
  const [picked, setPicked] = useState<number | null>(null);
  return (
    <DrillShell id="hand-ranking" generate={deal}>
      {({ round, answered, answer, n }) => (
        <div key={n}>
          <div className="grid gap-6 sm:grid-cols-[1fr_auto_1fr] sm:items-start">
            {[0, 1].map((p) => (
              <div key={p} className={p === 1 ? 'sm:order-3 sm:text-right' : undefined}>
                <div className="label mb-2">Player {p === 0 ? 'one' : 'two'}</div>
                <Hand cards={round.hands[p]} size="lg" marked={answered ? round.d[p].best : undefined} className={p === 1 ? 'sm:justify-end' : undefined} />
                {answered && <div className="display-i mt-3 text-[20px] leading-tight">{round.d[p].name}</div>}
              </div>
            ))}
            <div className="sm:order-2">
              <div className="label mb-2 sm:text-center">Board</div>
              <Hand cards={round.board} size="md" marked={answered ? round.d[round.winner === 1 ? 1 : 0].best : undefined} />
            </div>
          </div>
          <div className="mt-7">
            <div className="label mb-2">Who wins?</div>
            <Choices
              options={[{ value: 0, label: 'Player one' }, { value: 2, label: 'Split pot' }, { value: 1, label: 'Player two' }]}
              disabled={answered}
              picked={picked}
              correctValue={round.winner}
              onPick={(v) => {
                setPicked(v);
                answer(v === round.winner);
              }}
            />
          </div>
          {answered && (
            <p className="mt-4 text-[14px] text-dim">
              {round.winner === 2
                ? 'Both players make the same five-card hand, so the pot is split. Check which hole cards actually play.'
                : `${round.d[round.winner].name} beats ${round.d[1 - round.winner].name.toLowerCase()}. The framed cards are the five that play.`}
            </p>
          )}
        </div>
      )}
    </DrillShell>
  );
}
