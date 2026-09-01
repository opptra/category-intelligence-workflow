export function FlowDiagram({ id }) {
  if (id === 'overview') return <Overview />;
  if (id === 'packages') return <Packages />;
  if (id === 'json-map') return <JsonMap />;
  if (id === 'orchestrator') return <Orchestrator />;
  if (id === 'scrape-list') return <ScrapeList />;
  if (id === 'scrape-pdp') return <ScrapePdp />;
  if (id === 's0s1') return <S0S1 />;
  if (id === 's2') return <S2 />;
  if (id === 's3') return <S3 />;
  if (id === 's4') return <S4 />;
  if (id === 's4b') return <S4b />;
  if (id === 's5-core') return <S5Core />;
  if (id === 's5-topics') return <S5Topics />;
  if (id === 'assemble') return <Assemble />;
  if (id === 'fields') return <Fields />;
  if (id === 'topics-copy') return <TopicsCopy />;
  if (id === 'topics-visual') return <TopicsVisual />;
  if (id === 'extras') return <Extras />;
  return null;
}

function Frame({ title, children }) {
  return (
    <figure className="diagram">
      <figcaption>{title}</figcaption>
      {children}
    </figure>
  );
}

function Box({ x, y, w, h, label, sub, tone = 'ink' }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} className={`d-box d-${tone}`} rx="6" />
      <text x={x + w / 2} y={y + (sub ? h / 2 - 4 : h / 2 + 4)} className="d-label">
        {label}
      </text>
      {sub ? (
        <text x={x + w / 2} y={y + h / 2 + 12} className="d-sub">
          {sub}
        </text>
      ) : null}
    </g>
  );
}

function Arrow({ x1, y1, x2, y2 }) {
  return <line x1={x1} y1={y1} x2={x2} y2={y2} className="d-arrow" />;
}

function Overview() {
  return (
    <Frame title="Figure 1 — Two acts, one JSON file">
      <svg viewBox="0 0 760 220" role="img" aria-label="Scrape then analyze then JSON">
        <Box x={20} y={70} w={150} h={70} label="Bestsellers URL" sub="+ our product URLs" />
        <Arrow x1={170} y1={105} x2={210} y2={105} />
        <Box x={210} y={40} w={160} h={130} label="amazon-scrapper" sub="Puppeteer · no LLM" tone="collect" />
        <Arrow x1={370} y1={105} x2={410} y2={105} />
        <Box x={410} y={40} w={160} h={130} label="catalog-analysis" sub="Node + Claude + Sharp" tone="think" />
        <Arrow x1={570} y1={105} x2={610} y2={105} />
        <Box x={610} y={70} w={130} h={70} label="sample_data.json" sub="the report" tone="write" />
      </svg>
    </Frame>
  );
}

