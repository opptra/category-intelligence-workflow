import { useCallback, useEffect, useMemo, useState } from 'react';
import sample from '@sample';
import { COURSE, LECTURE_ORDER, LESSONS } from './data/curriculum.js';
import Sidebar from './components/Sidebar.jsx';
import Lesson from './components/Lesson.jsx';
import JsonPane from './components/JsonPane.jsx';

const STORAGE_KEY = 'pipeline-course-progress';

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { current: LECTURE_ORDER[0], completed: [] };
    const parsed = JSON.parse(raw);
    return {
      current: LECTURE_ORDER.includes(parsed.current) ? parsed.current : LECTURE_ORDER[0],
      completed: Array.isArray(parsed.completed) ? parsed.completed.filter((id) => LECTURE_ORDER.includes(id)) : []
    };
  } catch {
    return { current: LECTURE_ORDER[0], completed: [] };
  }
}

export default function App() {
  const initial = useMemo(loadProgress, []);
  const [currentId, setCurrentId] = useState(initial.current);
  const [completed, setCompleted] = useState(() => new Set(initial.completed));
  const [menuOpen, setMenuOpen] = useState(false);
  const [jsonOpen, setJsonOpen] = useState(true);

  const index = LECTURE_ORDER.indexOf(currentId);
  const lesson = LESSONS[currentId];
  const total = LECTURE_ORDER.length;
  const pct = Math.round((completed.size / total) * 100);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ current: currentId, completed: [...completed] })
    );
  }, [currentId, completed]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentId]);

  const go = useCallback((id) => {
    setCurrentId(id);
  }, []);

  const goOffset = useCallback((delta) => {
    const next = LECTURE_ORDER[index + delta];
    if (next) setCurrentId(next);
  }, [index]);

  const markComplete = useCallback(() => {
    setCompleted((prev) => {
      const next = new Set(prev);
      next.add(currentId);
      return next;
    });
    const nxt = LECTURE_ORDER[index + 1];
    if (nxt) setCurrentId(nxt);
  }, [currentId, index]);

  useEffect(() => {
    function onKey(e) {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
      if (e.key === 'ArrowRight' || e.key === 'j') {
        e.preventDefault();
        goOffset(1);
      } else if (e.key === 'ArrowLeft' || e.key === 'k') {
        e.preventDefault();
        goOffset(-1);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goOffset]);

  return (
    <div className={`app${jsonOpen ? '' : ' json-collapsed'}`}>
      <a className="skip" href="#lesson-title">Skip to lecture</a>

      <header className="topbar">
        <button
          type="button"
          className="icon-btn menu-btn"
          aria-expanded={menuOpen}
          aria-controls="curriculum"
          onClick={() => setMenuOpen((v) => !v)}
        >
          Curriculum
        </button>
        <div className="topbar-copy">
          <p className="topbar-kicker">{COURSE.title}</p>
          <p className="topbar-sub">{COURSE.subtitle}</p>
        </div>
        <div className="progress-wrap">
          <p className="progress-label">
            <span>{completed.size}/{total} complete</span>
            <span className="tabular">{pct}%</span>
          </p>
          <div
            className="progress"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
            aria-label="Course progress"
          >
            <span style={{ width: `${pct}%` }} />
          </div>
        </div>
        <button
          type="button"
          className="icon-btn"
          aria-pressed={jsonOpen}
          onClick={() => setJsonOpen((v) => !v)}
        >
          {jsonOpen ? 'Hide JSON' : 'Show JSON'}
        </button>
      </header>

      <div className="shell">
        <div id="curriculum">
          <Sidebar
            currentId={currentId}
            completed={completed}
            onSelect={go}
            open={menuOpen}
            onClose={() => setMenuOpen(false)}
          />
        </div>

        <main className="stage">
          <p className="course-note">{COURSE.sampleNote}</p>
          <Lesson lesson={lesson} index={index} total={total} />
          <nav className="pager" aria-label="Lecture pagination">
            <button type="button" className="pager-btn" disabled={index === 0} onClick={() => goOffset(-1)}>
              Previous
            </button>
            <button type="button" className="pager-btn primary" onClick={markComplete}>
              {index === total - 1 ? 'Mark complete' : 'Complete & continue'}
            </button>
            <button type="button" className="pager-btn" disabled={index === total - 1} onClick={() => goOffset(1)}>
              Next
            </button>
          </nav>
        </main>

        {jsonOpen ? (
          <JsonPane data={sample} highlights={lesson.jsonPaths} paths={lesson.jsonPaths} />
        ) : null}
      </div>
    </div>
  );
}
