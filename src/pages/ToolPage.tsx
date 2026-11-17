import { Suspense } from 'react';
import { Link, useParams } from 'react-router-dom';
import { findTool, TOOLS } from '../tools/registry';
import { PageHeader } from '../components/ui/primitives';
import { Loading } from '../App';
import NotFound from './NotFound';

export default function ToolPage() {
  const { toolId } = useParams();
  const tool = findTool(toolId ?? '');
  if (!tool?.component) return <NotFound />;
  const Tool = tool.component;
  const ready = TOOLS.filter((t) => t.component);
  const i = ready.indexOf(tool);
  return (
    <div>
      <PageHeader serial={tool.serial} kicker="Instrument" title={tool.title} lede={tool.blurb} />
      <Suspense fallback={<Loading />}>
        <Tool />
      </Suspense>
      <nav className="mt-16 flex items-center justify-between gap-3 border-t border-bone/20 pt-5" aria-label="Other instruments">
        {i > 0 ? <Link className="btn btn-sm min-w-0 max-w-[45%]" to={`/tools/${ready[i - 1].id}`}><span className="truncate">← {ready[i - 1].title}</span></Link> : <span />}
        <Link className="btn btn-ghost btn-sm hidden sm:inline-flex" to="/tools">All instruments</Link>
        {i < ready.length - 1 ? <Link className="btn btn-sm min-w-0 max-w-[45%]" to={`/tools/${ready[i + 1].id}`}><span className="truncate">{ready[i + 1].title} →</span></Link> : <span />}
      </nav>
    </div>
  );
}
