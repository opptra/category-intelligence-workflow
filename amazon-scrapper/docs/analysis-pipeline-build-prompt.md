# Prompt — Design the Catalog Analysis Pipeline (plan first)

> **Use this prompt to make an AI produce an implementation PLAN** for a catalog **analysis
> pipeline**. Do **not** write the pipeline code yet — first produce a clear, scoped plan I can
> review. Building the agent that orchestrates this is **out of scope**; we are only building the
> pipeline the agent will later call.

Give everything below the line to the model. It has full access to this repo.

---

## Role

You are a senior engineer designing a **deterministic-first analysis pipeline**. Your job in this
step is to deliver a **plan** (stages, module layout, JSON schema, efficiency/image strategy, open
questions). No code until the plan is approved.

## What we already have (read these before planning)

- `docs/catalog-intelligence-framework.md` — the **reference methodology**. It enumerates every
  attribute worth analyzing for a category, why it matters, and a **weight (1–10)**. Treat this as
  a **one-time, category-agnostic** reference: it tells us *what to analyze and how to reason*, not
  something to recompute per run. **Do not blindly implement all 60 attributes** — use it to pick
  the highest-leverage subset (see Scope).
- `docs/catalog-analysis-pipeline-prompt.md` — the **future** agentic vision (category resolution
  + scraping + analysis + output). **Out of scope now**; ignore the agent/scraping parts.
- Scrapers (`scrape-our-products.js`, `scrape-all.js`, `lib/`, `scrapers/`) already produce the
  two input datasets. **Assume the datasets already exist** — the pipeline does not scrape.
- Inputs (identical record shape, produced by the scrapers):
  - **Competitors / teacher:** `output/curtains-drapes-product-details.json` (`source: "best-sellers"`, top ~10).
  - **Ours:** `output/our-products-product-details.json` (`source: "our-products"`).
  - Per-product fields available: `title`, `brand`, `feature_bullets[]`, `description`,
    `product_details{}` (spec key→value map incl. `Best Sellers Rank`, `Opacity`, `Size`,
    `Country of Origin`, `ASIN`, …), `price_text`, `rating_label`, `review_count_text`,
    `product_images[]`, `aplus_images[]`, `aplus_text_blocks[]`, and
    `reviews{ total_fetched, by_star{}, items[]{ rating, title, review_text, verified, has_video, date, helpful_count } }`.
- Runtime: **Node.js, CommonJS** (repo uses `require`, only dependency is `puppeteer`). Keep new
  dependencies minimal.

## Goal of the pipeline

Input = the two JSON files. Output = **one structured JSON file** (`output/<category>-analysis.json`)
that a downstream catalog builder can consume. The pipeline must:
1. **Learn category standards** from the competitor corpus (the "teacher").
2. **Mine the review corpus** for praise / complaints / objections / claim-truth.
3. **Score our products** against those standards on the scoped attributes.
4. **Emit** the structured JSON (standards + per-attribute findings + per-SKU actions).

## Scope — analyze only the high-leverage attributes

Pick from the framework by weight. **Include these (weight 8–10):**

- **Search & Text:** Product Title (1.1, w10), Feature Bullets (1.2, w9), Keyword/Search Footprint (1.4, w9).
- **Visual (image analysis is in scope — see below):** Hero Image (2.1, w10), Image-Type Mix (2.3, w9),
  Image Count / Slot Utilization (2.2, w8), Lifestyle Imagery (2.4, w8), Infographic / Size-Guide
  images (2.5/2.6, w8).
- **A+ / Enhanced Content:** A+ Presence (3.1, w8), A+ Depth & Design (3.2, w8), A+ Topic Coverage (3.3, w7).
- **Specs:** Category-Critical / flagship attribute (4.2 & 4.5, w9), Spec Completeness (4.1, w8),
  Dimensions & Size (4.3, w8), Material/Composition (4.4, w8).
- **Price:** Price Positioning (5.1, w8).
- **Reviews:** Avg Rating (6.1, w9), Review Volume (6.2, w9), Praise Mining (6.5, w9),
  Complaint Mining (6.6, w9), Review-vs-Claim (6.7, w9), Star Distribution (6.3, w7).
