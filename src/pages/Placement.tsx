import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ALL_LESSONS, lessonPath, MODULES } from '../content/curriculum';
import { potOdds } from '../engine/ev';
import { mdf } from '../engine/theory';
import { probHitOuts } from '../engine/combinatorics';
import { useStore } from '../store';
import { QuestionCard, type ChoiceQuestion } from '../components/quiz/Quiz';
import { PageHeader, Plate } from '../components/ui/primitives';
import { cx, pad } from '../lib/format';

interface PQ extends ChoiceQuestion {
  module: string;
}
const p = (x: number) => `${(x * 100).toFixed(0)}%`;

/** Fifteen questions, three per Hold'em module, in order of difficulty. */
const QUESTIONS: PQ[] = [
  { module: 'm1', q: 'Which hand ranks higher?', choices: ['A straight', 'A flush', 'Three of a kind', 'Two pair'], answer: 1, why: 'Flushes are rarer than straights, so they rank higher.' },
  { module: 'm1', q: 'Which seat acts last on the flop, turn and river?', choices: ['Big blind', 'Under the gun', 'Button', 'Small blind'], answer: 2, why: 'The button acts last on every postflop street.' },
  { module: 'm1', q: 'The board is A-K-Q-J-10 in mixed suits. You hold 9-9, your opponent 3-2. Result?', choices: ['You win', 'They win', 'Split pot', 'Redeal'], answer: 2, why: 'The board is the best hand for both players.' },
  { module: 'm2', q: 'You have a flush draw on the flop. How many outs?', choices: ['4', '8', '9', '13'], answer: 2, why: 'Thirteen of the suit minus the four you can see.' },
  { module: 'm2', q: 'The pot is 100 and your opponent bets 50. What equity do you need to call?', choices: ['20%', p(potOdds(150, 50)), '33%', '50%'], answer: 1, why: '50 / (150 + 50).' },
  { module: 'm2', q: 'With 9 outs on the flop and both cards to come, about how often do you hit?', choices: ['18%', p(probHitOuts(9, 47, 2)), '45%', '50%'], answer: 1, why: 'One minus (38/47) × (37/46).' },
  { module: 'm3', q: 'What is a 3-bet before the flop?', choices: ['A bet of three big blinds', 'The first re-raise over an open raise', 'The third bet on the flop', 'A raise from the third seat'], answer: 1, why: 'Blinds are the first bet, the open is the second, the re-raise is the third.' },
  { module: 'm3', q: 'Why can the big blind defend wider than other seats against a raise?', choices: ['It has position', 'It gets a discount and closes the action', 'It has better cards', 'It cannot be re-raised'], answer: 1, why: 'One blind is already in, so the price is better, and nobody is left to raise behind.' },
  { module: 'm3', q: 'A polarized 3-betting range contains:', choices: ['Only premium hands', 'The strongest hands plus some bluffs, with medium hands calling', 'Every hand above a cutoff', 'Only suited hands'], answer: 1, why: 'Polarized means top and bottom, with the middle played another way.' },
  { module: 'm4', q: 'On which flop does the preflop raiser have the bigger range advantage against a big blind caller?', choices: ['7-6-5 two-tone', 'A-K-4 rainbow', '8-8-3 rainbow', '5-4-2 rainbow'], answer: 1, why: 'High-card boards hit the raiser’s range of big cards far more than the caller’s.' },
  { module: 'm4', q: 'What is SPR?', choices: ['Suited pair ratio', 'Effective stack divided by the pot', 'Showdown percentage rate', 'Small pot raise'], answer: 1, why: 'Stack-to-pot ratio, used to plan commitment.' },
  { module: 'm4', q: 'You bluff the river. Which card in your hand helps most?', choices: ['A card that blocks their folding hands', 'A card that blocks their calling hands', 'Any ace', 'A low card'], answer: 1, why: 'Blocking the hands that call makes folds more likely.' },
  { module: 'm5', q: 'Facing a pot-sized bet, what is the minimum defense frequency?', choices: ['33%', p(mdf(1, 1)), '67%', '75%'], answer: 1, why: 'pot / (pot + bet) = 1/2.' },
  { module: 'm5', q: 'In a Nash equilibrium:', choices: ['Both players win', 'No player can gain by changing only their own strategy', 'The better player always wins', 'Nobody bluffs'], answer: 1, why: 'That mutual best-response property is the definition.' },
  { module: 'm5', q: 'On the river a polarized range bets the pot. What share of the betting range should be bluffs to make a bluff catcher indifferent?', choices: ['25%', '33%', '50%', '67%'], answer: 1, why: 'bet / (pot + 2 × bet) = 1/3, the caller’s pot odds.' },
  { module: 'm6', q: 'In a tournament, why is doubling your stack usually worth less than double your prize equity?', choices: ['It is not', 'Payouts are spread over many places, so extra chips add less and busting costs a lot', 'Blinds go up', 'Antes'], answer: 1, why: 'That is the core of ICM: chips won are worth less than chips lost.' },
  { module: 'm6', q: 'With 8 big blinds on the button and everyone folding to you, what is the usual play with a hand worth playing?', choices: ['Raise to 2bb', 'Move all-in', 'Limp', 'Always fold'], answer: 1, why: 'At short stacks push or fold beats small raises: maximum fold equity and no tough postflop spots.' },
  { module: 'm6', q: 'On the bubble, a medium stack faces an all-in from the chip leader. Compared with chip pot odds, the call needs:', choices: ['Less equity', 'More equity', 'The same', 'No equity'], answer: 1, why: 'The bubble factor is above 1, so the equity needed rises above the chip price.' },
  { module: 'm7', q: 'In Omaha, how many of your hole cards must you use?', choices: ['Any number', 'At least one', 'Exactly two', 'All four'], answer: 2, why: 'Exactly two from your hand and exactly three from the board.' },
  { module: 'm7', q: 'Pot is 100 and your opponent bets 50 in pot-limit. What is the most you can raise to?', choices: ['150', '200', '250', '300'], answer: 2, why: 'Raise to 3 × bet + old pot = 150 + 100 = 250.' },
  { module: 'm7', q: 'Why do Omaha preflop equities run closer than Hold’em?', choices: ['Smaller deck', 'Each hand has six two-card combinations, so underdogs catch up more often', 'Pot limit', 'More players'], answer: 1, why: 'More combinations means more ways to make strong hands for both players.' },
];

