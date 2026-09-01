import { useEffect, useMemo, useRef, useState } from 'react';

function pathMatches(path, highlights) {
  if (!highlights?.length) return false;
  return highlights.some((h) => path === h || path.startsWith(`${h}.`) || h.startsWith(`${path}.`) || h === path);
}

function isHighlighted(path, highlights) {
  if (!highlights?.length) return false;
  return highlights.some((h) => path === h || path.startsWith(`${h}.`) || h === path);
}

function preview(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return `Array(${value.length})`;
  if (typeof value === 'object') return `{ ${Object.keys(value).slice(0, 4).join(', ')}${Object.keys(value).length > 4 ? ', …' : ''} }`;
  if (typeof value === 'string') return value.length > 72 ? `${JSON.stringify(value.slice(0, 72))}…` : JSON.stringify(value);
  return String(value);
}

function Node({ name, value, path, highlights, depth }) {
  const isObject = value !== null && typeof value === 'object';
  const lit = isHighlighted(path, highlights);
  const childHit = isObject && pathMatches(path, highlights) && !lit;
  const [open, setOpen] = useState(depth < 1 || lit || childHit);
  const ref = useRef(null);

  useEffect(() => {
    if (lit || childHit) setOpen(true);
  }, [lit, childHit, highlights]);

  useEffect(() => {
    if (lit && ref.current) {
      ref.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [lit, path]);

  if (!isObject) {
    return (
      <div ref={ref} className={`j-row${lit ? ' is-hot' : ''}`} style={{ paddingLeft: depth * 14 }}>
        <span className="j-key">{name}</span>
        <span className="j-colon">:</span>
        <span className="j-val">{preview(value)}</span>
      </div>
    );
  }

  const entries = Array.isArray(value)
    ? value.map((item, i) => [String(i), item])
    : Object.entries(value);

  return (
    <div className={`j-block${lit ? ' is-hot' : ''}`}>
      <button
        ref={ref}
        type="button"
        className="j-toggle"
        style={{ paddingLeft: depth * 14 }}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="j-chevron" aria-hidden="true">{open ? '▾' : '▸'}</span>
        <span className="j-key">{name}</span>
        <span className="j-preview">{preview(value)}</span>
      </button>
      {open
        ? entries.map(([k, v]) => (
            <Node
              key={`${path}.${k}`}
              name={Array.isArray(value) ? `[${k}]` : k}
              value={v}
              path={Array.isArray(value) && typeof v === 'object' && v && v.name ? `${path}[name=${v.name}]` : `${path}.${k}`}
              highlights={highlights}
              depth={depth + 1}
            />
          ))
        : null}
    </div>
  );
}

export default function JsonPane({ data, highlights, paths }) {
  const label = useMemo(() => {
    if (!paths?.length) return 'Full report — nothing highlighted yet';
    return `Highlighting ${paths.join(', ')}`;
  }, [paths]);

  return (
    <aside className="json-pane" aria-label="sample_data.json studio">
      <header className="json-head">
        <p className="json-kicker">JSON studio</p>
        <h2>sample_data.json</h2>
        <p className="json-status">{label}</p>
      </header>
      <div className="json-tree">
        {Object.entries(data).map(([key, value]) => (
          <Node key={key} name={key} value={value} path={key} highlights={highlights} depth={0} />
        ))}
      </div>
    </aside>
  );
}
