import { Link } from 'react-router-dom';
import { Guilloche } from '../components/ui/Guilloche';

export default function NotFound() {
  return (
    <div className="relative flex min-h-[60vh] flex-col items-start justify-center overflow-hidden">
      <Guilloche variant="seal" spin className="pointer-events-none absolute -right-24 top-0 h-[420px] w-[420px]" opacity={0.6} />
      <div className="label text-madder">No such page</div>
      <h1 className="display mt-3 text-[64px] sm:text-[110px]">
        Mucked<span className="italic text-madder">.</span>
      </h1>
      <p className="mt-4 max-w-[46ch] text-dim">
        This page does not exist, or the section is still being written. The course index shows what is available.
      </p>
      <div className="mt-8 flex gap-3">
        <Link to="/" className="btn btn-primary">Home</Link>
        <Link to="/course" className="btn">Course index</Link>
      </div>
    </div>
  );
}
