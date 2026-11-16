import type { Rng } from '../engine/rng';
import { potOdds } from '../engine/ev';
import { alpha, bluffFraction, mdf } from '../engine/theory';
import { Figure, Working } from '../components/ui/primitives';
import { pct } from '../lib/format';
import { DrillShell, NumericAnswer } from './Shell';

type Kind = 'mdf' | 'alpha' | 'bluff' | 'odds';
interface Round {
  pot: number;
  bet: number;
  kind: Kind;
  truth: number;
}

const ASK: Record<Kind, { q: string; formula: string }> = {
  mdf: { q: 'What is the minimum defense frequency?', formula: 'MDF = pot / (pot + bet)' },
  alpha: { q: 'How often must a pure bluff work to break even?', formula: 'alpha = bet / (pot + bet)' },
  bluff: { q: 'On the river, what share of a balanced betting range is bluffs?', formula: 'bluff share = bet / (pot + 2 × bet)' },
  odds: { q: 'What equity does the caller need?', formula: 'equity needed = bet / (pot + 2 × bet)' },
};

function deal(rng: Rng): Round {
  const pot = (2 + rng.int(19)) * 10;
  const bet = Math.round((pot * rng.pick([0.25, 0.33, 0.5, 0.66, 0.75, 1, 1.25, 1.5, 2])) / 5) * 5;
  const kind = rng.pick(['mdf', 'alpha', 'bluff', 'odds'] as Kind[]);
  const truth = kind === 'mdf' ? mdf(pot, bet) : kind === 'alpha' ? alpha(pot, bet) : kind === 'bluff' ? bluffFraction(pot, bet) : potOdds(pot + bet, bet);
  return { pot, bet, kind, truth: truth * 100 };
}

export default function MdfDrill() {
  return (
    <DrillShell id="mdf" generate={deal} timeLimit={20} errorLabel="average miss, points">
      {({ round, answered, answer, n }) => (
        <div>
          <div className="grid grid-cols-2 gap-4 sm:max-w-md">
            <Figure size="lg" value={round.pot} caption="pot" />
            <Figure size="lg" value={round.bet} caption={`bet · ${pct(round.bet / round.pot, 0)} pot`} />
          </div>
          <p className="mt-6 text-[17px]">{ASK[round.kind].q}</p>
          <div className="mt-4">
            <NumericAnswer key={n} label="Answer, within 2 points" suffix="%" disabled={answered} onSubmit={(v) => answer(Math.abs(v - round.truth) <= 2, Math.abs(v - round.truth))} />
          </div>
          {answered && (
            <div className="mt-6">
              <Working
                steps={[
                  {
                    label: ASK[round.kind].formula,
                    expr: round.kind === 'mdf' ? `${round.pot} / (${round.pot} + ${round.bet})` : round.kind === 'alpha' ? `${round.bet} / (${round.pot} + ${round.bet})` : `${round.bet} / (${round.pot} + 2 × ${round.bet})`,
                    result: `${round.truth.toFixed(1)}%`,
                  },
                ]}
              />
            </div>
          )}
        </div>
      )}
    </DrillShell>
  );
}
