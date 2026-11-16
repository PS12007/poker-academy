import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useStore } from '../../store';
import { cx } from '../../lib/format';
import { Microtext } from '../ui/primitives';
import { Guilloche } from '../ui/Guilloche';
import { SuitGlyph } from '../cards/PlayingCard';

export const NAV = [
  { to: '/course', label: 'Course', note: 'Nine modules, rules to game theory' },
  { to: '/tools', label: 'Instruments', note: 'Calculators and solvers' },
  { to: '/drills', label: 'Drills', note: 'Timed, scored, endless' },
  { to: '/review', label: 'Review', note: 'Spaced repetition' },
  { to: '/reference', label: 'Reference', note: 'Glossary, sheets, formulas' },
];

function Wordmark() {
  return (
    <Link to="/" className="group flex items-baseline gap-2" aria-label="Poker Academy, home">
      <span className="display-i text-[27px] leading-none text-bone transition-colors group-hover:text-madder">Poker</span>
      <span className="translate-y-[-2px] text-madder">
        <SuitGlyph suit={3} size={9} />
      </span>
      <span className="font-mono text-[9.5px] uppercase tracking-[0.34em] text-dim">Academy</span>
    </Link>
  );
}

function Toggles({ className }: { className?: string }) {
  const settings = useStore((s) => s.settings);
  const set = useStore((s) => s.setSettings);
  return (
    <div className={cx('flex items-center gap-1', className)}>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={() => set({ fourColor: !settings.fourColor })}
        aria-pressed={settings.fourColor}
        title="Four-colour deck"
      >
        <span className="flex gap-[3px]" aria-hidden="true">
          {[3, 2, 1, 0].map((s) => (
            <SuitGlyph
              key={s}
              suit={s}
              size={8}
              color={
                s === 2 ? 'rgb(var(--madder))' : s === 3 ? 'rgb(var(--bone))'
                  : settings.fourColor ? (s === 1 ? 'rgb(var(--lapis))' : 'rgb(var(--verd))')
                  : s === 1 ? 'rgb(var(--madder))' : 'rgb(var(--bone))'
              }
            />
          ))}
        </span>
        <span className="sr-only">Four-colour deck</span>
      </button>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={() => set({ theme: settings.theme === 'dark' ? 'light' : 'dark' })}
        aria-label={`Switch to ${settings.theme === 'dark' ? 'light' : 'dark'} theme`}
      >
        {settings.theme === 'dark' ? 'Paper' : 'Ink'}
      </button>
    </div>
  );
}

function IndexOverlay({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', esc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', esc);
      document.body.style.overflow = '';
    };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-ink" role="dialog" aria-modal="true" aria-label="Site index">
      <Guilloche variant="ring" className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] text-bone" opacity={0.5} />
      <div className="relative flex items-center justify-between px-5 py-4">
        <Wordmark />
        <button type="button" className="btn btn-sm" onClick={onClose}>
          Close
        </button>
      </div>
      <nav className="relative flex-1 px-5 pb-8 pt-4" aria-label="Primary">
        {[{ to: '/', label: 'Home', note: 'Start here' }, ...NAV].map((n, i) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.to === '/'}
            onClick={onClose}
            className="rise group flex items-baseline gap-4 border-b border-bone/15 py-4"
            style={{ '--i': i } as CSSProperties}
          >
            {({ isActive }) => (
              <>
                <span className="num w-6 text-[10px] text-faint">{String(i).padStart(2, '0')}</span>
                <span className={cx('display text-[44px]', isActive ? 'italic text-madder' : 'text-bone')}>{n.label}</span>
                <span className="label ml-auto hidden text-right xs:block">{n.note}</span>
              </>
            )}
          </NavLink>
        ))}
        <div className="mt-8 flex items-center justify-between">
          <Link to="/settings" onClick={onClose} className="btn btn-sm">
            Settings and data
          </Link>
          <Toggles />
        </div>
      </nav>
    </div>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="btn btn-primary sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60]">
        Skip to content
      </a>
      <header className="no-print sticky top-0 z-30 bg-ink/90 backdrop-blur-[6px]">
        <Microtext text="Every number on this site is derived on screen or computed by the engine in your browser" className="border-b border-bone/10 py-[5px]" />
        <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-6 px-5 py-3 lg:px-10">
          <Wordmark />
          <nav className="hidden items-center gap-7 lg:flex" aria-label="Primary">
            {NAV.map((n, i) => (
              <NavLink key={n.to} to={n.to} className="group relative py-1">
                {({ isActive }) => (
                  <span className="flex items-baseline gap-2">
                    <span className={cx('num text-[9px]', isActive ? 'text-madder' : 'text-faint')}>{String(i + 1).padStart(2, '0')}</span>
                    <span
                      className={cx(
                        'font-mono text-[10.5px] uppercase tracking-[0.16em] transition-colors',
                        isActive ? 'text-bone' : 'text-dim group-hover:text-bone',
                      )}
                    >
                      {n.label}
                    </span>
                    <span
                      className={cx(
                        'absolute -bottom-[13px] left-0 h-[3px] bg-madder transition-all duration-300',
                        isActive ? 'w-full' : 'w-0 group-hover:w-full',
                      )}
                    />
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-1">
            <Toggles className="hidden sm:flex" />
            <Link to="/settings" className="btn btn-ghost btn-sm hidden lg:inline-flex">
              Data
            </Link>
            <button type="button" className="btn btn-sm lg:hidden" onClick={() => setOpen(true)} aria-haspopup="dialog">
              Index
            </button>
          </div>
        </div>
        <hr className="rule-double" />
      </header>

      {open && <IndexOverlay onClose={() => setOpen(false)} />}

      <main id="main" className="mx-auto w-full max-w-[1320px] flex-1 px-5 pb-24 pt-8 sm:pt-12 lg:px-10">
        {children}
      </main>

      <footer className="no-print mt-auto border-t border-bone/15">
        <div className="mx-auto grid max-w-[1320px] gap-8 px-5 py-10 sm:grid-cols-[1.4fr_1fr_1fr] lg:px-10">
          <div>
            <Wordmark />
            <p className="mt-4 max-w-[44ch] text-[13px] leading-relaxed text-dim">
              A course and a set of instruments. No account, no server. Your progress lives in this browser and can be
              exported from the settings page.
            </p>
          </div>
          <div>
            <div className="label mb-3">Sections</div>
            <ul className="space-y-1.5 text-[13px]">
              {NAV.map((n) => (
                <li key={n.to}>
                  <Link className="text-dim hover:text-bone" to={n.to}>{n.label}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="label mb-3">Engine</div>
            <ul className="num space-y-1.5 text-[11px] text-dim">
              <li>7,462 hand values</li>
              <li>133,784,560 seven-card hands verified</li>
              <li>seeded xoshiro128** sampling</li>
              <li>
                <Link className="link" to="/reference/engine">Engine notes</Link>
              </li>
            </ul>
          </div>
        </div>
        <Microtext text="Poker Academy · play within your means · the cards have no memory" className="border-t border-bone/10 py-[5px]" />
      </footer>
    </div>
  );
}
