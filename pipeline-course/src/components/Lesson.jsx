import { FlowDiagram } from '../data/Diagrams.jsx';

export default function Lesson({ lesson, index, total }) {
  return (
    <article className="lesson" aria-labelledby="lesson-title">
      <header className="lesson-head">
        <p className="lesson-kicker">Lecture {index + 1} of {total}</p>
        <h1 id="lesson-title">{lesson.title}</h1>
        <p className="lesson-meta">
          <span>{lesson.duration}</span>
          <span aria-hidden="true">·</span>
          <span>{lesson.packages.join(' + ')}</span>
        </p>
      </header>

      <FlowDiagram id={lesson.figure} />

      <p className="lede">{lesson.intro}</p>

      <section className="strip" aria-label="How this step runs">
        <div>
          <h2>Packages</h2>
          <ul className="pill-list">
            {lesson.packages.map((pkg) => (
              <li key={pkg}><code>{pkg}</code></li>
            ))}
          </ul>
        </div>
        <div>
          <h2>LLM</h2>
          {lesson.llm?.used ? (
            <p>
              <strong>Yes.</strong> {lesson.llm.method ? `${lesson.llm.method}` : 'Claude'}
              {lesson.llm.tool ? <> via tool <code>{lesson.llm.tool}</code></> : null}
              {lesson.llm.count ? <> — {lesson.llm.count}</> : null}
              {lesson.llm.note ? <span className="muted"> {lesson.llm.note}</span> : null}
            </p>
          ) : (
            <p><strong>No.</strong> {lesson.llm?.note}</p>
          )}
        </div>
      </section>

      {lesson.command ? (
        <section>
          <h2>Command</h2>
          <pre className="prompt"><code>{lesson.command}</code></pre>
        </section>
      ) : null}

      {lesson.points?.length ? (
        <section>
          <h2>What actually happens</h2>
          <ol className="steps">
            {lesson.points.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ol>
        </section>
      ) : null}

      {lesson.fieldRows?.length ? (
        <section>
          <h2>Field → source</h2>
          <table className="field-table">
            <thead>
              <tr>
                <th scope="col">JSON path</th>
                <th scope="col">What creates it</th>
                <th scope="col">LLM?</th>
              </tr>
            </thead>
            <tbody>
              {lesson.fieldRows.map((row) => (
                <tr key={row.path}>
                  <td><code>{row.path}</code></td>
                  <td>{row.source}</td>
                  <td>{row.llm ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {lesson.prompt ? (
        <section>
          <h2>Exact prompt</h2>
          <p className="muted">Copied from {lesson.files?.[0]}. Placeholders like <code>${'{category}'}</code> are filled at runtime.</p>
          <p className="prompt-label">System</p>
          <pre className="prompt"><code>{lesson.prompt.system}</code></pre>
          <p className="prompt-label">User</p>
          <pre className="prompt"><code>{lesson.prompt.user}</code></pre>
          {lesson.prompt.aplusSystem ? (
            <>
              <p className="prompt-label">A+ system (second vision prompt)</p>
              <pre className="prompt"><code>{lesson.prompt.aplusSystem}</code></pre>
              <p className="prompt-label">A+ user</p>
              <pre className="prompt"><code>{lesson.prompt.aplusUser}</code></pre>
            </>
          ) : null}
          {lesson.prompt.toolShape ? (
            <>
              <p className="prompt-label">Forced tool JSON shape</p>
              <pre className="prompt"><code>{JSON.stringify(lesson.prompt.toolShape, null, 2)}</code></pre>
            </>
          ) : null}
          {lesson.llm?.schema ? (
            <p className="muted">Schema file: <code>{lesson.llm.schema}</code></p>
          ) : null}
        </section>
      ) : null}

      {lesson.proof ? (
        <section>
          <h2>Proof in the repo</h2>
          <pre className="prompt proof"><code>{lesson.proof}</code></pre>
        </section>
      ) : null}

      {lesson.files?.length ? (
        <section>
          <h2>Source files</h2>
          <ul className="file-list">
            {lesson.files.map((f) => (
              <li key={f}><code>{f}</code></li>
            ))}
          </ul>
        </section>
      ) : null}

      {lesson.sample ? (
        <section>
          <h2>What it looks like in this sample</h2>
          <p className="muted"><code>{lesson.sample.path}</code></p>
          <pre className="prompt"><code>{JSON.stringify(lesson.sample.value, null, 2)}</code></pre>
        </section>
      ) : null}

      <p className="takeaway">
        <strong>Takeaway.</strong> {lesson.takeaway}
      </p>
    </article>
  );
}
