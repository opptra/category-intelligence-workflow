export const COURSE = {
  title: 'How sample_data.json is made',
  subtitle: 'A walk-through of every field this repo writes — stage, package, LLM call, and proof.',
  sampleNote: 'sample_data.json is schema 2.4 (Bedding Duvet Cover Sets). The code in this checkout emits schema 2.2. Extra keys in the sample are called out in the last lecture.'
};

export const MODULES = [
  { id: 'm1', title: 'Orientation', lectures: ['welcome', 'packages', 'json-map'] },
  { id: 'm2', title: 'Collect the listings', lectures: ['orchestrator', 'bestsellers', 'pdp-reviews'] },
  { id: 'm3', title: 'Think (analysis factory)', lectures: ['load-metrics', 'standards', 'reviews-mine', 'vision', 'catalog-gaps'] },
  { id: 'm4', title: 'Write the report', lectures: ['synthesize-core', 'synthesize-topics', 'assemble'] },
  { id: 'm5', title: 'Field studio', lectures: ['field-meta-summary', 'field-lexicon', 'field-voc', 'field-gaps', 'field-topics-copy', 'field-topics-visual', 'field-extras'] }
];

export const LESSONS = {
  welcome: {
    id: 'welcome',
    title: 'What this factory produces',
    duration: '6 min',
    figure: 'overview',
    jsonPaths: [],
    packages: ['orchestrator', 'amazon-scrapper', 'catalog-analysis'],
    llm: { used: false, note: 'No LLM yet — this lecture is the map.' },
    files: ['orchestrator/src/run.js'],
    intro:
      'This repo is a two-act factory. Act 1 scrapes Amazon.in. Act 2 reads that scrape and writes one intelligence report. sample_data.json is that report for Bedding Duvet Cover Sets: 10 leaders vs 2 of our SKUs.',
    points: [
      'Input: a bestsellers category URL + our product URLs.',
      'Output: one JSON playbook a catalog builder can consume — not a listing file, not NPI.',
      'Intelligence is brand-agnostic. Brand DNA is applied later, outside this repo.',
      'Anything that can be counted is counted in Node. Claude is used only where judgment is required.'
    ],
    takeaway: 'If you remember one sentence: scrape the winners, learn the playbook, score our catalog, emit JSON.'
  },

  packages: {
    id: 'packages',
    title: 'The three packages and when Claude is called',
    duration: '7 min',
    figure: 'packages',
    jsonPaths: [],
    packages: ['amazon-scrapper', 'catalog-analysis', 'orchestrator'],
    llm: {
      used: true,
      note: 'All Claude calls live in catalog-analysis via @anthropic-ai/sdk. The scraper never calls an LLM.'
    },
    files: [
      'amazon-scrapper/package.json',
      'catalog-analysis/package.json',
      'orchestrator/package.json',
      'catalog-analysis/src/services/llm.js'
    ],
    intro:
      'Three local packages. The orchestrator does not reimplement scrape or analysis — it calls them as functions, then writes two files to /output.',
    points: [
      'amazon-scrapper — Puppeteer. Best-sellers list, PDP fields, reviews. Dependency: puppeteer.',
      'catalog-analysis — Sharp (image montages) + Anthropic Claude. Dependency: @anthropic-ai/sdk, sharp, dotenv.',
      'orchestrator — glue. file:../amazon-scrapper and file:../catalog-analysis.',
      'Claude model is config.model (env ANTHROPIC_MODEL). sample_data.meta.model is claude-sonnet-4-5 — that run overrode the code default claude-sonnet-4-20250514.',
      'LLM helpers: completeTool (forced tool_use JSON) and completeVisionTool (image + forced tool_use).'
    ],
    takeaway: 'Count the Claude calls later: 1 standards + 2 review mines + N vision montages + 1 core synthesis + 3 topic batches.'
  },

  'json-map': {
    id: 'json-map',
    title: 'Anatomy of sample_data.json',
    duration: '8 min',
    figure: 'json-map',
    jsonPaths: ['meta', 'topics', 'summary', 'image_plan', 'catalog_gaps', 'backend_keywords', 'category_lexicon', 'voice_of_customer'],
    packages: ['catalog-analysis'],
    llm: { used: false, note: 'This lecture only names the keys. Later lectures prove who writes each one.' },
    files: ['sample_data.json', 'catalog-analysis/src/pipeline/stages/assemble.js'],
    intro:
      'Eight top-level keys. Current assemble.js writes six of them (schema 2.2). The sample file has two extra keys plus a human revision stamp.',
    points: [
      'Written by the current pipeline: meta, summary, category_lexicon, voice_of_customer, catalog_gaps, topics.',
      'Present in this sample but not assembled by current code: image_plan, backend_keywords, topics[].name = item_highlights, meta.content_revision.',
      'topics is an array of { name, observations, actions }. Required names in code: title, bullets, keywords, gallery_images, aplus, specs, pricing, reviews_and_trust, consistency_and_hygiene.',
      'The sample also has item_highlights — a later catalog-builder addition, not in synthesize-topics.schema.json today.'
    ],
    takeaway: 'Use the JSON studio on the right. Each later lecture lights up the keys it actually writes.'
  },

  orchestrator: {
    id: 'orchestrator',
    title: 'The run starts here',
    duration: '6 min',
    figure: 'orchestrator',
    jsonPaths: ['meta'],
    packages: ['orchestrator'],
    llm: { used: false, note: 'Orchestrator never talks to Claude. It only sequences scrape → analyze → disk.' },
    files: ['orchestrator/src/cli.js', 'orchestrator/src/run.js'],
    intro:
      'You type one command. The CLI parses URLs, then runCatalogPipeline does two jobs in order: fetchCatalogData, then runAnalysis.',
    command: `node orchestrator/src/cli.js \\
  --category-url <amazon-bestsellers-url> \\
  --url <our-product-url> [--url ...]`,
    points: [
      'Required flags: --category-url and at least one --url (our product).',
      'Optional: --top-n (default 10), --cookies, --reviews-per-star (50), --max-reviews (250), --concurrency, --headed.',
      'dotenv loads catalog-analysis/.env so ANTHROPIC_API_KEY is available before analysis.',
      'After analysis it writes output/<slug>-analysis.json and output/<slug>-scrape.json. sample_data.json is a copy of the analysis file (later revised).'
    ],
    proof: `orchestrator/src/run.js
  fetchCatalogData(...)   // amazon-scrapper
  runAnalysis({ input: scrapeResult })
  write \${slug}-analysis.json
  write \${slug}-scrape.json`,
    takeaway: 'The orchestrator is 70 lines. It does not invent fields — it only calls the two packages and saves their return values.'
  },

  bestsellers: {
    id: 'bestsellers',
    title: 'Scrape the teacher set (best sellers)',
    duration: '6 min',
    figure: 'scrape-list',
    jsonPaths: ['meta.category', 'meta.competitor_count', 'meta.marketplace'],
    packages: ['amazon-scrapper'],
    llm: { used: false, note: 'Puppeteer only. No prompt.' },
    files: ['amazon-scrapper/src/index.js', 'amazon-scrapper/src/scrapers/best-sellers.js'],
    intro:
      'fetchCatalogData first opens the category bestsellers page. That page is the teacher: who is winning right now, and what the category is called.',
    points: [
      'BestSellersScraper uses BrowserSession (Puppeteer + optional Amazon cookies).',
      'Category name is read from the H1 (“Best Sellers in Bedding Duvet Cover Sets”) — that string becomes meta.category later.',
      'It collects the top N ASINs/URLs (default 10). sample_data.meta.competitor_count is 10 because of that limit.',
      'Domain defaults to www.amazon.in — that becomes meta.marketplace.'
    ],
    proof: `amazon-scrapper/src/index.js
  bestSellers = await bestSellersScraper.scrape({ limit })
  then scrapeProductDetailsAndReviews(bestSellers.items, { source: 'best-sellers' })
  in parallel with our product URLs`,
    takeaway: 'This step does not write sample_data.json. It only decides WHO the 10 teachers are and WHAT the category is named.'
  },

  'pdp-reviews': {
    id: 'pdp-reviews',
    title: 'Scrape every listing surface + reviews',
    duration: '8 min',
    figure: 'scrape-pdp',
    jsonPaths: [],
    packages: ['amazon-scrapper'],
    llm: { used: false, note: 'Still no LLM. These fields are the raw ingredients analysis will later judge.' },
    files: [
      'amazon-scrapper/src/scrapers/product-details.js',
      'amazon-scrapper/src/scrapers/reviews.js',
      'amazon-scrapper/src/lib/scrape-pipeline.js'
    ],
    intro:
      'Leaders and our SKUs are scraped in parallel. Each product page is turned into the same record shape. None of these keys appear at the top of sample_data.json — they are the hidden input.',
    points: [
      'From the PDP: title, brand, feature_bullets[], description, product_details{} (spec key→value), price_text, rating_label, review_count_text, product_images[], aplus_images[], aplus_text_blocks[].',
      'From the reviews scraper: reviews.total_fetched, reviews.by_star, reviews.items[] with rating, title, review_text, verified, has_video, date, helpful_count. Cap: 50 per star, 250 total, newest first.',
      'Leaders and ours run in Promise.all — same scraper, different source labels: best-sellers vs our-products.',
      'The scrape envelope { our_products, top_sellers } is what runAnalysis receives as input.'
    ],
    proof: `product-details.js extractProductData returns:
  title, brand, feature_bullets, description, product_details,
  price_text, rating_label, review_count_text,
  product_images, aplus_images, aplus_text_blocks`,
    takeaway: 'If a field was never scraped, no later LLM can honestly invent it. That is why Prime, badges, and Q&A are out of scope.'
  },

  'load-metrics': {
    id: 'load-metrics',
    title: 'S0 Load + S1 metrics — how meta is born',
    duration: '8 min',
    figure: 's0s1',
    jsonPaths: ['meta'],
    packages: ['catalog-analysis'],
    llm: { used: false, note: 'Deterministic. Parsers and counts only.' },
    files: [
      'catalog-analysis/src/pipeline/stages/load.js',
      'catalog-analysis/src/pipeline/stages/metrics.js',
      'catalog-analysis/src/pipeline/run.js'
    ],
    intro:
      'Analysis begins by loading the two envelopes and attaching a normalized{} object to every product. Then it computes per-product metrics. The only sample_data key this pair writes directly is meta (assembled at the end from load’s counts).',
    points: [
      'S0 requires input.our_products and input.top_sellers, matching category strings, and a domain.',
      'normalizeProduct parses ₹ prices, “4.1 out of 5”, review counts, BSR, pack count, title length, bullet counts, image/A+ counts.',
      'S1 computeCorpusMetrics maps each product to numbers: title_length, image_count, rating, review_count, spec_key_count, price_inr…',
      'These numbers never appear as their own top-level key. They feed S2 norms, S4b catalog_gaps, and the S5 research blob.',
      'meta.category ← top_sellers.category. meta.marketplace ← domain. meta.competitor_count / our_count ← array lengths. meta.generated_at and meta.model are stamped in S6.'
    ],
    proof: `load.js returns meta: { category, domain, competitor_count, our_count }
assemble.js later adds schema_version, generated_at, model`,
    sample: {
      path: 'meta',
      value: {
        model: 'claude-sonnet-4-5',
        category: 'Bedding Duvet Cover Sets',
        our_count: 2,
        marketplace: 'www.amazon.in',
        generated_at: '2026-08-12T03:51:54.573Z',
        schema_version: '2.4',
        competitor_count: 10,
        content_revision: '2026-08-19-drop-second-bedroom-promote-print-drape'
      }
    },
    takeaway: 'content_revision is not produced by assemble.js — it is a later human edit on this sample. schema_version in current code is 2.2, not 2.4.'
  },

  standards: {
    id: 'standards',
    title: 'S2 Category standards — one LLM call',
    duration: '10 min',
    figure: 's2',
    jsonPaths: ['topics', 'category_lexicon', 'catalog_gaps.missing_lexicon_terms'],
    packages: ['catalog-analysis'],
    llm: {
      used: true,
      tool: 'standards_llm',
      method: 'completeTool',
      schema: 'catalog-analysis/src/domain/schemas/standards-llm.schema.json',
      file: 'catalog-analysis/src/pipeline/stages/standards.js'
    },
    files: ['catalog-analysis/src/pipeline/stages/standards.js'],
    intro:
      'S2 learns the category playbook from leaders only (our SKUs are not in this prompt). Half is math. Half is one Claude tool call. The result is an internal object — it does not become a top-level JSON key. It is the research that later fills topics, lexicon, and gaps.',
    points: [
      'Deterministic half: spec_union (every spec key’s fill rate), flagship_attribute, price_band, gallery/A+ medians, rating band, title/bullet length norms, BSR.',
      'LLM half: title.template, required_tokens, mobile_first_75_chars, keyword_map {head, long_tail, vernacular, occasion}, bullet_topics, bullet_framing_pattern.',
      'If the tool call fails, deriveTitleFallback / deriveKeywordFallback kick in so the pipeline still runs.',
      'keyword_map is later scanned against our copy in S4b to produce catalog_gaps.missing_lexicon_terms.',
      'title.template and bullet_topics are stuffed into the S5 research.copy object that writes topics.title / topics.bullets.'
    ],
    prompt: {
      system:
        'You analyze Amazon category leader listings and extract reusable catalog standards. Always fill every required string field with concrete non-empty values derived from the listings.',
      user: `Category: \${category}

Leader titles:
\${compactJson(titles)}

Leader listings (title, bullets, A+, catalog specs only):
\${compactJson(listings)}

Return a complete title object with non-empty template, required_tokens, and mobile_first_75_chars.`,
      toolShape: {
        title: { template: 'string', required_tokens: ['…'], mobile_first_75_chars: ['…'] },
        keyword_map: { head: [], long_tail: [], vernacular: [], occasion: [] },
        bullet_topics: ['…'],
        bullet_framing_pattern: 'string'
      }
    },
    takeaway: 'S2 never writes sample_data.title. It writes an internal standard that S5 quotes when it writes topics[name=title].'
  },

  'reviews-mine': {
    id: 'reviews-mine',
    title: 'S3 Voice of customer — two LLM calls',
    duration: '9 min',
    figure: 's3',
    jsonPaths: ['voice_of_customer'],
    packages: ['catalog-analysis'],
    llm: {
      used: true,
      tool: 'voice_of_customer_mine',
      method: 'completeTool',
      schema: 'catalog-analysis/src/domain/schemas/voice-of-customer-mine.schema.json',
      file: 'catalog-analysis/src/pipeline/stages/reviews-mine.js',
      count: '2 calls — leaders corpus, then our catalog corpus'
    },
    files: ['catalog-analysis/src/pipeline/stages/reviews-mine.js', 'catalog-analysis/src/pipeline/stages/metrics.js'],
    intro:
      'Reviews are mined separately so leader praise is not mixed with our complaints. The two mines are internal. S5 later merges them into one voice_of_customer in the report.',
    points: [
      'Sampling is code: up to 80 one- and two-star reviews, plus up to 40 four- and five-star reviews sorted by helpful_count (config.maxNegativeReviews / maxPositiveReviews).',
      'Texts are grouped by star and truncated to 280 characters before the prompt.',
      'Each call must return signals[] with phrase, sentiment (praise|complaint|objection|neutral), relevance, mention_count. themes{} is optional.',
      'Leader signals are required (pipeline throws if empty). Our corpus may be sparse.',
      'No ASINs or reviewer names are allowed in the tool output.'
    ],
    prompt: {
      system: 'You mine Amazon product reviews into category-wide voice-of-customer insights for catalog building.',
      user: `Category: \${category}
Corpus: \${corpusLabel}   // first "category leaders / top sellers", then "our catalog"

Sampled reviews by rating (\${sampled.length} total):
\${compactJson(reviewsByRating)}

Rules:
- signals: short buyer phrases with sentiment, relevance, and approximate mention_count
- include complaints and objections, not only praise
- themes (optional): praise, complaints, objections arrays
- do not include reviewer names, ASINs, or review IDs
- stay catalog-level for this corpus only`
    },
    sample: {
      path: 'voice_of_customer.signals[0]',
      value: {
        phrase: 'color different from picture',
        relevance: 'high',
        sentiment: 'complaint',
        mention_count: 22
      }
    },
    takeaway: 'The phrase you see in the JSON was not copied from one review — Claude clustered many similar sentences into one signal.'
  },

  vision: {
    id: 'vision',
    title: 'S4 Vision — montages, not one call per photo',
    duration: '12 min',
    figure: 's4',
    jsonPaths: ['topics', 'catalog_gaps.missing_visual_roles', 'image_plan'],
    packages: ['catalog-analysis'],
    llm: {
      used: true,
      tool: 'vision_gallery',
      method: 'completeVisionTool',
      schema: 'catalog-analysis/src/domain/schemas/vision-gallery.schema.json',
      file: 'catalog-analysis/src/pipeline/stages/images.js',
      count: 'One vision call per product gallery (and per A+ set) that has images. Leaders PDP + leaders A+ + our PDP.'
    },
    files: [
      'catalog-analysis/src/pipeline/stages/images.js',
      'catalog-analysis/src/pipeline/stages/visual-summary.js'
    ],
    intro:
      'Vision is expensive, so galleries are composited into one numbered JPEG with Sharp, then sent as a single image. PDP uses a square grid (max 12 cells). A+ uses a vertical stack of landscape banners (max 10). Results are cached under catalog-analysis/.cache.',
    points: [
      'Downloads product_images[] / aplus_images[] (hashed cache). Builds a labeled montage. Sends it with completeVisionTool.',
      'Each cell comes back with cell number, free-text role, content_tags[]. Also present_roles, quality_notes, and (PDP only) hero_conventions.',
      'visual-summary.js merges roles across leaders into pdp_summary / aplus_summary with prevalence. required_roles = roles that show up often enough to be “the bar”.',
      'ours_vs_leaders compares our galleries to that bar → catalog_gaps.missing_visual_roles (empty in this sample — our galleries already had the required roles).',
      'S5 topics gallery_images and aplus are written from this evidence, in separate prompts so PDP and A+ cannot be confused.',
      'image_plan in the sample is a shot list with slots[]. Current assemble.js does not emit image_plan — see the last lecture.'
    ],
    prompt: {
      system:
        'You classify Amazon PDP product-gallery images from a numbered montage. "Lifestyle" means a styled room/setting — not a person. Tag a human in content_tags only if a person (or body part such as a hand/face) is visibly present.',
      user: `This is a numbered PDP product-gallery montage with \${imageCount} images.
Product gallery uses a square grid; each image keeps its original aspect ratio within its cell.

For each numbered cell:
- role: free-text functional role (e.g. styled-room hero, fabric close-up, size infographic)
- content_tags: open-vocabulary concrete elements you see

Also return present_roles, quality_notes, and hero_conventions (PDP only).`,
      aplusSystem:
        'You classify Amazon A+ Content modules from a numbered montage. "Lifestyle" means a styled setting — not automatically a person.',
      aplusUser: `This is a numbered A+ Content montage with \${imageCount} images.
Landscape A+ banners are stacked vertically; each keeps its original aspect ratio.
… role, content_tags, present_roles, quality_notes. hero_conventions is not required for A+.`
    },
    takeaway: 'If gallery_images observations say “styled bedroom hero is universal (100%)”, that number is prevalence from vision cells, not a guess.'
  },

  'catalog-gaps': {
    id: 'catalog-gaps',
    title: 'S4b Catalog gaps — no LLM',
    duration: '8 min',
    figure: 's4b',
    jsonPaths: ['catalog_gaps'],
    packages: ['catalog-analysis'],
    llm: { used: false, note: 'Pure Node. The summary sentence is string-concatenated from the arrays below it.' },
    files: ['catalog-analysis/src/pipeline/stages/catalog-gaps.js'],
    intro:
      'This is the first top-level key that is fully computed before synthesis. Claude does not write catalog_gaps — it only reads a trimmed copy of it when writing summary and topics.',
    points: [
      'metric_deltas: for title_length, bullet_count, image_count, aplus_image_count, aplus_text_count, spec_key_count, price_inr, price_per_panel, rating, review_count, aplus_presence_rate — leaders min/median/max vs ours.',
      'missing_spec_keys: spec keys leaders fill ≥50% of the time that we fill <50%. In the sample: Seasons, Item Display Dimensions, Number of Packs.',
      'missing_lexicon_terms: S2 keyword_map terms that do not appear in our concatenated title+bullets+A++description. This is why “duvet cover” and “comforter” show up here.',
      'missing_visual_roles: from vision.ours_vs_leaders. Empty array in this sample.',
      'our_norms / leader_norms: compact median bands used in the summary sentence and later in topics.pricing / reviews_and_trust.',
      'summary is built by buildDeterministicSummary — look at the sample sentence: it is the same template as the code.'
    ],
    proof: `catalog_gaps.summary in the sample starts:
  "Relative to category leaders, our catalog (aggregated): review volume trails leaders (median 10 vs 319); spec fields under-filled…"
That matches buildDeterministicSummary() in catalog-gaps.js.`,
    sample: {
      path: 'catalog_gaps.missing_spec_keys',
      value: [
        { key: 'Seasons', our_fill_rate: 0, leader_fill_rate: 0.7 },
        { key: 'Item Display Dimensions', our_fill_rate: 0, leader_fill_rate: 0.6 },
        { key: 'Number of Packs', our_fill_rate: 0, leader_fill_rate: 0.5 }
      ]
    },
    takeaway: 'When a topic action says “add Seasons spec field”, it is repeating this array — not discovering it again.'
  },

  'synthesize-core': {
    id: 'synthesize-core',
    title: 'S5 Core — summary, lexicon, voice of customer',
    duration: '12 min',
    figure: 's5-core',
    jsonPaths: ['summary', 'category_lexicon', 'voice_of_customer'],
    packages: ['catalog-analysis'],
    llm: {
      used: true,
      tool: 'synthesize_core',
      method: 'completeTool',
      schema: 'catalog-analysis/src/domain/schemas/synthesize-core.schema.json',
      file: 'catalog-analysis/src/pipeline/stages/synthesize-report.js',
      count: '1 call, max_tokens 20000'
    },
    files: [
      'catalog-analysis/src/pipeline/stages/synthesize-report.js',
      'catalog-analysis/src/utils/prompt-data.js'
    ],
    intro:
      'All prior stages are packed into one research JSON (titles, listings, our_catalog digest, copy standards, specs, mined voice, vision summaries, catalog_gaps). One Claude call writes the three prose sections of the report.',
    points: [
      'buildSynthesisResearch() is the packing function. ASINs are stripped from our_catalog. Vision is split into pdp_gallery vs aplus.',
      'The model must return summary (string), category_lexicon {observations, terms[]}, voice_of_customer {observations, signals[]}.',
      'Lexicon terms come from leader listings only (~30–50), each high|medium|low. S6 later drops low and caps at 50.',
      'Voice mines (leaders vs ours) must be merged into ONE signals list — no leaders/ours buckets in the report.',
      'Priority in the prompt: how top sellers win first; catalog gaps second, and only in aggregate.'
    ],
    prompt: {
      system: 'You synthesize Amazon category research into a concise intelligence report focused on how top sellers win.',
      user: `Category: \${category}

Research:
\${compactJson(research)}

Write the core sections of a category intelligence report.

Priority:
1. Primary — how top sellers win (patterns, vocabulary, buyer expectations)
2. Secondary — catalog-level gaps vs that bar using catalog_gaps, our_catalog, and vision.ours_vs_leaders.

Rules:
- category_lexicon.observations: required non-empty paragraph on how leaders use seller vocabulary (write this before terms)
- category_lexicon.terms: ~30–50 seller/search terms from competitor/leader listings only
- voice_of_customer: ONE unified section. Merge leader/our review mines. Do not output leaders/ours buckets or ASINs
- voice_of_customer.signals: ~25–40 buyer phrases with sentiment, relevance, mention_count; include complaints and objections
- When mentioning visuals, keep PDP gallery claims separate from A+ claims
- No ASINs, no framework IDs, no per-SKU gap callouts`
    },
    sample: {
      path: 'summary (first 240 chars)',
      value:
        'Top sellers in Bedding Duvet Cover Sets win through visual storytelling and extensive social proof. Category leaders average 319 reviews (with top performers reaching 4,700+)…'
    },
    takeaway: 'The “319 vs 10 reviews” line in summary is Claude restating catalog_gaps.metric_deltas.review_count — the number was computed in S1/S4b, not hallucinated.'
  },

  'synthesize-topics': {
    id: 'synthesize-topics',
    title: 'S5 Topics — three more LLM calls',
    duration: '11 min',
    figure: 's5-topics',
    jsonPaths: ['topics'],
    packages: ['catalog-analysis'],
    llm: {
      used: true,
      tool: 'synthesize_topics',
      method: 'completeTool',
      schema: 'catalog-analysis/src/domain/schemas/synthesize-topics.schema.json',
      file: 'catalog-analysis/src/pipeline/stages/synthesize-report.js',
      count: '3 parallel calls: non-visual topics, gallery_images alone, aplus alone'
    },
    files: ['catalog-analysis/src/pipeline/stages/synthesize-report.js'],
    intro:
      'Topics are the playbook chapters. They are written after the core so they can quote the summary/lexicon. Visual topics are isolated so gallery advice cannot steal A+ evidence.',
    points: [
      'Batch A (parallel): title, bullets, keywords, specs, pricing, reviews_and_trust, consistency_and_hygiene.',
      'Batch B: gallery_images only, with extra rules — cite pdp_gallery numbers, never A+ humans on PDP.',
      'Batch C: aplus only — cite aplus numbers, never PDP cells.',
      'Each topic is { name, observations, actions[] }. keywords must not duplicate the full lexicon list.',
      'Current schema enum does not include item_highlights. The sample has that extra topic — a post-pipeline addition.',
      'scopeResearchForTopics() actually removes the other vision track from the prompt, not just “please ignore it”.'
    ],
    prompt: {
      system: 'You write category research topic observations for Amazon catalog intelligence.',
      user: `Category: \${category}

Research:
\${compactJson(scoped)}

Core already written:
\${compactJson({ summary: core.summary, lexicon: core.category_lexicon.observations })}

Required topic names (each exactly once): \${topicList}

Rules:
- Primary focus: how top sellers win on each topic
- Secondary: note catalog-level shortfalls when catalog_gaps / our_catalog / vision.ours_vs_leaders support it
- observations are research findings in prose
- actions are category-wide playbook steps; never individual SKUs/ASINs
- topics.keywords should reference category_lexicon, not duplicate the full term list
- No framework IDs or ASINs`
    },
    takeaway: 'Open topics[0] in the JSON studio. observations = what leaders do. actions = what our catalog should do next. Same shape for every chapter.'
  },

  assemble: {
    id: 'assemble',
    title: 'S6 Assemble, normalize, validate',
    duration: '6 min',
    figure: 'assemble',
    jsonPaths: ['meta', 'summary', 'category_lexicon', 'voice_of_customer', 'catalog_gaps', 'topics'],
    packages: ['catalog-analysis'],
    llm: { used: false, note: 'No new Claude call. Filter, stamp, validate.' },
    files: [
      'catalog-analysis/src/pipeline/stages/assemble.js',
      'catalog-analysis/src/domain/report-normalize.js',
      'catalog-analysis/src/domain/report-schema.js'
    ],
    intro:
      'The last stage does not invent content. It trims lexicon/voice, stamps meta, and refuses to return a report that is missing a required topic.',
    points: [
      'Lexicon: keep high|medium, sort high first, cap 50, promote leftover low → medium if needed.',
      'Voice: keep high|medium, sort by relevance then mention_count then sentiment (complaints first), cap 40.',
      'meta.schema_version is hardcoded SCHEMA_VERSION (2.2 in this checkout). The sample’s 2.4 was stamped by a later revision of this code.',
      'validateReport throws if topics miss a required name, if voice still has leaders/ours buckets, or if keywords.terms sneaks in.',
      'orchestrator then JSON.stringifys the object to disk. That file is what you copied as sample_data.json (plus later extras).'
    ],
    proof: `assemble.js report = {
  meta, summary, category_lexicon, voice_of_customer, catalog_gaps, topics
}
No image_plan. No backend_keywords.`,
    takeaway: 'If a key exists in the sample but not in this object, it was added after S6 — that is the next lectures’ honesty check.'
  },

  'field-meta-summary': {
    id: 'field-meta-summary',
    title: 'Fields: meta and summary',
    duration: '6 min',
    figure: 'fields',
    jsonPaths: ['meta', 'summary'],
    packages: ['catalog-analysis', 'amazon-scrapper'],
    llm: { used: true, note: 'summary is Claude (synthesize_core). meta is code.' },
    files: ['catalog-analysis/src/pipeline/stages/assemble.js', 'catalog-analysis/src/pipeline/stages/load.js'],
    intro: 'Two keys at the top of the file. One is a stamp. One is the executive paragraph.',
    fieldRows: [
      { path: 'meta.category', source: 'S0 from bestsellers H1 / top_sellers.category', llm: false },
      { path: 'meta.marketplace', source: 'S0 domain (www.amazon.in)', llm: false },
      { path: 'meta.competitor_count / our_count', source: 'S0 array lengths (10 and 2)', llm: false },
      { path: 'meta.generated_at', source: 'S6 new Date().toISOString()', llm: false },
      { path: 'meta.model', source: 'S6 config.model / ANTHROPIC_MODEL', llm: false },
      { path: 'meta.schema_version', source: 'S6 SCHEMA_VERSION constant', llm: false },
      { path: 'meta.content_revision', source: 'Not in assemble.js — human stamp on this sample', llm: false },
      { path: 'summary', source: 'S5 synthesize_core, reading research + catalog_gaps', llm: true }
    ],
    takeaway: 'Read summary as Claude’s compression of everything below it. Read meta as the receipt for the run.'
  },

  'field-lexicon': {
    id: 'field-lexicon',
    title: 'Field: category_lexicon',
    duration: '7 min',
    figure: 'fields',
    jsonPaths: ['category_lexicon'],
    packages: ['catalog-analysis'],
    llm: { used: true, note: 'Written by synthesize_core, then filtered by S6.' },
    files: [
      'catalog-analysis/src/domain/schemas/synthesize-core.schema.json',
      'catalog-analysis/src/domain/report-normalize.js'
    ],
    intro:
      'The lexicon is the category’s search language, harvested from leader copy — not from our listings. That is why “duvet cover” can be high relevance even if our catalog never says it.',
    points: [
      'observations: a paragraph on how leaders spread vocabulary across title, bullets, specs, A+. Written first in the prompt, before the term list.',
      'terms[]: { term, relevance }. Sample has high head terms (bedsheet, king size, cotton) and medium long-tails (108x108 inches, 300 tc, cloud cotton).',
      'S6 drops relevance=low and caps at 50. The sample’s list is already high+medium only — that matches the filter.',
      'catalog_gaps.missing_lexicon_terms is a different list: S2 keyword_map minus our copy. Overlap is expected (duvet cover, comforter).',
      'topics.keywords.observations retells this lexicon in prose and must not dump terms[] again.'
    ],
    sample: {
      path: 'category_lexicon.terms[0..2]',
      value: [
        { term: 'bedding set', relevance: 'high' },
        { term: 'bedsheet', relevance: 'high' },
        { term: 'breathable', relevance: 'high' }
      ]
    },
    takeaway: 'If you need backend search terms, start here — then see backend_keywords in the last lecture for the 200-byte paste string (not in current S6).'
  },

  'field-voc': {
    id: 'field-voc',
    title: 'Field: voice_of_customer',
    duration: '7 min',
    figure: 'fields',
    jsonPaths: ['voice_of_customer'],
    packages: ['catalog-analysis'],
    llm: { used: true, note: 'S3 mines twice; S5 merges; S6 trims to 40 high/medium signals.' },
    files: [
      'catalog-analysis/src/pipeline/stages/reviews-mine.js',
      'catalog-analysis/src/pipeline/stages/synthesize-report.js'
    ],
    intro:
      'This is buyer language, not seller language. Lexicon = what winners write. Voice = what reviewers actually say.',
    points: [
      'signals are sorted by S6: high before medium, then higher mention_count, then complaints/objections before praise.',
      'Look at the sample: “color different from picture” (complaint, 22) sits above “good quality fabric” (praise, 18). That is the sort, not coincidence.',
      'observations is the merged narrative. The sample talks about softness, fake-cotton objections, and photo mismatch — those themes were in both leader and our reviews.',
      'mention_count is approximate from the sampled reviews, not a full-catalog census.',
      'topics.reviews_and_trust uses the volume gap (10 vs 319) from catalog_gaps, and these phrases as “what to emphasize in copy”.'
    ],
    sample: {
      path: 'voice_of_customer.signals (first 3)',
      value: [
        { phrase: 'color different from picture', sentiment: 'complaint', mention_count: 22 },
        { phrase: 'good quality fabric', sentiment: 'praise', mention_count: 18 },
        { phrase: 'extremely soft material', sentiment: 'praise', mention_count: 15 }
      ]
    },
    takeaway: 'A listing that claims “100% cotton” while reviewers say “not pure cotton” is exactly the claim-vs-reality loop this section exists to catch.'
  },

  'field-gaps': {
    id: 'field-gaps',
    title: 'Field: catalog_gaps',
    duration: '7 min',
    figure: 's4b',
    jsonPaths: ['catalog_gaps'],
    packages: ['catalog-analysis'],
    llm: { used: false, note: 'Entire object is S4b Node. Claude only quotes it later.' },
    files: ['catalog-analysis/src/pipeline/stages/catalog-gaps.js'],
    intro: 'This is the scoreboard. Every number here can be recomputed from the scrape without Claude.',
    fieldRows: [
      { path: 'catalog_gaps.summary', source: 'buildDeterministicSummary() concatenates the arrays', llm: false },
      { path: 'catalog_gaps.our_norms / leader_norms', source: 'aggregateNorms() of S1 metrics', llm: false },
      { path: 'catalog_gaps.metric_deltas', source: 'side-by-side min/median/max for 10 metrics + A+ rate', llm: false },
      { path: 'catalog_gaps.missing_spec_keys', source: 'leader fill_rate ≥ 0.5 and our fill_rate < 0.5', llm: false },
      { path: 'catalog_gaps.missing_lexicon_terms', source: 'S2 keyword_map terms absent from our copy', llm: false },
      { path: 'catalog_gaps.missing_visual_roles', source: 'S4 ours_vs_leaders.missing_vs_leader_required', llm: false }
    ],
    takeaway: 'Proof check: review_count medians 10 vs 319 appear in metric_deltas, in summary, and again in topics.reviews_and_trust. Same number, three surfaces.'
  },

  'field-topics-copy': {
    id: 'field-topics-copy',
    title: 'Topics: title, item_highlights, bullets, keywords',
    duration: '9 min',
    figure: 'topics-copy',
    jsonPaths: ['topics'],
    packages: ['catalog-analysis'],
    llm: { used: true, note: 'Non-visual synthesize_topics batch, except item_highlights which current schema does not allow.' },
    files: [
      'catalog-analysis/src/domain/schemas/synthesize-topics.schema.json',
      'catalog-analysis/src/pipeline/stages/standards.js'
    ],
    intro:
      'These four chapters are about searchable text. They read S2 title.template / bullet_topics / keyword_map, S4b gaps, and leader listings in the research blob.',
    fieldRows: [
      { path: 'topics[name=title]', source: 'S5 batch A. Evidence: S2 title template + median 184.5 chars from S1.', llm: true },
      { path: 'topics[name=item_highlights]', source: 'In the sample only. Not in REQUIRED_TOPIC_NAMES or the schema enum today.', llm: true },
      { path: 'topics[name=bullets]', source: 'S5 batch A. Evidence: S2 bullet_topics + 5-bullet / 180–220 char norms.', llm: true },
      { path: 'topics[name=keywords]', source: 'S5 batch A. Must reference category_lexicon, not clone terms[].', llm: true }
    ],
    points: [
      'Title observations in the sample cite “Leaders average 184.5 characters” — that is catalog_gaps.leader_norms.title_length.median (and S1).',
      'Actions like “Lead with size descriptor (King/Super King)” are Claude turning S2 required_tokens into playbook steps.',
      'item_highlights talks about a 125-character Amazon field. Current synthesize-topics.schema.json has no such name — treat this chapter as a later catalog-builder extension sitting in the sample.',
      'keywords actions name the missing terms from catalog_gaps.missing_lexicon_terms (duvet cover, comforter, shrink-proof).'
    ],
    takeaway: 'Copy topics are S2 patterns + S4b gaps, narrated by S5. The numbers were already true before Claude wrote the sentence.'
  },

  'field-topics-visual': {
    id: 'field-topics-visual',
    title: 'Topics: gallery, A+, specs, price, reviews, hygiene',
    duration: '10 min',
    figure: 'topics-visual',
    jsonPaths: ['topics', 'image_plan'],
    packages: ['catalog-analysis'],
    llm: { used: true, note: 'gallery_images and aplus are isolated vision batches. The rest are batch A.' },
    files: ['catalog-analysis/src/pipeline/stages/synthesize-report.js'],
    intro: 'The remaining six required chapters, plus how they connect to image_plan in this sample.',
    fieldRows: [
      { path: 'topics[name=gallery_images]', source: 'S5 batch B. Evidence: vision.pdp_gallery only. Median 10.5 images from S1/S4.', llm: true },
      { path: 'topics[name=aplus]', source: 'S5 batch C. Evidence: vision.aplus only. 40% presence, median 6.5 modules.', llm: true },
      { path: 'topics[name=specs]', source: 'S5 batch A + S2 spec_union + missing_spec_keys (Seasons, Display Dimensions, Packs).', llm: true },
      { path: 'topics[name=pricing]', source: 'S5 batch A + S1 price bands (median ₹539 leaders vs ₹566.5 ours).', llm: true },
      { path: 'topics[name=reviews_and_trust]', source: 'S5 batch A + review_count delta 10 vs 319 + voice themes.', llm: true },
      { path: 'topics[name=consistency_and_hygiene]', source: 'S5 batch A. Cross-surface claim alignment (Cloud Cotton vs Microfiber).', llm: true }
    ],
    points: [
      'Gallery extra rules explicitly forbid prescribing “image 1 should be X”. The sample’s gallery actions are still a shot sequence — that is closer to image_plan language, and likely why image_plan was added later as a dedicated structure.',
      'A+ extra rules: only claim humans when vision.aplus.signals.human_presence supports it. The sample says “About 75% of A+ sets use people, unlike PDPs” — that is a vision signal, not a copy guess.',
      'Specs actions map 1:1 onto missing_spec_keys.',
      'Reviews actions are about volume, not about rewriting stars — you cannot LLM your way to 319 reviews.'
    ],
    takeaway: 'Visual topics are the only chapters that are allowed to see pictures, and each chapter sees only its own track.'
  },

  'field-extras': {
    id: 'field-extras',
    title: 'Extras in this sample: image_plan and backend_keywords',
    duration: '8 min',
    figure: 'extras',
    jsonPaths: ['image_plan', 'backend_keywords', 'meta.content_revision'],
    packages: ['catalog-analysis'],
    llm: {
      used: false,
      note: 'These keys are in sample_data.json but are not returned by current assemble.js. They were added in a later revision of the pipeline (schema 2.4) or by a follow-on script / hand edit.'
    },
    files: ['sample_data.json', 'catalog-analysis/src/pipeline/stages/assemble.js'],
    intro:
      'Honesty pass. This sample is richer than the checkout you are reading. If you run the repo today you will not get these keys unless that newer code is merged.',
    points: [
      'image_plan.gallery.slots[] / image_plan.aplus.slots[] — ordered shot lists with kind, role, owns, content, pattern, evidence.prevalence, max_callouts, feature_priority. This is the operational photography brief that topics.gallery_images only describes in prose.',
      'image_plan.observed and visual_norms restate S4 medians (PDP median 10.5, A+ median 6.5, humans common on A+).',
      'backend_keywords.paste_string is a 198-byte Amazon search-terms blob. excluded_because_already_in_copy lists lexicon terms already used on-page so they are not wasted in the 200-byte backend field.',
      'meta.content_revision = "2026-08-19-drop-second-bedroom-promote-print-drape" is a named human edit after generated_at 2026-08-12.',
      'topics item_highlights is the same story: useful, present in the sample, absent from synthesize-topics.schema.json in this checkout.'
    ],
    sample: {
      path: 'backend_keywords (trimmed)',
      value: {
        used_bytes: 198,
        marketplace_limit_bytes: 200,
        paste_string:
          'duvet cover 300 tc fitted bedsheet comforter colorfast single bed 108x108 inches polycotton glace cotton …'
      }
    },
    takeaway: 'When something in the JSON surprises you, check assemble.js first. If the key is not in that object, it did not come from the six stages you just walked.'
  }
};

export const LECTURE_ORDER = MODULES.flatMap((m) => m.lectures);