- **Marketplace:** Best Sellers Rank (7.1, w8).
- **Cross-cutting:** Claim Consistency across surfaces (8.4, w8).

This list is a **strong starting point, not a cage** — if you judge another attribute worth
including (or one of these not worth it), say so and adjust with reasoning.

**Explicitly exclude for now** (note them as "future / needs-collection", don't implement):
everything requiring data we don't scrape — Prime/fulfillment, badges, Q&A, promotions, stock,
ad presence, seller reputation, brand store — plus low-weight polish (content freshness, etc.).

**Images — analyze them properly (this is important).** Metadata alone (counts, `_SL1500_`
resolution, A+ text length) misses most of the visual signal, so we **will run vision on the actual
images** — both `product_images[]` and `aplus_images[]`. The concern is efficiency, not avoidance.
In the plan, design the **most effective + efficient** way to do this. A promising approach: for
each product, **compose its gallery into a single labeled grid/montage (e.g. a 3×3 with each cell
numbered) and analyze it in one vision call** — so ~8 images become 1 call that returns the
image-type mix, hero quality, presence of lifestyle / size-guide / infographic / demo shots, etc.
Evaluate the trade-off yourself: if per-image calls are affordable and give materially better
results, that's fine too. Recommend the approach (grid one-shot, per-image, or hybrid), the grid
layout, sensible downscaling, and whether A+ images get their own grid. Cache vision results so
re-runs don't repeat the work.

## Models & sensible efficiency

- This is a **scalable system we'll run many times**, so it must not be tied to any editor or
  plan. **All LLM and vision calls use the Anthropic API** (Claude models) via an API key supplied
  through an environment variable (e.g. `ANTHROPIC_API_KEY`). Use the official Anthropic SDK
  (`@anthropic-ai/sdk`). Pick sensible Claude model tiers in the plan — a stronger model for
  reasoning/vision, a cheaper/faster one for bulk mining — and make the model IDs configurable.
- **Deterministic-first (good engineering):** anything computable in plain code (counts, lengths,
  numeric bands, field presence, spec-union coverage, rating/BSR parsing, star-distribution math)
  should be **pure Node code with no model call**. Spend model calls only on what genuinely needs
  judgment: title-template extraction, keyword-map synthesis, review theme mining, claim
  corroboration, claim-consistency reconciliation, and image analysis.
- **Batch and cache:** batch where natural (e.g. the image grid above; grouped review mining), and
  **cache model outputs to disk keyed by an input hash** so re-runs are cheap and fast. Be
  efficient with tokens, but there's no fixed budget to design around.

## Deliverable — the plan must contain

1. **Stage breakdown & data flow** — each stage, its input/output, and whether it is
   **deterministic code** or an **LLM call** (label every stage).
2. **Scoped attribute → method map** — for each in-scope attribute: how it's computed (code vs LLM),
   what evidence it cites (ASIN / `review_id`), and its weight.
3. **Output JSON schema — design the best one you can.** This is the pipeline's real product, so
   don't just mirror my wording. Propose the schema *you* think a downstream catalog builder would
   most want to consume: the category standards learned from leaders, the voice-of-customer, the
   per-attribute findings (with evidence + `weight`/`gap_severity`/`priority` or a better scoring
   model if you have one), and per-SKU prioritized actions. Justify the shape briefly. Include the
   image-analysis findings as first-class fields.
4. **Efficiency & image strategy** — the batching, sampling, caching, and image-grid-vs-per-image
   decision (with your recommendation and reasoning); which Claude model tier each stage uses; and
   how work is split across deterministic code / LLM / vision.
5. **Module/file layout** — proposed files under a new `analysis/` (or `lib/analysis/`) folder,
   CommonJS, minimal deps, plus an npm script (e.g. `npm run analyze`).
6. **Open questions / assumptions** — anything you need me to confirm before coding.

## Rules

- Ground every planned insight in a real field / ASIN / `review_id`; never plan to invent data.
- Keep the framework's **attribute list + weights** as the fixed methodology; derive all
  **category-specific values** (title formula, spec union, flagship spec, price band, keyword cloud)
  from the data at runtime — no curtain-specific hardcoding.
- **Plan only. No code in this response.** End with the open questions so I can approve or adjust.
