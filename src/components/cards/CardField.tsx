import { useEffect, useId, useState, type CSSProperties } from 'react';
import { cardsToString, cardToString, RANK_CHARS, tryParseCards } from '../../engine/cards';
import { useStore } from '../../store';
import { cx } from '../../lib/format';
import { cardLabel, PlayingCard, SuitGlyph, suitTone, type CardSize } from './PlayingCard';

/** 52-card grid. Suits are rows, ranks are columns A..2. */
export function CardPicker({
  selected, blocked, onToggle,
}: {
  selected: readonly number[];
  blocked: readonly number[];
  onToggle: (card: number) => void;
}) {
  const fourColor = useStore((s) => s.settings.fourColor);
  return (
    <div className="grid gap-[2px]" style={{ gridTemplateColumns: 'repeat(13, minmax(0, 1fr))' }} role="group" aria-label="Card picker">
      {[3, 2, 1, 0].map((suit) =>
        Array.from({ length: 13 }, (_, i) => {
          const rank = 12 - i;
          const card = rank * 4 + suit;
          const isSel = selected.includes(card);
          const isBlocked = !isSel && blocked.includes(card);
          return (
            <button
              key={card}
              type="button"
              disabled={isBlocked}
              aria-pressed={isSel}
              aria-label={cardLabel(card)}
              onClick={() => onToggle(card)}
              className={cx(
                'flex aspect-[5/6] min-h-[30px] flex-col items-center justify-center gap-[2px] border font-mono text-[12px] font-medium leading-none transition-colors',
                isSel ? 'border-bone bg-bone' : 'border-bone/15 hover:border-bone/60',
                isBlocked && 'opacity-20',
              )}
              style={{ color: isSel ? 'rgb(var(--ink))' : suitTone(suit, fourColor) }}
            >
              {RANK_CHARS[rank]}
              <SuitGlyph suit={suit} size={8} />
            </button>
          );
        }),
      )}
    </div>
  );
}

interface FieldProps {
  label: string;
  value: number[];
  onChange: (cards: number[]) => void;
  /** Maximum number of cards. */
  max: number;
  /** Cards used elsewhere that cannot be picked here. */
  blocked?: readonly number[];
  size?: CardSize;
  /** Valid counts, e.g. [0, 3, 4, 5] for a board. Used only for the hint. */
  hint?: string;
  placeholder?: string;
  marked?: readonly number[];
  /** Start with the picker open. */
  defaultOpen?: boolean;
}

/**
 * The one card input used everywhere: tap slots to open a picker, or type
 * cards as text (AsKd). Both stay in sync.
 */
export function CardField({
  label, value, onChange, max, blocked = [], size = 'md', hint, placeholder, marked, defaultOpen = false,
}: FieldProps) {
  const id = useId();
  const [open, setOpen] = useState(defaultOpen);
  const [text, setText] = useState(cardsToString(value));
  const [bad, setBad] = useState(false);

  useEffect(() => {
    setText((t) => {
      const parsed = tryParseCards(t);
      return parsed && cardsToString(parsed) === cardsToString(value) ? t : cardsToString(value);
    });
    setBad(false);
  }, [value]);

  const toggle = (card: number) => {
    if (value.includes(card)) onChange(value.filter((c) => c !== card));
    else if (value.length < max) onChange([...value, card]);
    else if (max === 1) onChange([card]);
  };

  const onText = (t: string) => {
    setText(t);
    const parsed = tryParseCards(t);
    if (parsed && parsed.length <= max && !parsed.some((c) => blocked.includes(c))) {
      setBad(false);
      if (cardsToString(parsed) !== cardsToString(value)) onChange(parsed);
    } else setBad(t.trim() !== '');
  };

  const slots: (number | null)[] = [...value];
  while (slots.length < max) slots.push(null);

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="label">{label}</label>
        {hint && <span className="label text-faint">{hint}</span>}
      </div>
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
        <button
          type="button"
          className="flex flex-wrap items-center gap-1.5"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={`${label}: ${value.length ? value.map(cardLabel).join(', ') : 'empty'}. Open card picker`}
        >
          {slots.map((c, i) => (
            <PlayingCard
              key={`${i}-${c}`}
              card={c}
              size={size}
              mark={c !== null && marked?.includes(c)}
              className={c !== null ? 'deal' : undefined}
              style={{ '--i': 0 } as CSSProperties}
            />
          ))}
        </button>
        <div className="min-w-[7.5rem] flex-1">
          <input
            id={id}
            className="field"
            value={text}
            placeholder={placeholder ?? 'type cards, e.g. AsKd'}
            aria-invalid={bad}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            onChange={(e) => onText(e.target.value)}
          />
        </div>
        {value.length > 0 && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange([])}>
            Clear
          </button>
        )}
      </div>
      {open && (
        <div className="mt-3 border border-bone/15 bg-ink/60 p-2">
          <CardPicker selected={value} blocked={blocked} onToggle={toggle} />
        </div>
      )}
      <span className="sr-only" aria-live="polite">
        {value.map(cardToString).join(' ')}
      </span>
    </div>
  );
}