function Packages() {
  return (
    <Frame title="Figure 2 — Who owns which work">
      <svg viewBox="0 0 760 240" role="img" aria-label="Three packages">
        <Box x={20} y={30} w={220} h={180} label="amazon-scrapper" sub="puppeteer" tone="collect" />
        <Box x={270} y={30} w={220} h={180} label="catalog-analysis" sub="@anthropic-ai/sdk + sharp" tone="think" />
        <Box x={520} y={30} w={220} h={180} label="orchestrator" sub="calls both, writes disk" tone="write" />
        <text x={130} y={140} className="d-note">list · PDP · reviews</text>
        <text x={380} y={140} className="d-note">S0–S6 · all prompts</text>
        <text x={630} y={140} className="d-note">CLI · output/*.json</text>
      </svg>
    </Frame>
  );
}

function JsonMap() {
  const keys = [
    ['meta', 'code'],
    ['summary', 'LLM'],
    ['category_lexicon', 'LLM'],
    ['voice_of_customer', 'LLM'],
    ['catalog_gaps', 'code'],
    ['topics', 'LLM'],
    ['image_plan', 'extra'],
    ['backend_keywords', 'extra']
  ];
  return (
    <Frame title="Figure 3 — Eight top-level keys">
      <div className="key-grid">
        {keys.map(([key, kind]) => (
          <div key={key} className={`key-chip kind-${kind}`}>
            <code>{key}</code>
            <span>{kind === 'extra' ? 'not in current S6' : kind === 'LLM' ? 'Claude writes' : 'Node writes'}</span>
          </div>
        ))}
      </div>
    </Frame>
  );
}

function Orchestrator() {
  return (
    <Frame title="Figure 4 — orchestrator/src/run.js">
      <svg viewBox="0 0 760 160" role="img" aria-label="Orchestrator sequence">
        <Box x={20} y={45} w={130} h={70} label="CLI flags" />
        <Arrow x1={150} y1={80} x2={190} y2={80} />
        <Box x={190} y={45} w={160} h={70} label="fetchCatalogData" sub="scrapper" tone="collect" />
        <Arrow x1={350} y1={80} x2={390} y2={80} />
        <Box x={390} y={45} w={150} h={70} label="runAnalysis" sub="analysis" tone="think" />
        <Arrow x1={540} y1={80} x2={580} y2={80} />
        <Box x={580} y={45} w={160} h={70} label="write two files" sub="analysis + scrape" tone="write" />
      </svg>
    </Frame>
  );
}

function ScrapeList() {
  return (
    <Frame title="Figure 5 — Best sellers page → teacher set">
      <svg viewBox="0 0 760 150" role="img" aria-label="Bestsellers scrape">
        <Box x={20} y={40} w={180} h={70} label="Category URL" sub="zgbs page" />
        <Arrow x1={200} y1={75} x2={240} y2={75} />
        <Box x={240} y={40} w={220} h={70} label="BestSellersScraper" sub="H1 → category name" tone="collect" />
        <Arrow x1={460} y1={75} x2={500} y2={75} />
        <Box x={500} y={40} w={240} h={70} label="Top 10 ASINs" sub="competitor_count = 10" tone="write" />
      </svg>
    </Frame>
  );
}

function ScrapePdp() {
  return (
    <Frame title="Figure 6 — Same scraper, two piles, in parallel">
      <svg viewBox="0 0 760 200" role="img" aria-label="PDP and reviews scrape">
        <Box x={270} y={10} w={220} h={50} label="ProductDetailsScraper" tone="collect" />
        <Arrow x1={380} y1={60} x2={160} y2={100} />
        <Arrow x1={380} y1={60} x2={600} y2={100} />
        <Box x={20} y={105} w={280} h={70} label="10 leader PDPs + reviews" sub="source: best-sellers" />
        <Box x={460} y={105} w={280} h={70} label="2 of our PDPs + reviews" sub="source: our-products" />
      </svg>
    </Frame>
  );
}

function S0S1() {
  return (
    <Frame title="Figure 7 — Load & count (no Claude)">
      <svg viewBox="0 0 760 150" role="img" aria-label="S0 and S1">
        <Box x={20} y={40} w={200} h={70} label="S0 load.js" sub="normalize every SKU" />
        <Arrow x1={220} y1={75} x2={270} y2={75} />
        <Box x={270} y={40} w={220} h={70} label="S1 metrics.js" sub="lengths, prices, ratings" tone="think" />
        <Arrow x1={490} y1={75} x2={540} y2={75} />
        <Box x={540} y={40} w={200} h={70} label="feeds S2 / S4b / S5" sub="meta counts kept" tone="write" />
      </svg>
    </Frame>
  );
}

function S2() {
  return (
    <Frame title="Figure 8 — S2 splits math from judgment">
      <svg viewBox="0 0 760 200" role="img" aria-label="S2 standards">
        <Box x={20} y={60} w={160} h={80} label="Leader listings" />
        <Arrow x1={180} y1={80} x2={230} y2={50} />
        <Arrow x1={180} y1={120} x2={230} y2={150} />
        <Box x={230} y={20} w={220} h={70} label="Code" sub="spec union, price band" />
        <Box x={230} y={115} w={220} h={70} label="Claude standards_llm" sub="title template, keywords" tone="think" />
        <Arrow x1={450} y1={55} x2={510} y2={90} />
        <Arrow x1={450} y1={150} x2={510} y2={110} />
        <Box x={510} y={60} w={230} h={80} label="categoryStandard" sub="internal — not a JSON key" tone="write" />
      </svg>
    </Frame>
  );
}

function S3() {
  return (
    <Frame title="Figure 9 — Two review mines, merged later">
      <svg viewBox="0 0 760 180" role="img" aria-label="S3 voice mining">
        <Box x={20} y={20} w={200} h={60} label="Leader reviews" />
        <Box x={20} y={100} w={200} h={60} label="Our reviews" />
        <Arrow x1={220} y1={50} x2={280} y2={50} />
        <Arrow x1={220} y1={130} x2={280} y2={130} />
        <Box x={280} y={20} w={220} h={60} label="voice_of_customer_mine" sub="call 1" tone="think" />
        <Box x={280} y={100} w={220} h={60} label="voice_of_customer_mine" sub="call 2" tone="think" />
        <Arrow x1={500} y1={50} x2={560} y2={85} />
        <Arrow x1={500} y1={130} x2={560} y2={95} />
        <Box x={560} y={55} w={180} h={70} label="Internal mines" sub="S5 merges them" tone="write" />
      </svg>
    </Frame>
  );
}

function S4() {
  return (
    <Frame title="Figure 10 — Many photos → one numbered montage → one vision call">
      <svg viewBox="0 0 760 170" role="img" aria-label="Vision montage">
        <Box x={16} y={50} w={70} h={50} label="1" />
        <Box x={96} y={50} w={70} h={50} label="2" />
        <Box x={176} y={50} w={70} h={50} label="3" />
        <text x={160} y={130} className="d-sub">product_images[]</text>
        <Arrow x1={256} y1={75} x2={310} y2={75} />
        <Box x={310} y={35} w={180} h={80} label="Sharp montage" sub="cells numbered" tone="collect" />
        <Arrow x1={490} y1={75} x2={540} y2={75} />
        <Box x={540} y={35} w={200} h={80} label="vision_gallery" sub="completeVisionTool" tone="think" />
      </svg>
    </Frame>
  );
}

function S4b() {
  return (
    <Frame title="Figure 11 — Gaps are subtraction, not generation">
      <svg viewBox="0 0 760 160" role="img" aria-label="Catalog gaps">
        <Box x={20} y={45} w={160} h={70} label="Leader norms" />
        <text x={210} y={85} className="d-label">minus</text>
        <Box x={250} y={45} w={160} h={70} label="Our norms" />
        <Arrow x1={410} y1={80} x2={460} y2={80} />
        <Box x={460} y={35} w={280} h={90} label="catalog_gaps" sub="the first finished JSON key" tone="write" />
      </svg>
    </Frame>
  );
}

function S5Core() {
  return (
    <Frame title="Figure 12 — One research blob → three prose keys">
      <svg viewBox="0 0 760 200" role="img" aria-label="Synthesize core">
        <Box x={20} y={20} w={240} h={160} label="research JSON" sub="S2+S3+S4+S4b packed" />
        <Arrow x1={260} y1={100} x2={320} y2={100} />
        <Box x={320} y={55} w={180} h={90} label="synthesize_core" tone="think" />
        <Arrow x1={500} y1={70} x2={550} y2={40} />
        <Arrow x1={500} y1={100} x2={550} y2={100} />
        <Arrow x1={500} y1={130} x2={550} y2={160} />
        <Box x={550} y={15} w={190} h={50} label="summary" tone="write" />
        <Box x={550} y={75} w={190} h={50} label="category_lexicon" tone="write" />
        <Box x={550} y={135} w={190} h={50} label="voice_of_customer" tone="write" />
      </svg>
    </Frame>
  );
}

function S5Topics() {
  return (
    <Frame title="Figure 13 — Three topic prompts in parallel">
      <svg viewBox="0 0 760 200" role="img" aria-label="Topic batches">
        <Box x={20} y={70} w={160} h={60} label="research + core" />
        <Arrow x1={180} y1={80} x2={230} y2={40} />
        <Arrow x1={180} y1={100} x2={230} y2={100} />
        <Arrow x1={180} y1={120} x2={230} y2={160} />
        <Box x={230} y={10} w={250} h={50} label="Batch A — copy / specs / price" tone="think" />
        <Box x={230} y={75} w={250} h={50} label="Batch B — gallery_images only" tone="think" />
        <Box x={230} y={140} w={250} h={50} label="Batch C — aplus only" tone="think" />
        <Arrow x1={480} y1={100} x2={540} y2={100} />
        <Box x={540} y={70} w={200} h={60} label="topics[]" tone="write" />
      </svg>
    </Frame>
  );
}

function Assemble() {
  return (
    <Frame title="Figure 14 — Filter, stamp, refuse bad reports">
      <svg viewBox="0 0 760 150" role="img" aria-label="Assemble">
        <Box x={20} y={40} w={180} h={70} label="synthesized" />
        <Arrow x1={200} y1={75} x2={250} y2={75} />
        <Box x={250} y={40} w={220} h={70} label="normalize + validate" sub="caps 50 terms / 40 signals" />
        <Arrow x1={470} y1={75} x2={520} y2={75} />
        <Box x={520} y={40} w={220} h={70} label="report object" sub="six keys" tone="write" />
      </svg>
    </Frame>
  );
}

function Fields() {
  return (
    <Frame title="Figure 15 — Follow the highlighted keys in the JSON studio">
      <p className="diagram-note">
        The pane on the right is the same sample_data.json. Highlighted nodes are what this lecture writes. Expand a
        highlighted key to see the real values from the Bedding Duvet Cover Sets run.
      </p>
    </Frame>
  );
}

function TopicsCopy() {
  return (
    <Frame title="Figure 16 — Copy chapters and their evidence">
      <div className="key-grid">
        <div className="key-chip kind-LLM">
          <code>title</code>
          <span>S2 template + S1 length 184.5</span>
        </div>
        <div className="key-chip kind-extra">
          <code>item_highlights</code>
          <span>sample only</span>
        </div>
        <div className="key-chip kind-LLM">
          <code>bullets</code>
          <span>S2 bullet_topics</span>
        </div>
        <div className="key-chip kind-LLM">
          <code>keywords</code>
          <span>lexicon + missing terms</span>
        </div>
      </div>
    </Frame>
  );
}

function TopicsVisual() {
  return (
    <Frame title="Figure 17 — Visual chapters stay on their own track">
      <svg viewBox="0 0 760 170" role="img" aria-label="Visual topic isolation">
        <Box x={20} y={20} w={200} h={50} label="vision.pdp_gallery" />
        <Box x={20} y={100} w={200} h={50} label="vision.aplus" />
        <Arrow x1={220} y1={45} x2={300} y2={45} />
        <Arrow x1={220} y1={125} x2={300} y2={125} />
        <Box x={300} y={20} w={200} h={50} label="topics.gallery_images" tone="think" />
        <Box x={300} y={100} w={200} h={50} label="topics.aplus" tone="think" />
        <text x={560} y={90} className="d-note">prompts never share tracks</text>
      </svg>
    </Frame>
  );
}

function Extras() {
  return (
    <Frame title="Figure 18 — Keys current assemble.js does not return">
      <div className="key-grid">
        <div className="key-chip kind-extra">
          <code>image_plan</code>
          <span>photography brief · schema 2.4</span>
        </div>
        <div className="key-chip kind-extra">
          <code>backend_keywords</code>
          <span>200-byte Amazon paste string</span>
        </div>
        <div className="key-chip kind-extra">
          <code>meta.content_revision</code>
          <span>human edit after 2026-08-12</span>
        </div>
      </div>
    </Frame>
  );
}