export default function Placement() {
  const setPlacement = useStore((s) => s.setPlacement);
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const finished = i >= QUESTIONS.length;

  const byModule = ['m1', 'm2', 'm3', 'm4', 'm5'].map((m) => {
    const idx = QUESTIONS.map((q, k) => (q.module === m ? k : -1)).filter((k) => k >= 0);
    return { m, right: idx.filter((k) => answers[k]).length, total: idx.length };
  });
  const tracks = ['m6', 'm7'].map((m) => {
    const idx = QUESTIONS.map((q, k) => (q.module === m ? k : -1)).filter((k) => k >= 0);
    return { m, right: idx.filter((k) => answers[k]).length, total: idx.length };
  });
  // Start at the first module where fewer than two of three were right.
  const start = byModule.find((b) => b.right < 2)?.m ?? 'm5';
  const mod = MODULES.find((m) => m.id === start)!;
  const first = ALL_LESSONS.find((l) => l.module.id === start && l.available) ?? ALL_LESSONS.find((l) => l.available);

  return (
    <div>
      <PageHeader serial="PQ" kicker="Placement" title={<>Where should <span className="italic text-madder">you start?</span></>} lede="Fifteen Hold'em questions that get harder as they go, then three each on tournaments and Omaha. If you do not know, pick anything and move on: guessing only hurts the result." />
      <div className="mx-auto max-w-[760px]">
        {finished ? (
          <Plate serial="OUT" title="Suggested starting point">
            <div className="figure text-[84px] text-madder">{pad(mod.n)}</div>
            <div className="display mt-1 text-[38px]">{mod.title}</div>
            <p className="mt-3 text-dim">{mod.blurb}</p>
            <ul className="mt-6 border-t border-bone/20">
              {[...byModule, ...tracks].map((b) => {
                const m = MODULES.find((x) => x.id === b.m)!;
                return (
                  <li key={b.m} className="flex items-center gap-3 border-b border-bone/10 py-2.5">
                    <span className="num w-5 text-[10px] text-faint">{pad(m.n)}</span>
                    <span className="flex-1 text-[14px]">{m.title}</span>
                    <span className={cx('num text-[12px]', b.right >= 2 ? 'text-verd' : 'text-madder')}>{b.right} of {b.total}</span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-5 text-[13.5px] leading-relaxed text-dim">
              {tracks.map((t) => {
                const m = MODULES.find((x) => x.id === t.m)!;
                return t.right >= 2 ? `${m.title}: you know the basics, so skim it when you get there. ` : `${m.title}: worth taking once the Hold'em modules feel solid. `;
              })}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {first && <Link to={first.module.id === start ? lessonPath(first) : `/course#${start}`} className="btn btn-primary">{first.module.id === start ? `Start: ${first.title}` : 'See the module'}</Link>}
              <button type="button" className="btn" onClick={() => { setI(0); setAnswers([]); }}>Take it again</button>
            </div>
            {first?.module.id !== start && <p className="mt-4 text-[13px] text-dim">That module is still being written. Until it is ready, the earlier modules are the best use of your time.</p>}
          </Plate>
        ) : (
          <Plate serial="PQ" title="Placement quiz" right={`Question ${i + 1} of ${QUESTIONS.length}`}>
            <div className="mb-5 flex gap-1" aria-hidden="true">
              {QUESTIONS.map((_, k) => <span key={k} className={cx('h-[3px] flex-1', k < answers.length ? (answers[k] ? 'bg-verd' : 'bg-madder') : k === i ? 'bg-bone/60' : 'bg-bone/15')} />)}
            </div>
            <QuestionCard key={i} question={QUESTIONS[i]} onAnswered={(ok) => setAnswers((a) => [...a, ok])} />
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                className="btn btn-primary"
                disabled={answers.length <= i}
                onClick={() => {
                  if (i + 1 >= QUESTIONS.length) {
                    const res = ['m1', 'm2', 'm3', 'm4', 'm5'].find((m) => QUESTIONS.filter((q, k) => q.module === m && answers[k]).length < 2) ?? 'm5';
                    setPlacement(res);
                  }
                  setI(i + 1);
                }}
              >
                {i + 1 >= QUESTIONS.length ? 'See the result' : 'Next question'}
              </button>
            </div>
          </Plate>
        )}
      </div>
    </div>
  );
}
