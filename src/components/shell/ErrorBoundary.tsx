import { Component, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { isChunkError } from '../../lib/lazy';

interface Props {
  children: ReactNode;
  /** Changing this value clears the error, e.g. the current path. */
  resetKey: string;
}
interface State {
  error: Error | null;
  key: string;
}

/** Catches render and loading errors so a failure shows a message instead of a blank page. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, key: this.props.resetKey };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    return props.resetKey !== state.key ? { error: null, key: props.resetKey } : null;
  }

  componentDidCatch(error: Error) {
    console.error(error);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const stale = isChunkError(error);
    return (
      <div className="flex min-h-[50vh] flex-col items-start justify-center" role="alert">
        <div className="label text-madder">{stale ? 'A newer version is available' : 'Something went wrong'}</div>
        <h1 className="display mt-3 text-[44px] sm:text-[64px]">{stale ? 'Reload to update.' : 'This page failed.'}</h1>
        <p className="mt-4 max-w-[52ch] text-dim">
          {stale
            ? 'The site was updated while this tab was open, so part of the page could not be fetched. Reloading loads the new version. Your progress is kept.'
            : 'An error stopped this page from rendering. Reloading usually fixes it. Your progress is kept.'}
        </p>
        <p className="num mt-3 max-w-[70ch] break-words text-[11px] text-faint">{error.message}</p>
        <div className="mt-7 flex gap-3">
          <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>Reload</button>
          <Link to="/" className="btn">Home</Link>
        </div>
      </div>
    );
  }
}
