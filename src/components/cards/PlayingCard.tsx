import { memo, type CSSProperties } from 'react';
import { RANK_CHARS, RANK_NAMES } from '../../engine/cards';
import { useStore } from '../../store';
import { cx } from '../../lib/format';

/** Suit glyphs drawn in a 10 x 10 box so they stay crisp at any size. */
export const SUIT_PATHS = [
  // club
  'M5 0.3a2.35 2.35 0 0 1 2.2 3.2a2.35 2.35 0 1 1-1.7 4.1c.1 1 .5 1.8 1.2 2.4H3.3c.7-.6 1.1-1.4 1.2-2.4a2.35 2.35 0 1 1-1.7-4.1A2.35 2.35 0 0 1 5 0.3Z',
  // diamond
  'M5 0L9.1 5L5 10L0.9 5Z',
  // heart
  'M5 9.6C1.2 6.6 0 4.6 0 2.9C0 1.3 1.2 0.2 2.7 0.2C3.7 0.2 4.6 0.8 5 1.7C5.4 0.8 6.3 0.2 7.3 0.2C8.8 0.2 10 1.3 10 2.9C10 4.6 8.8 6.6 5 9.6Z',
  // spade
  'M5 0C5 0 0 3.8 0 6.3C0 7.7 1.1 8.6 2.4 8.6C3.3 8.6 4.1 8.2 4.5 7.5C4.4 8.6 4 9.4 3.2 10H6.8C6 9.4 5.6 8.6 5.5 7.5C5.9 8.2 6.7 8.6 7.6 8.6C8.9 8.6 10 7.7 10 6.3C10 3.8 5 0 5 0Z',
] as const;

const SUIT_NAMES = ['clubs', 'diamonds', 'hearts', 'spades'];

/** Card-face ink colours. Fixed, because the card is a paper object in both themes. */
export function suitInk(suit: number, fourColor: boolean): string {
  if (suit === 2) return '#c0331d';
  if (suit === 3) return '#17150f';
  if (suit === 1) return fourColor ? '#1f57b0' : '#c0331d';
  return fourColor ? '#11705a' : '#17150f';
}

/** Suit colour for use on the page background (theme aware). */
export function suitTone(suit: number, fourColor: boolean): string {
  if (suit === 2) return 'rgb(var(--madder))';
  if (suit === 3) return 'rgb(var(--bone))';
  if (suit === 1) return fourColor ? 'rgb(var(--lapis))' : 'rgb(var(--madder))';
  return fourColor ? 'rgb(var(--verd))' : 'rgb(var(--bone))';
}

export function SuitGlyph({ suit, size = 10, color }: { suit: number; size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" aria-hidden="true" style={{ display: 'inline-block', flex: 'none' }}>
      <path d={SUIT_PATHS[suit]} fill={color ?? 'currentColor'} />
    </svg>
  );
}

export function cardLabel(card: number): string {
  return `${RANK_NAMES[card >> 2]} of ${SUIT_NAMES[card & 3]}`;
}

const SIZES = { xs: 26, sm: 34, md: 46, lg: 64, xl: 92 } as const;
export type CardSize = keyof typeof SIZES;

interface Props {
  card?: number | null;
  size?: CardSize;
  /** Face-down. */
  back?: boolean;
  dim?: boolean;
  /** Draws an accent frame, e.g. for cards that play. */
  mark?: boolean;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
  label?: string;
}

