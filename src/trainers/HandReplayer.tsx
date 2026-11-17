import { useState, type ReactNode } from 'react';
import { parseCards } from '../engine/cards';
import { potOdds } from '../engine/ev';
import { Hand } from '../components/cards/PlayingCard';
import { Eq } from '../components/lesson/blocks';
import { Plate } from '../components/ui/primitives';
import { useStore } from '../store';
import { cx, pct } from '../lib/format';

interface Step {
  street: 'Preflop' | 'Flop' | 'Turn' | 'River';
  board: string;
  pot: number;
  /** What happened before the decision. */
  action: string;
  prompt: string;
  options: string[];
  answer: number;
  why: ReactNode;
}
interface ReplayHand {
  title: string;
  setup: string;
  hero: string;
  steps: Step[];
  result: string;
}

/** Original example hands written for this course. Stakes are in big blinds, stacks 100bb unless stated. */
const HANDS: ReplayHand[] = [
  {
    title: 'Top pair on a dry board',
    setup: 'Six-handed cash game, 100bb stacks. You are on the button.',
    hero: 'AsQd',
    steps: [
      {
        street: 'Preflop', board: '', pot: 1.5,
        action: 'Everyone folds to you.',
        prompt: 'What do you do with ace-queen offsuit?',
        options: ['Fold', 'Call 1bb', 'Raise to 2.5bb'],
        answer: 2,
        why: 'Ace-queen is far inside the button opening range. First in, raise or fold: a raise can win the blinds now and gives you the lead and position if called.',
      },
      {
        street: 'Flop', board: 'Qh7c2s', pot: 5.5,
        action: 'The big blind calls. The flop is Q-7-2 rainbow and they check.',
        prompt: 'You have top pair, top kicker on a dry board. What is the plan?',
        options: ['Check to trap', 'Bet about a third of the pot', 'Bet twice the pot'],
        answer: 1,
        why: 'This board is static and favors your range, so a small bet with most of your range is the pattern. Worse queens, sevens and pocket pairs call. A huge bet folds out everything you beat.',
      },
      {
        street: 'Turn', board: 'Qh7c2s5d', pot: 9.1,
        action: 'They call. The turn is the 5 of diamonds, a brick. They check again.',
        prompt: 'Bet again or check behind?',
        options: ['Check behind for pot control', 'Bet about two thirds of the pot', 'Go all-in'],
        answer: 1,
        why: 'Your hand is ahead of nearly everything that called the flop, and those hands can call again. Top pair top kicker is strong enough for three streets against a calling range that holds few better hands. Checking gives free cards to hands with five or six outs.',
      },
      {
        street: 'River', board: 'Qh7c2s5d9c', pot: 21.1,
        action: 'They call. The river is the 9 of clubs. They check a third time.',
        prompt: 'The pot is 21bb. What now?',
        options: ['Check behind', 'Bet about half the pot for value', 'Bet three times the pot'],
        answer: 1,
        why: 'Ask what calls. Worse queens such as Q-J and Q-T, and stubborn sevens, call a medium bet. Queen-nine just made two pair, but it is only a few combos. You beat well over half of that calling range, so this is a thin value bet, not a spot to check.',
      },
    ],
    result: 'They call with queen-ten and you win a pot of about 42bb. Three ordinary value bets with one pair, sized to keep worse hands in.',
  },
  {
    title: 'A draw facing a big bet',
    setup: 'Six-handed cash game, 100bb stacks. You are in the big blind with a suited connector.',
    hero: '8h7h',
    steps: [
      {
        street: 'Preflop', board: '', pot: 4,
        action: 'The cutoff raises to 2.5bb. The button and small blind fold.',
        prompt: 'You must put in 1.5bb to see a flop.',
        options: ['Fold', 'Call', '3-bet to 11bb'],
        answer: 1,
        why: <>The price is {pct(potOdds(4, 1.5))} and a suited connector realizes its equity well. It is a standard big blind defend. Three-betting is possible as a bluff but this hand plays too well as a call to turn into one.</>,
      },
      {
        street: 'Flop', board: 'Kh9c6h', pot: 5.5,
        action: 'The flop is K-9-6 with two hearts. You check and the cutoff bets 3.5bb.',
        prompt: 'You have a flush draw and an open-ended straight draw. What do you do?',
        options: ['Fold', 'Call', 'Check-raise to 12bb'],
        answer: 2,
        why: <>Fifteen outs to a straight or flush is a very strong draw: against a hand like ace-king you have <Eq a="8h7h" b="AsKd" board="Kh9c6h" /> equity. Check-raising wins the pot outright some of the time and builds it for when you hit. Calling is fine too. Folding is a clear mistake.</>,
      },
      {
        street: 'Turn', board: 'Kh9c6h2s', pot: 29.5,
        action: 'They call. The turn is the 2 of spades, missing you. Pot 29.5bb, 85.5bb behind.',
        prompt: 'You are out of position with a draw and one card to come.',
        options: ['Give up: check and fold', 'Bet about two thirds of the pot', 'Check and call a small bet only'],
        answer: 1,
        why: <>You still have fifteen outs, about a third to hit, and your check-raise represents sets and two pair. A second barrel puts their one-pair hands in a hard spot. If you check, you give up the fold equity that made the raise profitable.</>,
      },
      {
        street: 'River', board: 'Kh9c6h2s3d', pot: 68.5,
        action: 'They call again. The river is the 3 of diamonds. You missed. Pot 68.5bb, 66bb behind.',
        prompt: 'You have eight high.',
        options: ['Shove 66bb as a bluff', 'Check and give up', 'Bet 10bb'],
        answer: 0,
        why: 'This is the hard one. You have no showdown value, so checking wins nothing. A pot-sized shove needs to work half the time. Their range after calling twice is mostly a king, which is a bluff catcher against your line. Your line of check-raise, bet, shove represents sets and two pair, and you hold none of the kings they would call with. Against a player capable of folding, shoving is right. Against one who never folds top pair, give up. A tiny bet is the worst option because it folds out nothing.',
      },
    ],
    result: 'A bluff that fails costs a stack, and that is fine when the play is sound. Judge it by whether the opponent folds often enough, not by this one result.',
  },
  {
    title: 'Facing a river raise',
    setup: 'Six-handed cash game, 100bb stacks. You open under the gun.',
    hero: 'AhAd',
    steps: [
      {
        street: 'Preflop', board: '', pot: 1.5,
        action: 'You are first to act with pocket aces.',
        prompt: 'How do you play them?',
        options: ['Limp to trap', 'Raise to 2.5bb', 'Raise to 10bb'],
        answer: 1,
        why: 'The same size as every other hand you open. A limp or an odd size tells the table something. Aces want action, and a standard raise gets it.',
      },
      {
        street: 'Flop', board: 'Jc8c5s', pot: 6.5,
        action: 'The button calls, blinds fold. Flop J-8-5 with two clubs. You hold no club.',
        prompt: 'Out of position with an overpair on a board with draws.',
        options: ['Check and fold', 'Bet about two thirds of the pot', 'Bet a tenth of the pot'],
        answer: 1,
        why: 'The board is dynamic: flush draws, straight draws, and jacks all continue. A larger bet charges them and builds a pot while your hand is clearly best.',
      },
      {
        street: 'Turn', board: 'Jc8c5s2d', pot: 15.1,
        action: 'They call. The turn is the 2 of diamonds.',
        prompt: 'A brick. Continue?',
        options: ['Check', 'Bet about two thirds of the pot again', 'Shove 93bb'],
        answer: 1,
        why: 'Nothing changed, so the hand that was ahead is still ahead. Draws now have one card to come and must pay again. An overbet shove folds out the jacks you want to keep in.',
      },
      {
        street: 'River', board: 'Jc8c5s2d9c', pot: 35.1,
        action: 'They call. The river is the 9 of clubs: the flush comes in and T-7 and Q-T make straights. You bet 12bb as a block bet and the button raises to 48bb.',
        prompt: 'You must call 36bb to win 95bb.',
        options: ['Call, aces are too strong to fold', 'Fold', 'Re-raise all-in'],
        answer: 1,
        why: <>You need {pct(potOdds(95.1, 36))} equity. Their line is call, call, raise on the card that completes every draw. That is a consistent story for a flush or straight, and river raises from most players are very rarely bluffs. Your aces beat none of their value hands and you hold no club to block a flush. It is one pair on a board with three clubs and four to a straight. Fold.</>,
      },
    ],
    result: 'Folding aces feels wrong and is correct here. Hand strength is relative to the board and the action, and a bluff catcher is a bluff catcher whatever it looked like before the flop.',
  },
  {
    title: 'Short stack in a tournament',
    setup: 'Tournament, well before the money. Blinds 500/1,000 with a 1,000 big-blind ante. You have 9,000 chips (9bb) on the button.',
    hero: 'Ks9d',
    steps: [
      {
        street: 'Preflop', board: '', pot: 2.5,
        action: 'Everyone folds to you. There are 2.5bb in the pot: the blinds and the ante.',
        prompt: 'King-nine offsuit with 9 big blinds. What is the best play?',
        options: ['Fold and wait for a better hand', 'Raise to 2bb', 'Move all-in'],
        answer: 2,
        why: 'At 9bb, raising small commits a big part of your stack without the fold equity of a shove. King-nine is well inside a button jamming range at this depth: the push/fold solver jams far wider than this. Waiting costs 2.5bb every orbit.',
      },
      {
        street: 'Preflop', board: '', pot: 11.5,
        action: 'You shove 9bb. The small blind folds and the big blind calls with A♠J♣. The cards are turned over.',
        prompt: 'You are behind. Was the shove a mistake?',
        options: ['Yes, you got called by a better hand', 'No. Folds win the pot often, and you still have about a third of the equity when called', 'Only if you lose'],
        answer: 1,
        why: <>King-nine against ace-jack has about <Eq a="Ks9d" b="AsJc" /> equity. The shove earned most of its value from the times both blinds folded. One bad call-off does not change whether the decision was right.</>,
      },
    ],
    result: 'Short-stack tournament play is mostly push or fold. Judge the decision by the whole range of outcomes, not by the one hand that got called.',
  },
  {
    title: 'An overpair in a 3-bet pot',
    setup: 'Six-handed cash game, 100bb stacks. The cutoff opens to 2.5bb and you 3-bet to 8bb from the button.',
    hero: 'QhQc',
    steps: [
      {
        street: 'Preflop', board: '', pot: 17.5,
        action: 'The cutoff calls. The pot is 17.5bb with 92bb behind each, an SPR of about 5.',
        prompt: 'Before the flop comes: with SPR 5 and queens, what is the plan?',
        options: ['Be ready to fold to any bet', 'Be willing to get all-in on most boards without an ace or king', 'Only continue with a set'],
        answer: 1,
        why: 'At SPR 5, an overpair is near the top of the range and two good bets get stacks in. Plan to commit on safe boards and slow down on boards with an ace, a king, or heavy draws.',
      },
      {
        street: 'Flop', board: 'Ts6d3c', pot: 17.5,
        action: 'The flop is T-6-3 rainbow. The cutoff checks.',
        prompt: 'A dry, low board. What do you do?',
        options: ['Check behind', 'Bet about a third of the pot', 'Shove 92bb'],
        answer: 1,
        why: 'Your range, full of big pairs, owns this board. A small bet keeps worse pairs and overcards in, and sets up a bigger turn bet. Shoving folds out every hand you beat.',
      },
      {
        street: 'Turn', board: 'Ts6d3c8h', pot: 29.5,
        action: 'They call. The turn is the 8 of hearts. They check again.',
        prompt: 'The pot is 29.5bb with 86bb behind.',
        options: ['Check to control the pot', 'Bet about two thirds of the pot, planning to shove the river', 'Fold'],
        answer: 1,
        why: 'Queens are still ahead of nearly every hand that called the flop. A two-thirds bet now and a river shove gets the stacks in over two streets, which is exactly what SPR planning said.',
      },
    ],
    result: 'Planning from the SPR before the flop makes the later streets simple. With a strong hand at a low SPR, size your bets so the stacks can go in by the river.',
  },
];

