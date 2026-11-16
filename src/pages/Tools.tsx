import { type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { TOOLS } from '../tools/registry';
import { PageHeader } from '../components/ui/primitives';

export default function Tools() {
  return (
    <div>
      <PageHeader
        serial="02"
        kicker="Instruments"
        title={<>Calculators <span className="italic text-madder">and solvers.</span></>}
        lede="Each instrument runs on the same tested engine as the lessons, in a background worker so the page never freezes. Results state their method, and anything sampled shows its seed so you can run it again and get the same answer."
      />
      <ol className="border-t border-bone/30">
        {TOOLS.map((t, i) => {
          const row = (
            <>
              <span className="label w-12 shrink-0 pt-2 text-madder">{t.serial}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline gap-3">
                  <span className="display text-[28px] transition-all group-hover:italic group-hover:text-madder sm:text-[38px]">{t.title}</span>
                  <span className="leader hidden sm:block" />
                  <span className="label hidden shrink-0 sm:block">{t.component ? t.track : 'In preparation'}</span>
                </span>
                <span className="mt-1 block max-w-[70ch] text-[14px] text-dim">{t.blurb}</span>
              </span>
            </>
          );
          return (
            <li key={t.id} className="rise border-b border-bone/15" style={{ '--i': i } as CSSProperties}>
              {t.component ? (
                <Link to={`/tools/${t.id}`} className="group flex gap-4 py-5">{row}</Link>
              ) : (
                <div className="flex gap-4 py-5 opacity-45">{row}</div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
