import { lazyRetry } from './lib/lazy';
import { Suspense, useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { Layout } from './components/shell/Layout';
import { ErrorBoundary } from './components/shell/ErrorBoundary';
import { useStore } from './store';
import Home from './pages/Home';

const Course = lazyRetry(() => import('./pages/Course'));
const Lesson = lazyRetry(() => import('./pages/Lesson'));
const Tools = lazyRetry(() => import('./pages/Tools'));
const ToolPage = lazyRetry(() => import('./pages/ToolPage'));
const Drills = lazyRetry(() => import('./pages/Drills'));
const DrillPage = lazyRetry(() => import('./pages/Drills').then((m) => ({ default: m.DrillPage })));
const Reference = lazyRetry(() => import('./pages/Reference'));
const Review = lazyRetry(() => import('./pages/Review'));
const Placement = lazyRetry(() => import('./pages/Placement'));
const Settings = lazyRetry(() => import('./pages/Settings'));
const NotFound = lazyRetry(() => import('./pages/NotFound'));

function ScrollReset() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export function Loading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center" role="status">
      <span className="label pending">Loading</span>
    </div>
  );
}

export function App() {
  const { pathname } = useLocation();
  const theme = useStore((s) => s.settings.theme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0d0c0a' : '#eee8d8');
  }, [theme]);

  return (
    <Layout>
      <ScrollReset />
      <ErrorBoundary resetKey={pathname}>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/course" element={<Course />} />
          <Route path="/learn/:moduleId/:lessonId" element={<Lesson />} />
          <Route path="/tools" element={<Tools />} />
          <Route path="/tools/:toolId" element={<ToolPage />} />
          <Route path="/drills" element={<Drills />} />
          <Route path="/drills/:drillId" element={<DrillPage />} />
          <Route path="/reference" element={<Reference />} />
          <Route path="/reference/:section" element={<Reference />} />
          <Route path="/review" element={<Review />} />
          <Route path="/placement" element={<Placement />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      </ErrorBoundary>
    </Layout>
  );
}
