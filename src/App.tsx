import { lazy, Suspense, useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { Layout } from './components/shell/Layout';
import { useStore } from './store';
import Home from './pages/Home';

const Course = lazy(() => import('./pages/Course'));
const Lesson = lazy(() => import('./pages/Lesson'));
const Tools = lazy(() => import('./pages/Tools'));
const ToolPage = lazy(() => import('./pages/ToolPage'));
const Settings = lazy(() => import('./pages/Settings'));
const NotFound = lazy(() => import('./pages/NotFound'));

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
  const theme = useStore((s) => s.settings.theme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0d0c0a' : '#eee8d8');
  }, [theme]);

  return (
    <Layout>
      <ScrollReset />
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/course" element={<Course />} />
          <Route path="/learn/:moduleId/:lessonId" element={<Lesson />} />
          <Route path="/tools" element={<Tools />} />
          <Route path="/tools/:toolId" element={<ToolPage />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}
