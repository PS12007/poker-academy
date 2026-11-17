import { useEffect, useMemo, useState } from 'react';
import { GLOSSARY } from '../content/glossary';
import { FORMULAS } from '../content/formulas';
import { holdemStartingHandFacts, outsOdds, probFlopSetOrBetter } from '../engine/combinatorics';
import { potOdds } from '../engine/ev';
import { mdf } from '../engine/theory';
import { useStore } from '../store';
import { grade, isDue, newCard } from '../lib/srs';
import { Plate, Segmented } from '../components/ui/primitives';
import { cx, pct } from '../lib/format';

interface Card {
  id: string;
  deck: 'terms' | 'formulas' | 'numbers';
  front: string;
  back: string;
}

function buildCards(): Card[] {
  const f = holdemStartingHandFacts();
  const numbers: [string, string][] = [
    ['Starting hand combos in Hold\'em', `${f.totalCombos.toLocaleString()} combos, ${f.distinctHands} distinct hands`],
    ['Combos of a pocket pair / suited hand / offsuit hand', '6 / 4 / 12'],
    ['Chance of being dealt any pocket pair', `${pct(f.pPair)}, 1 in 17`],
    ['Chance of being dealt pocket aces', `${pct(f.pAces, 2)}, 1 in 221`],
    ['A pair flops a set or better', pct(probFlopSetOrBetter())],
    ['Flush draw on the flop: chance to hit by the river', pct(outsOdds(9).byRiverFromFlop)],
    ['Open-ended straight draw on the flop: chance by the river', pct(outsOdds(8).byRiverFromFlop)],
    ['Gutshot on the flop: chance by the river', pct(outsOdds(4).byRiverFromFlop)],
    ['Equity needed to call a half-pot bet', pct(potOdds(1.5, 0.5))],
    ['Equity needed to call a pot-sized bet', pct(potOdds(2, 1))],
    ['MDF against a pot-sized bet', pct(mdf(1, 1))],
    ['MDF against a half-pot bet', pct(mdf(1, 0.5))],
    ['Unseen cards on the flop / turn (Hold\'em)', '47 / 46'],
    ['Unseen cards on the flop / turn (Omaha)', '45 / 44'],
    ['Biggest Omaha wrap', '20 outs, e.g. J-T-7-6 on 9-8-x'],
  ];
  return [
    ...GLOSSARY.map((g) => ({ id: `fc:t:${g.term}`, deck: 'terms' as const, front: g.term, back: g.def })),
    ...FORMULAS.map((x) => ({ id: `fc:f:${x.name}`, deck: 'formulas' as const, front: x.name, back: `${x.formula}${x.note ? `. ${x.note}` : ''}` })),
    ...numbers.map(([q, a]) => ({ id: `fc:n:${q}`, deck: 'numbers' as const, front: q, back: a })),
  ];
}

const DECKS = [
  { value: 'all', label: 'All' },
  { value: 'terms', label: 'Terms' },
  { value: 'formulas', label: 'Formulas' },
  { value: 'numbers', label: 'Numbers' },
] as const;

export default function Flashcards() {
  const srs = useStore((s) => s.srs);
  const setSrs = useStore((s) => s.setSrs);
  const cards = useMemo(buildCards, []);
  const [deck, setDeck] = useState<(typeof DECKS)[number]['value']>('all');
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(0);

  // Due cards first (oldest due date first), then cards never seen, in deck order.
  const queue = useMemo(() => {
    const inDeck = cards.filter((c) => deck === 'all' || c.deck === deck);
    const due = inDeck.filter((c) => srs[c.id] && isDue(srs[c.id])).sort((a, b) => srs[a.id].due - srs[b.id].due);
    const fresh = inDeck.filter((c) => !srs[c.id]);
    return [...due, ...fresh];
    // The queue is rebuilt when the deck changes or a card is graded.
  }, [cards, deck, srs]);

  const card = queue[0];

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key !== ' ' || t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'BUTTON') return;
      e.preventDefault();
      setFlipped((f) => !f);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);
  const learned = cards.filter((c) => srs[c.id] && !isDue(srs[c.id])).length;

  const rate = (q: number) => {
    if (!card) return;
    setSrs(card.id, grade(srs[card.id] ?? newCard(), q));
    setFlipped(false);
    setDone((d) => d + 1);
  };

  return (
    <Plate serial="FC" title="Flashcards" right={<Segmented label="Deck" value={deck} onChange={(v) => { setDeck(v); setFlipped(false); }} options={[...DECKS]} />}>
      <div className="mb-4 flex flex-wrap gap-x-6 gap-y-1 num text-[11px] text-dim">
        <span>{queue.length} to study</span>
        <span>{learned} scheduled for later</span>
        <span>{done} reviewed this session</span>
      </div>
      {!card ? (
        <p className="py-10 text-center text-[15px] text-dim">Nothing left in this deck for now. Cards come back as they fall due.</p>
      ) : (
        <div>
          <button
            type="button"
            onClick={() => setFlipped((f) => !f)}
            className="flex min-h-[220px] w-full flex-col items-center justify-center border border-bone/25 px-6 py-8 text-center transition-colors hover:border-bone/50"
            aria-label={flipped ? 'Card answer, tap to flip back' : 'Card question, tap to see the answer'}
          >
            <span className="label mb-4">{card.deck === 'terms' ? 'Define' : card.deck === 'formulas' ? 'Write the formula' : 'Recall the number'}</span>
            <span className={cx('display text-[30px] leading-tight sm:text-[40px]', flipped && 'text-[22px] text-dim sm:text-[26px]')}>{card.front}</span>
            {flipped && <span className="mt-5 max-w-[56ch] text-[17px] leading-relaxed text-bone">{card.back}</span>}
            {!flipped && <span className="label mt-6 text-faint">Tap or press space to flip</span>}
          </button>
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              [1, 'Again', 'back tomorrow'],
              [3, 'Hard', 'shorter gap'],
              [4, 'Good', 'normal gap'],
              [5, 'Easy', 'longer gap'],
            ].map(([q, label, note]) => (
              <button key={label as string} type="button" className={cx('btn flex-col !gap-0.5 !py-3', !flipped && 'opacity-40')} disabled={!flipped} onClick={() => rate(q as number)}>
                <span>{label}</span>
                <span className="text-[8.5px] text-faint">{note}</span>
              </button>
            ))}
          </div>
          <p className="mt-4 text-[12.5px] text-dim">Answer in your head, flip, then grade yourself honestly. The schedule is the same SM-2 rule as the quiz review.</p>
        </div>
      )}
    </Plate>
  );
}