/** An SVG playing card with an engraved index. Empty when card is null. */
export const PlayingCard = memo(function PlayingCard({
  card, size = 'md', back, dim, mark, className, style, onClick, label,
}: Props) {
  const fourColor = useStore((s) => s.settings.fourColor);
  const w = SIZES[size];
  const common = {
    width: w,
    height: w * 1.4,
    viewBox: '0 0 50 70',
    className: cx('block flex-none select-none', onClick && 'cursor-pointer', dim && 'opacity-30', className),
    style,
    onClick,
  };

  if (card === null || card === undefined) {
    return (
      <svg {...common} role="img" aria-label={label ?? 'Empty card slot'}>
        <rect x="1" y="1" width="48" height="68" rx="3.5" fill="none" stroke="rgb(var(--bone) / 0.35)" strokeDasharray="2.5 2.5" />
        {back ? null : <path d="M25 29v12M19 35h12" stroke="rgb(var(--bone) / 0.4)" strokeWidth="1" />}
      </svg>
    );
  }
  if (back) {
    return (
      <svg {...common} role="img" aria-label="Face-down card">
        <rect x="0.5" y="0.5" width="49" height="69" rx="3.5" fill="#1a1712" stroke="var(--card-edge)" />
        <rect x="4" y="4" width="42" height="62" rx="1.5" fill="none" stroke="#c0331d" strokeWidth="0.6" />
        <g stroke="#c0331d" strokeWidth="0.35" fill="none" opacity="0.9">
          {Array.from({ length: 9 }, (_, i) => (
            <ellipse key={i} cx="25" cy="35" rx={3 + i * 2} ry={27 - i * 2.6} />
          ))}
          {Array.from({ length: 9 }, (_, i) => (
            <ellipse key={`b${i}`} cx="25" cy="35" rx={19 - i * 2} ry={4 + i * 2.6} />
          ))}
        </g>
      </svg>
    );
  }
  const rank = card >> 2;
  const suit = card & 3;
  const ink = suitInk(suit, fourColor);
  const ch = RANK_CHARS[rank] === 'T' ? '10' : RANK_CHARS[rank];
  return (
    <svg {...common} role="img" aria-label={label ?? cardLabel(card)}>
      <rect x="0.5" y="0.5" width="49" height="69" rx="3.5" fill="var(--card-face)" stroke="var(--card-edge)" />
      {mark && <rect x="2.5" y="2.5" width="45" height="65" rx="2" fill="none" stroke="#c0331d" strokeWidth="1.2" />}
      <text
        x={ch === '10' ? 5 : 6.5}
        y="26"
        fill={ink}
        fontFamily='"Bodoni Moda Variable", Didot, Georgia, serif'
        fontSize="25"
        fontWeight="600"
        letterSpacing={ch === '10' ? '-2.6' : '0'}
      >
        {ch}
      </text>
      <g transform="translate(7.5 31) scale(0.95)">
        <path d={SUIT_PATHS[suit]} fill={ink} />
      </g>
      <g transform="translate(21.5 39) scale(2.35)">
        <path d={SUIT_PATHS[suit]} fill={ink} />
      </g>
    </svg>
  );
});

/** A row of cards with a little overlap-free spacing and a dealt-in animation. */
export function Hand({
  cards, size = 'md', marked, dimmed, className, slots,
}: {
  cards: readonly (number | null)[];
  size?: CardSize;
  marked?: readonly number[];
  dimmed?: readonly number[];
  className?: string;
  /** Pad with empty slots up to this many cards. */
  slots?: number;
}) {
  const all: (number | null)[] = [...cards];
  while (slots && all.length < slots) all.push(null);
  return (
    <div className={cx('flex items-center', size === 'xs' ? 'gap-[3px]' : 'gap-1.5', className)}>
      {all.map((c, i) => (
        <PlayingCard
          key={`${i}-${c}`}
          card={c}
          size={size}
          mark={c !== null && marked?.includes(c)}
          dim={c !== null && dimmed?.includes(c)}
          className="deal"
          style={{ '--i': i } as CSSProperties}
        />
      ))}
    </div>
  );
}

/** Inline card in running text: rank plus suit glyph, e.g. A♠. */
export function C({ c }: { c: string }) {
  const fourColor = useStore((s) => s.settings.fourColor);
  const parts = c.match(/[2-9TJQKA][cdhs]/gi) ?? [];
  return (
    <span className="whitespace-nowrap font-mono text-[0.92em] font-medium">
      {parts.map((p, i) => {
        const suit = 'cdhs'.indexOf(p[1].toLowerCase());
        return (
          <span key={i} style={{ color: suitTone(suit, fourColor) }} className="mr-[0.12em] inline-flex items-baseline">
            {p[0].toUpperCase()}
            <SuitGlyph suit={suit} size={9} />
          </span>
        );
      })}
    </span>
  );
}
