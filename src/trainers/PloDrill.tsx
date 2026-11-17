import { useState } from 'react';
import type { Rng } from '../engine/rng';
import { bestOmaha, omahaOuts } from '../engine/omaha';
import { describeHand, describeRank } from '../engine/describe';
import { Hand } from '../components/cards/PlayingCard';
import { Choices, DrillShell, NumericAnswer } from './Shell';

type Round =
  | { kind: 'read'; hole: number[]; board: number[]; truth: string; trap: string; options: string[]; plays: number[] }
  | { kind: 'wrap'; hole: number[]; board: number[]; outs: number[] };

function deal(rng: Rng): Round {
  for (;;) {
    const deck = rng.shuffle(Array.from({ length: 52 }, (_, i) => i));
    const hole = deck.slice(0, 4);
    if (rng.float() < 0.5) {
      const board = deck.slice(4, 9);
      const best = bestOmaha(hole, board);
      const truth = describeRank(best.rank);
      // The Hold'em reading of the same cards is the trap.
      const trap = describeHand([...hole, ...board]).name;
      if (trap === truth) continue;
      const other = describeHand(board).name;
      const options = [...new Set([truth, trap, other])];
      if (options.length < 3) continue;
      rng.shuffle(options);
      return { kind: 'read', hole, board, truth, trap, options, plays: [...best.hole, ...best.board] };
    }
    // Wrap rounds: favour connected holdings by retrying until there is a real straight draw.
    const board = deck.slice(4, 7);
    const outs = omahaOuts(hole, board, 4);
    if (outs.length < 8 || outs.length > 22) continue;
    return { kind: 'wrap', hole, board, outs };
  }
}

function ReadRound({ round, answered, answer }: { round: Extract<Round, { kind: 'read' }>; answered: boolean; answer: (ok: boolean) => void }) {
  const [picked, setPicked] = useState<string | null>(null);
  return (
    <>
      <p className="mt-6 text-[17px]">What is this player's best Omaha hand?</p>
      <div className="mt-3">
        <Choices
          options={round.options.map((o) => ({ value: o, label: <span className="normal-case tracking-normal">{o}</span> }))}
          disabled={answered}
          picked={picked}
          correctValue={round.truth}
          onPick={(v) => {
            setPicked(v);
            answer(v === round.truth);
          }}
        />
      </div>
      {answered && (
        <p className="mt-4 text-[14px] leading-relaxed text-dim">
          The framed cards play: exactly two from the hand and three from the board. Read like Hold'em, the same cards
          would make {round.trap.toLowerCase()}, which is not available in Omaha.
        </p>
      )}
    </>
  );
}

function WrapRound({ round, answered, answer }: { round: Extract<Round, { kind: 'wrap' }>; answered: boolean; answer: (ok: boolean, err: number) => void }) {
  const [said, setSaid] = useState<number | null>(null);
  return (
    <>
      <p className="mt-6 text-[17px]">How many turn cards give this hand a straight or better?</p>
      <div className="mt-3">
        <NumericAnswer label="Outs" disabled={answered} onSubmit={(v) => { setSaid(v); answer(v === round.outs.length, Math.abs(v - round.outs.length)); }} />
      </div>
      {answered && (
        <div className="mt-5 border-t border-bone/15 pt-4">
          <div className="flex items-end gap-4">
            <div className="figure text-[52px] text-madder">{round.outs.length}</div>
            <div className="label pb-2">outs{said !== null ? ` · you said ${said}` : ''}</div>
          </div>
          <div className="mt-3"><Hand cards={[...round.outs].sort((a, b) => b - a)} size="xs" className="flex-wrap" /></div>
          <p className="mt-3 text-[13px] text-dim">Each one completes a straight (or better) using exactly two of the four hole cards.</p>
        </div>
      )}
    </>
  );
}

export default function PloDrill() {
  return (
    <DrillShell id="plo" generate={deal} errorLabel="average miss, outs">
      {({ round, answered, answer, n }) => (
        <div key={n}>
          <div className="label text-madder">{round.kind === 'read' ? 'Read the hand' : 'Count the wrap'}</div>
          <div className="mt-3 flex flex-wrap items-end gap-x-10 gap-y-5">
            <div><div className="label mb-2">Hole cards</div><Hand cards={round.hole} size="lg" marked={answered && round.kind === 'read' ? round.plays : undefined} /></div>
            <div><div className="label mb-2">Board</div><Hand cards={round.board} size="lg" marked={answered && round.kind === 'read' ? round.plays : undefined} /></div>
          </div>
          {round.kind === 'read' ? <ReadRound round={round} answered={answered} answer={(ok) => answer(ok)} /> : <WrapRound round={round} answered={answered} answer={answer} />}
        </div>
      )}
    </DrillShell>
  );
}
