import { lazy, Suspense, type ComponentProps, type ComponentType, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { C } from '../cards/PlayingCard';
import { Figure, Working } from '../ui/primitives';
import { Cards, DataTable, Eq, Example, Formula, LessonLink, Live, Mistakes, Objectives, Remember, Scene, Term } from './blocks';

import { BluffEV, BoardReader, ComboCounter, DealDemo, HandNamer, MinRaiseCalc, Num, OutsTable, PotOddsStrip, RankingTable, StartingChart, TableDiagram } from './widgets';
import { BetSizeTheory, GeometricSizing, VsOpenChart } from './widgets2';

/** Full tools embedded in lessons load on demand so the lesson shell stays small. */
function embed<P extends { embedded?: boolean }>(load: () => Promise<{ default: ComponentType<P> }>) {
  const Inner = lazy(load) as unknown as ComponentType<P>;
  return function Embedded(props: Omit<P, 'embedded'>) {
    return (
      <Suspense fallback={<div className="label pending py-10">Loading instrument</div>}>
        <Inner {...({ ...props, embedded: true } as P)} />
      </Suspense>
    );
  };
}
const OutsTool = embed(() => import('../../tools/OutsCalculator'));
const PotOddsTool = embed(() => import('../../tools/PotOddsCalculator'));
const EquityTool = embed(() => import('../../tools/EquityCalculator'));
const SidePotTool = embed(() => import('../../tools/SidePotCalculator'));
const VarianceTool = embed(() => import('../../tools/VarianceSimulator'));
const HeatmapTool = embed(() => import('../../tools/RangeHeatmap'));
const RangeTool = embed<{ embedded?: boolean }>(() => import('../../tools/RangeBuilder'));

const slug = (children: ReactNode) =>
  String(Array.isArray(children) ? children.join('') : children)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export function Li(props: ComponentProps<'li'>) {
  return <li className="relative pl-5 before:absolute before:left-0 before:top-[0.72em] before:h-[4px] before:w-[4px] before:rotate-45 before:bg-madder" {...props} />;
}
Li.isLi = true;

/** Element styling for lesson prose plus the blocks every lesson can use without importing. */
export const MDX_COMPONENTS = {
  h2: ({ children }: { children?: ReactNode }) => (
    <h2 id={slug(children)} className="lesson-h2 display mb-4 mt-14 scroll-mt-28 text-[30px] leading-[1.02] sm:text-[38px]">
      {children}
    </h2>
  ),
  h3: ({ children }: { children?: ReactNode }) => <h3 className="mb-2 mt-9 font-sans text-[18px] font-semibold tracking-tight">{children}</h3>,
  p: (props: ComponentProps<'p'>) => <p className="my-4 text-[16.5px] leading-[1.72] text-bone/90" {...props} />,
  ul: (props: ComponentProps<'ul'>) => <ul className="my-4 space-y-2 text-[16.5px] leading-[1.6] text-bone/90" {...props} />,
  ol: (props: ComponentProps<'ol'>) => <ol className="my-4 list-decimal space-y-2 pl-5 text-[16.5px] leading-[1.6] text-bone/90 marker:font-mono marker:text-[12px] marker:text-madder" {...props} />,
  li: Li,
  strong: (props: ComponentProps<'strong'>) => <strong className="font-semibold text-bone" {...props} />,
  em: (props: ComponentProps<'em'>) => <em className="font-display text-[1.08em] italic" {...props} />,
  a: ({ href = '', children }: { href?: string; children?: ReactNode }) =>
    href.startsWith('/') ? <Link className="link" to={href}>{children}</Link> : <a className="link" href={href} target="_blank" rel="noreferrer">{children}</a>,
  code: (props: ComponentProps<'code'>) => <code className="num bg-bone/[0.08] px-1.5 py-0.5 text-[0.86em]" {...props} />,
  hr: () => <hr className="rule-double my-10" />,
  blockquote: (props: ComponentProps<'blockquote'>) => <blockquote className="my-6 border-l-2 border-madder pl-5 font-display text-[21px] italic leading-snug" {...props} />,
  table: (props: ComponentProps<'table'>) => (
    <div className="my-7 overflow-x-auto">
      <table className="w-full border-collapse text-left text-[14px]" {...props} />
    </div>
  ),
  th: (props: ComponentProps<'th'>) => <th className="label border-b border-bone/40 py-2 pr-4 font-normal" {...props} />,
  td: (props: ComponentProps<'td'>) => <td className="border-b border-bone/10 py-2 pr-4 align-top" {...props} />,
  Objectives, Remember, Example, Mistakes, Formula, Live, Cards, Scene, Eq, Term, LessonLink, DataTable, Figure, Working, C,
  BluffEV, BoardReader, ComboCounter, DealDemo, HandNamer, MinRaiseCalc, Num, OutsTable, PotOddsStrip, RankingTable, StartingChart, TableDiagram,
  OutsTool, PotOddsTool, EquityTool, SidePotTool, VarianceTool, HeatmapTool, RangeTool,
  BetSizeTheory, GeometricSizing, VsOpenChart,
};
