import { MODULES, LESSONS } from '../data/curriculum.js';

export default function Sidebar({ currentId, completed, onSelect, open, onClose }) {
  return (
    <nav className={`sidebar${open ? ' is-open' : ''}`} aria-label="Course curriculum">
      <div className="sidebar-brand">
        <p className="eyebrow">Category intelligence</p>
        <p className="sidebar-title">Pipeline course</p>
      </div>
      <ol className="modules">
        {MODULES.map((mod, mi) => (
          <li key={mod.id} className="module">
            <p className="module-title">
              <span className="module-index">{String(mi + 1).padStart(2, '0')}</span>
              {mod.title}
            </p>
            <ol>
              {mod.lectures.map((id) => {
                const lesson = LESSONS[id];
                const active = id === currentId;
                const done = completed.has(id);
                return (
                  <li key={id}>
                    <button
                      type="button"
                      className={`lecture-btn${active ? ' is-active' : ''}${done ? ' is-done' : ''}`}
                      aria-current={active ? 'true' : undefined}
                      onClick={() => {
                        onSelect(id);
                        onClose?.();
                      }}
                    >
                      <span className="dot" aria-hidden="true" />
                      <span className="lecture-copy">
                        <span className="lecture-name">{lesson.title}</span>
                        <span className="lecture-time">{lesson.duration}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </li>
        ))}
      </ol>
    </nav>
  );
}