export default function HandReplayer() {
  const record = useStore((s) => s.recordRound);
  const [h, setH] = useState(0);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [started, setStarted] = useState(Date.now());
  const hand = HANDS[h];
  const done = i >= hand.steps.length;
  const step = hand.steps[Math.min(i, hand.steps.length - 1)];

  const go = (next: number) => {
    setH(next);
    setI(0);
    setPicked(null);
    setScore(0);
    setStarted(Date.now());
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[240px_minmax(0,1fr)]">
      <nav className="plate self-start" aria-label="Hands">
        <div className="plate-head"><span className="label text-bone">Hands</span></div>
        <ul>
          {HANDS.map((x, k) => (
            <li key={x.title} className="border-b border-bone/10 last:border-0">
              <button type="button" onClick={() => go(k)} className={cx('flex w-full items-baseline gap-3 px-4 py-3 text-left text-[14px] hover:bg-bone/[0.05]', k === h && 'text-madder')}>
                <span className="num text-[10px] text-faint">{String(k + 1).padStart(2, '0')}</span>
                {x.title}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <Plate serial={`H-${String(h + 1).padStart(2, '0')}`} title={hand.title} right={done ? `${score} of ${hand.steps.length}` : `${step.street} · decision ${i + 1} of ${hand.steps.length}`}>
        <p className="text-[14px] text-dim">{hand.setup}</p>
        <div className="mt-5 flex flex-wrap items-end gap-x-10 gap-y-5">
          <div><div className="label mb-2">Your hand</div><Hand cards={parseCards(hand.hero)} size="lg" /></div>
          <div>
            <div className="label mb-2">Board</div>
            <Hand key={step.board} cards={parseCards(step.board)} size="lg" slots={5} />
          </div>
          <div className="pb-1"><div className="figure text-[34px]">{step.pot}</div><div className="label">pot, bb</div></div>
        </div>

        {done ? (
          <div className="mt-6 border-t border-bone/15 pt-5">
            <div className="display-i text-[30px]">{score} of {hand.steps.length} decisions matched.</div>
            <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-dim">{hand.result}</p>
            <div className="mt-5 flex gap-3">
              {h + 1 < HANDS.length && <button type="button" className="btn btn-primary" onClick={() => go(h + 1)}>Next hand</button>}
              <button type="button" className="btn" onClick={() => go(h)}>Replay this hand</button>
            </div>
          </div>
        ) : (
          <div className="mt-6 border-t border-bone/15 pt-5">
            <p className="text-[15px] text-dim">{step.action}</p>
            <p className="mt-2 text-[18px]">{step.prompt}</p>
            <ol className="mt-4 border-t border-bone/20">
              {step.options.map((o, k) => {
                const shown = picked !== null;
                const right = k === step.answer;
                return (
                  <li key={o} className="border-b border-bone/20">
                    <button
                      type="button"
                      disabled={shown}
                      onClick={() => {
                        setPicked(k);
                        if (right) setScore((s) => s + 1);
                        record('replayer', right, Date.now() - started);
                        setStarted(Date.now());
                      }}
                      className={cx('flex w-full items-baseline gap-4 px-1 py-3 text-left', !shown && 'hover:bg-bone/[0.06]', shown && right && 'bg-verd/10', shown && picked === k && !right && 'bg-madder/10')}
                    >
                      <span className={cx('num w-5 text-[11px]', shown && right ? 'text-verd' : shown && picked === k ? 'text-madder' : 'text-faint')}>{String.fromCharCode(65 + k)}</span>
                      <span className="flex-1 text-[15px]">{o}</span>
                      {shown && right && <span className="label text-verd">Best</span>}
                    </button>
                  </li>
                );
              })}
            </ol>
            {picked !== null && (
              <>
                <div className="mt-5 border-l-2 pl-4 text-[14.5px] leading-relaxed text-dim" style={{ borderColor: picked === step.answer ? 'rgb(var(--verd))' : 'rgb(var(--madder))' }}>{step.why}</div>
                <div className="mt-5 flex justify-end">
                  <button type="button" className="btn btn-primary" onClick={() => { setI(i + 1); setPicked(null); }}>{i + 1 >= hand.steps.length ? 'See the result' : 'Next street'}</button>
                </div>
              </>
            )}
          </div>
        )}
      </Plate>
    </div>
  );
}
