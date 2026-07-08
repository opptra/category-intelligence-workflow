# Product Gap Analysis Framework — Evaluation Attribute Catalog

**Purpose.** This document defines every attribute, feature, and signal that should be evaluated when comparing Opptra's products against top-selling products in the same category. It is the definitive evaluation framework that will later become the foundation of the Product Gap Analysis Engine. It intentionally contains **no implementation details, algorithms, or action plans** — only *what* should be evaluated, *why*, and *at what importance*.

**Datasets analyzed to build this catalog:**

| Dataset | Contents |
|---|---|
| `curtains-drapes-product-details.json` | Top 10 best sellers in Curtains & Drapes on amazon.in (BSR #1–#10), full listing data + up to 250 reviews each (capped at 50 per star, sorted by recent) |
| `our-products-product-details.json` | 5 Cortina ASINs in the same category (BSR #22–#1,153), same data shape |

Both datasets capture: title, brand, feature bullets, description, structured specifications (`product_details`), price, rating, review count, gallery images, A+ images, A+ text blocks, Best Sellers Rank, and sampled customer reviews (with verified flag, video flag, helpful votes, and dates).

**Weight scale used throughout:**

| Weight | Meaning |
|---|---|
| 9–10 | Critical — directly drives search rank, click-through, or conversion; a gap here is a primary revenue leak |
| 7–8 | High — strong influence on discoverability, conversion, or trust |
| 5–6 | Moderate — meaningful contributor, differentiator, or hygiene factor |
| 3–4 | Supporting — secondary signal, mostly diagnostic value |

---

## Master Index of Evaluation Attributes

| # | Attribute | Pillar | Weight |
|---|---|---|---|
| 1.1 | Product Title | Search & Textual Content | 10 |
| 1.2 | Feature Bullets | Search & Textual Content | 9 |
| 1.3 | Product Description | Search & Textual Content | 5 |
| 1.4 | SEO Keyword Footprint | Search & Textual Content | 9 |
| 1.5 | Content Hygiene (Spelling / Grammar / Template Artifacts) | Search & Textual Content | 7 |
| 1.6 | Category & Browse Node Placement | Search & Textual Content | 7 |
| 1.7 | Claim Accuracy & Cross-Surface Consistency | Search & Textual Content | 9 |
| 2.1 | Main (Hero) Image | Visual Content | 10 |
| 2.2 | Image Count & Slot Utilization | Visual Content | 8 |
| 2.3 | Image Type Mix | Visual Content | 9 |
| 2.4 | Lifestyle / In-Context Imagery | Visual Content | 8 |
| 2.5 | Infographics & Size Guides | Visual Content | 8 |
| 2.6 | Image Technical Quality | Visual Content | 7 |
| 2.7 | Color Fidelity | Visual Content | 8 |
| 2.8 | Product Video | Visual Content | 7 |
| 2.9 | Variant Imagery Coverage | Visual Content | 6 |
| 3.1 | A+ Content Presence | A+ / Enhanced Brand Content | 8 |
| 3.2 | A+ Module Depth & Design Quality | A+ / Enhanced Brand Content | 8 |
| 3.3 | A+ Topic & Feature-Story Coverage | A+ / Enhanced Brand Content | 7 |
| 3.4 | A+ Text Layer (Alt-Text / Crawlable Copy) | A+ / Enhanced Brand Content | 6 |
| 3.5 | Brand Story Module | A+ / Enhanced Brand Content | 6 |
| 3.6 | Comparison & Cross-Sell Charts | A+ / Enhanced Brand Content | 6 |
| 4.1 | Specification Completeness | Structured Specifications | 8 |
| 4.2 | Specification Accuracy & Internal Consistency | Structured Specifications | 8 |
| 4.3 | Category-Critical Technical Attributes | Structured Specifications | 9 |
| 4.4 | Dimensions & Size Data Quality | Structured Specifications | 8 |
| 4.5 | Package Contents & Unit Count Clarity | Structured Specifications | 6 |
| 4.6 | Care Instructions | Structured Specifications | 5 |
| 4.7 | Warranty & Guarantee Information | Structured Specifications | 6 |
| 4.8 | Compliance, Origin & Manufacturer Data | Structured Specifications | 7 |
| 4.9 | Variant / Family Structure | Structured Specifications | 7 |
| 5.1 | Price Positioning | Price & Value | 8 |
| 5.2 | Perceived Value for Money | Price & Value | 7 |
| 5.3 | Promotions, Deals & Coupons | Price & Value | 5 |
| 6.1 | Average Star Rating | Ratings & Reviews | 9 |
| 6.2 | Review Volume | Ratings & Reviews | 9 |
| 6.3 | Rating Distribution Shape | Ratings & Reviews | 7 |
| 6.4 | Review Recency & Velocity | Ratings & Reviews | 6 |
| 6.5 | Review Theme Mining (Praise & Complaint Clusters) | Ratings & Reviews | 9 |
| 6.6 | Review-vs-Claim Validation | Ratings & Reviews | 9 |
| 6.7 | Customer Media in Reviews (Photos / Videos) | Ratings & Reviews | 6 |
| 6.8 | Review Credibility & Prominence Signals | Ratings & Reviews | 5 |
| 6.9 | Q&A Section Coverage | Ratings & Reviews | 5 |
| 7.1 | Best Sellers Rank (BSR) | Marketplace Performance | 8 |
| 7.2 | Badges (Best Seller / Amazon's Choice / Deals) | Marketplace Performance | 7 |
| 7.3 | Organic Search Visibility | Marketplace Performance | 8 |
| 7.4 | Advertising Presence | Marketplace Performance | 5 |
| 8.1 | Fulfillment Channel & Prime Eligibility | Trust, Fulfillment & Post-Purchase | 8 |
| 8.2 | Delivery Promise | Trust, Fulfillment & Post-Purchase | 6 |
| 8.3 | Stock Availability & Continuity | Trust, Fulfillment & Post-Purchase | 7 |
| 8.4 | Returns & Refund Experience Signals | Trust, Fulfillment & Post-Purchase | 6 |
| 8.5 | Seller Reputation | Trust, Fulfillment & Post-Purchase | 5 |
| 8.6 | Packaging & Arrival Condition Signals | Trust, Fulfillment & Post-Purchase | 6 |
| 9.1 | Brand Store Presence & Depth | Brand & Differentiation | 6 |
| 9.2 | Brand Consistency Across Surfaces | Brand & Differentiation | 6 |
| 9.3 | Differentiation & USP Clarity | Brand & Differentiation | 7 |
| 9.4 | Portfolio Breadth Within Category | Brand & Differentiation | 6 |
| 10.1 | Customer-Language Alignment | Cross-Cutting & Implicit Signals | 7 |
| 10.2 | Unaddressed Purchase Objections | Cross-Cutting & Implicit Signals | 6 |
| 10.3 | Mobile Presentation Quality | Cross-Cutting & Implicit Signals | 6 |
| 10.4 | Localization & Cultural Fit | Cross-Cutting & Implicit Signals | 6 |
| 10.5 | Content Freshness | Cross-Cutting & Implicit Signals | 4 |

---

## Pillar 1 — Search & Textual Content

### 1.1 Product Title — Importance: 10/10

**Why it matters.** The title is the single highest-leverage text surface on a listing: it is the primary input to Amazon's search indexing, it is what shoppers read in search results before deciding to click, and it frames every expectation about the product. Best sellers in this category treat the title as a compressed sales pitch — brand, product type, size, blackout level, pack quantity, material, room use-case, and color all appear in one string.

**Importance rationale.** A weak title suppresses both impressions (indexing) and click-through (shopper appeal) simultaneously; no other single attribute has this dual effect.

**How to evaluate.**
- **Competitive benchmarking:** compare structure and information density against the top sellers' title patterns (brand → product type → size/length → key benefit → pack count → room use → dimensions/color).
- **Completeness:** check that the purchase-critical facts for the category are present (size in feet, panel count, opacity level, material, color).
- **SEO relevance:** measure coverage of the high-demand search terms observable in competitor titles (e.g., "blackout curtains 7 feet", "door curtains set of 2", "room darkening").
- **Textual quality:** length utilization vs. marketplace norms, readability, absence of stuffing that harms click-through, correct spelling.
- **Accuracy:** the title's claims must match the specifications and the product reality (see 1.7).

**Evidence in the datasets.** Competitor titles run 69–188 characters and follow a consistent benefit-dense pattern; our titles run 109–191 characters but contain spelling errors ("Windowd", "Polyster") and one title claims "80-90% Blackout" while its own bullet claims 100% blackout.

---

### 1.2 Feature Bullets — Importance: 9/10

**Why it matters.** Bullets are the main conversion copy above the fold and are indexed for search. Top sellers use them to sequence purchase drivers: pack contents and exact dimensions first, then blackout performance, then technology (triple weave), then care, then occasion/gifting angles.

**Importance rationale.** Bullets carry most of the persuasion burden on mobile, where the description and A+ sit far below the fold; weak bullets directly depress conversion.

**How to evaluate.**
- **Count and length:** compare number of bullets (best sellers use 5–7) and per-bullet word count against the competitor norm.
- **Topic coverage:** map which purchase drivers each bullet set covers (dimensions, opacity, insulation, noise, privacy, care, occasions, room fit) and identify themes competitors cover that ours do not.
- **Benefit-vs-feature framing:** assess whether bullets translate specs into customer outcomes ("sleep quality", "energy savings") the way category leaders do.
- **Keyword integration:** measure long-tail keyword coverage woven into bullets vs. competitors.
- **Textual quality and uniqueness:** detect generic template copy reused across sellers vs. original brand copy; detect grammar/spelling defects; detect claims that contradict other surfaces.

**Evidence in the datasets.** Our bullets contain a "TRIPE WEAVE TECHNOLOGY" typo, boilerplate artifacts ("Due to different screen display, the color of actual item may vary slightly from images") common to generic exporter templates, and a 100%-blackout claim inside an 80–90% product listing.

---

### 1.3 Product Description — Importance: 5/10

**Why it matters.** The plain-text description is a secondary conversion and indexing surface. On amazon.in it is frequently superseded by A+ content (which replaces the description when present), so its standalone importance is moderate — but it becomes the primary long-form surface for any listing *without* A+.

**Importance rationale.** 8 of 10 best sellers in the dataset have a null description and still dominate the category — evidence that description is not a primary ranking lever here. It matters most as a fallback.

**How to evaluate.**
- **Presence rule:** evaluate presence and richness *conditionally* — a missing description is a significant gap only where A+ content is also missing or thin.
- **Completeness:** where present, check it adds information not already in bullets (story, materials, sizing guidance) rather than duplicating them.
- **Textual quality:** readability, structure, keyword coverage without stuffing.

**Evidence in the datasets.** Descriptions present: 2/10 competitors (267 and 1,387 chars), 1/5 of ours (191 chars). The one competitor with a long description (Homefab, ranked #7) has no A+ content — the description is doing the A+ job.

---

### 1.4 SEO Keyword Footprint — Importance: 9/10

**Why it matters.** Discoverability is a function of the total indexed keyword surface: title + bullets + structured attributes + A+ alt text. Best sellers deliberately cover head terms, long-tail phrases, vernacular terms, room types, and occasions so they surface for the entire demand curve of the category.

**Importance rationale.** Products cannot convert on searches they never appear in; keyword coverage is the top of the entire funnel.

**How to evaluate.**
- **Competitive keyword gap analysis:** extract the recurring terms and phrases across all top-seller text surfaces and measure which of them are absent from our listings (e.g., "room darkening", "thermal insulated", "7 feet", "grommet", "eyelet").
- **Vernacular and local-intent coverage:** check for India-market terms best sellers use ("parda", "pooja room curtains", "curtains for hall").
- **Use-case and occasion coverage:** rooms (bedroom, living room, kids room, office), occasions (Diwali, weddings, housewarming, gifting) — competitors index against all of these.
- **Semantic breadth vs. stuffing balance:** AI semantic analysis to judge whether keywords are integrated naturally or dumped incoherently.
- **Structured-attribute keyword support:** filterable spec fields (Room Type, Seasons, Occasion Type) also feed discovery — measure their breadth (see 4.1).

**Evidence in the datasets.** The #1 best seller indexes for "parda", "pooja room", "backdrop decoration", and Diwali/wedding gifting inside its bullets; its Room Type spec lists five room types while ours lists only "Living Room".

---

### 1.5 Content Hygiene (Spelling / Grammar / Template Artifacts) — Importance: 7/10

**Why it matters.** Typos and leftover template text signal a careless or low-trust seller to both customers and Amazon's quality systems. They also break exact-match indexing (a shopper searching "polyester" will not match "Polyster") and directly undermine premium-brand positioning.

**Importance rationale.** Cheap to detect, disproportionately damaging to trust and conversion; a hygiene gate every listing must pass.

**How to evaluate.**
- **Full-surface proofread:** scan every text surface (title, bullets, description, spec values, A+ text) for spelling, grammar, casing, and punctuation defects.
- **Brand-name integrity:** verify the brand is spelled identically everywhere.
- **Template artifact detection:** flag boilerplate that belongs to a different product, market, or seller (measurement disclaimers, foreign-market color names, other brands' copy).
- **Consistency of units and formats:** cm vs inches vs feet expressed consistently.

**Evidence in the datasets.** Ours: "Polyster" (title), "Windowd" (title), "TRIPE WEAVE" (bullet), brand misspelled "Corttina" inside a spec field, and a spec field containing copy for a different market ("Burnt Orange … Rust Terracotta Fall Decor" on a grey curtain sold in India).

---

### 1.6 Category & Browse Node Placement — Importance: 7/10

**Why it matters.** The browse node determines which Best Sellers list the product competes in, which search filters it appears under, and which "customers also viewed" pools it joins. Miscategorization silently removes a product from its natural demand.

**Importance rationale.** Binary but foundational — wrong placement caps everything downstream.

**How to evaluate.**
- **Node parity check:** confirm our products sit in the same leaf node as the category best sellers ("Curtains & Drapes").
- **Item-type keyword correctness:** verify the item type name describes the actual product (ours contains a stuffed, inaccurate item-type string).
- **Sub-rank sanity:** confirm the BSR sub-category matches the intended competitive set.

**Evidence in the datasets.** All 15 products report a Curtains & Drapes sub-rank, so placement is correct today; the "Item Type Name" field on our top ASIN is a stuffed marketing string rather than a clean item type.

---

### 1.7 Claim Accuracy & Cross-Surface Consistency — Importance: 9/10

**Why it matters.** When the title, bullets, specs, images, and A+ make conflicting or inflated claims, two failures follow: customers who notice inconsistency lose trust and don't buy; customers who don't notice buy, feel deceived, and return the product or leave 1–2 star reviews — permanently damaging the rating asset. This is one of the most consequential *implicit* quality attributes.

**Importance rationale.** The datasets show this exact failure loop already operating on our best-ranked ASIN; it corrodes every other investment in the listing.

**How to evaluate.**
- **Cross-surface claim reconciliation:** extract every factual claim (opacity %, material, GSM, dimensions, features like waterproof/thermal) from each surface and check they agree.
- **Review corroboration:** use customer reviews as ground-truth evidence for whether the flagship claims hold in reality (see 6.6).
- **Marketplace best-practice check:** claims like "100%" or "waterproof" should be verifiable and consistent with the specs declared.
- **AI semantic understanding required:** claims are phrased differently across surfaces ("100% True Blackout" vs "Opacity: 100%"), so matching must be semantic, not literal.

**Evidence in the datasets.** Our ASIN B0F23VGBP6: title "80-90% Blackout", bullet "block 100% light out", spec Opacity "Blackout", spec Lining "Unlined", spec Water Resistance "Not Water Resistant" — while 2-star reviews state "They only block 20-40% of the light. Misleading product description." The #1 competitor declares "Opacity: 100%", lining "blackout", and its reviews corroborate ("Complete blackout even in afternoon").

---

## Pillar 2 — Visual Content

### 2.1 Main (Hero) Image — Importance: 10/10

**Why it matters.** The hero image is the largest driver of click-through from search results — it is seen by every potential customer at the moment of choice, before any text. For home décor, it must simultaneously read as premium, show the true color, and communicate the product form (panel pair, grommets) within a thumbnail.

**Importance rationale.** Equal to the title as the gatekeeper of all traffic; a weak hero image suppresses every downstream metric.

**How to evaluate.**
- **Visual analysis required:** professional quality, lighting, styling, and premium feel benchmarked side-by-side against the ten best-seller hero images.
- **Marketplace compliance:** white/clean background, product fills ~85% of frame, no watermarks/logos/badges baked in.
- **Technical floor:** resolution high enough to zoom (≥1500px on the long side).
- **Information content:** does the thumbnail alone communicate pack count, drape/texture, and installed appearance the way top sellers' heroes do.
- **Color truthfulness:** hero color must match the delivered product (validated against review complaints — see 2.7).

---

### 2.2 Image Count & Slot Utilization — Importance: 8/10

**Why it matters.** Each image slot is free selling space; shoppers who scroll a full gallery convert at much higher rates. Under-filled galleries leave questions unanswered and cede ground to competitors whose galleries pre-empt every doubt.

**Importance rationale.** Strong, cheap-to-measure proxy for listing investment; clearly differentiated between leaders and laggards.

**How to evaluate.**
- **Count benchmarking:** compare gallery size against the category-leader norm (best sellers here carry 12–18 gallery images; the only competitor with 3 images ranks last of the ten).
- **Slot utilization:** verify all available slots are used, including the video slot (see 2.8).
- **Marginal-value check:** flag duplicate or near-duplicate images that waste slots.

**Evidence in the datasets.** Competitors: 3–18 images (median ≈15). Ours: 12–14. Parity is close on count — the gap analysis must therefore weigh *composition* (2.3) more than raw count.

---

### 2.3 Image Type Mix — Importance: 9/10

**Why it matters.** A gallery is a structured argument, not a pile of photos. Best-in-class curtain listings sequence: hero → lifestyle room scene → texture close-up → dimension/size infographic → feature callouts (grommets, triple weave, blackout demo) → light-blocking before/after → packaging/contents. Each type answers a specific pre-purchase question.

**Importance rationale.** The mix determines whether the gallery actually converts; two listings with 14 images can differ enormously in persuasive power.

**How to evaluate.**
- **Visual classification required:** categorize every gallery image by type (hero / lifestyle / close-up / infographic / feature callout / blackout demonstration / packaging / size chart).
- **Competitive mix comparison:** compare our type distribution per product against the aggregate best-seller distribution and flag missing types.
- **Category-specific must-haves:** for blackout curtains, a light-blocking demonstration image and a texture/GSM close-up are effectively mandatory — check presence explicitly.
- **Narrative order:** assess whether image sequence follows a logical persuasion flow.

---

### 2.4 Lifestyle / In-Context Imagery — Importance: 8/10

**Why it matters.** Curtains are an aesthetic purchase; customers buy the *room*, not the fabric. In-context photography lets shoppers project the product into their home, dramatically reducing hesitation, and signals brand quality through staging.

**Importance rationale.** Core conversion driver for home décor specifically; less critical in utilitarian categories, hence 8 not 10.

**How to evaluate.**
- **Presence and share:** count lifestyle scenes in the gallery and their share of total images vs. competitors.
- **Visual quality analysis:** staging sophistication, realistic light, aspirational-but-relatable interiors, consistency with target-customer homes (Indian living rooms/bedrooms vs. imported stock scenes).
- **Product truthfulness:** rendered/CGI scenes should still represent true color and drape.

---

### 2.5 Infographics & Size Guides — Importance: 8/10

**Why it matters.** Size confusion is the most preventable cause of returns and 1-star reviews in curtains: shoppers must translate "7 feet" into rod fit, panel width, and coverage. Infographics carrying measurements, rod-diameter fit, panel count, and blackout-level guidance answer these questions at a glance.

**Importance rationale.** Directly attacks the top complaint cluster found in our own review data; high return-prevention value.

**How to evaluate.**
- **Presence check:** does the gallery (or A+) include a measurement diagram, a how-to-measure guide, and a pack-contents graphic.
- **Category best practice:** the #1 competitor includes a "Blackout Color Shade Chart" educating shoppers that darker colors block more light — check for equivalent expectation-setting graphics on our listings.
- **Clarity analysis:** measurements in both cm and feet/inches, legible on mobile.
- **Review-informed coverage:** verify that infographics address confusions actually observed in reviews (panel length, set-of-2 meaning, eyelet diameter).

**Evidence in the datasets.** Our reviews: "ordered 7ft size, it is actually 6.5 ft", "The sizes of the curtains are not equal", confusion over per-panel vs per-set pricing.

---

### 2.6 Image Technical Quality — Importance: 7/10

**Why it matters.** Low-resolution, poorly lit, or over-compressed images read as low product quality regardless of the actual fabric. Zoom capability is a conversion feature — shoppers zoom to inspect weave and stitching before buying textiles.

**Importance rationale.** A hygiene threshold with real conversion effect but limited upside once the bar is met.

**How to evaluate.**
- **Technical measurement:** resolution of each image (the scrape exposes size markers such as `_SL1500_`), sharpness, exposure, compression artifacts.
- **Zoom eligibility:** all images meet the zoom threshold.
- **Visual comparison:** perceived production quality benchmarked against competitor galleries.

---

### 2.7 Color Fidelity — Importance: 8/10

**Why it matters.** Color mismatch is a leading cause of returns and negative reviews in home textiles. Because screens vary, best sellers manage expectations through accurate photography and shade charts rather than disclaimers.

**Importance rationale.** Category-specific but high-severity; a fidelity failure converts marketing success into a returns problem.

**How to evaluate.**
- **Cross-surface color consistency:** the declared color name (spec), the imagery, and the title/bullet color references must agree.
- **Review corroboration:** mine reviews for color-mismatch complaints ("colour you have sent…") as evidence of a fidelity gap.
- **Visual analysis:** consistency of color rendering across gallery images (studio vs lifestyle shots showing different shades is a red flag).

---

### 2.8 Product Video — Importance: 7/10

**Why it matters.** Video demonstrates drape, texture movement, opacity in real light, and installation — attributes photos cannot fully convey for textiles. Listings with video convert measurably better and occupy an engagement slot competitors may leave empty.

**Importance rationale.** Strong differentiator that is still not universal in this category, so it offers gap-closing *and* gap-creating potential.

**How to evaluate.**
- **Presence check (requires additional collection):** listing-level video was not captured in the current scrape and should be added to the evaluation dataset.
- **Content coverage:** where present, does the video demonstrate the flagship claim (blackout effect live), sizing, and installation.
- **Customer-video presence:** reviews with video (captured in the data: 0–6 per product) serve as a partial proxy and as authentic social proof.

---

### 2.9 Variant Imagery Coverage — Importance: 6/10

**Why it matters.** Every color/size variant is its own purchase decision; variants that reuse another color's photos create mistrust and misdelivery expectations.

**Importance rationale.** Moderate — matters in proportion to variant count, and failures surface as color/size complaints.

**How to evaluate.**
- **Per-variant audit:** each purchasable variant has its own accurate image set.
- **Consistency check:** identical image *structure* across variants (same shot types) with correct per-variant color.

---

## Pillar 3 — A+ / Enhanced Brand Content

### 3.1 A+ Content Presence — Importance: 8/10

**Why it matters.** A+ content replaces the plain description with rich visual modules, lifts conversion, reduces returns through better expectation-setting, and signals a serious brand. In this category it is table stakes: 8 of the 10 best sellers carry A+ modules.

**Importance rationale.** Binary presence gap with proven conversion impact; a missing A+ section is one of the clearest competitive deficits a listing can have.

**How to evaluate.**
- **Presence check per ASIN:** A+ images captured in the scrape make this directly measurable.
- **Competitive context:** presence rate among category leaders is the benchmark (80% here).

**Evidence in the datasets.** Competitors: 8/10 with A+ (3–13 modules). Ours: 4/5 with A+ (5–7 images); one product (B0F5MV2LFM) has none.

---

### 3.2 A+ Module Depth & Design Quality — Importance: 8/10

**Why it matters.** Thin or poorly designed A+ underperforms nearly as much as missing A+. Leaders use 10+ modules covering technology, benefits, and brand — visually consistent, mobile-legible, and professionally designed.

**Importance rationale.** The difference between minimal A+ and best-in-class A+ is a large share of below-the-fold persuasion.

**How to evaluate.**
- **Depth benchmarking:** module/image count vs. category leaders (top competitor carries 10–13 A+ images; ours carry 5–7).
- **Visual analysis required:** design quality, brand consistency, mobile legibility, information density of each module benchmarked against leaders.
- **Redundancy check:** A+ should add new information beyond the gallery, not repeat it.

---

### 3.3 A+ Topic & Feature-Story Coverage — Importance: 7/10

**Why it matters.** Best-seller A+ content is a structured education program: fabric technology (triple weave), room-darkening science, privacy, noise reduction, energy savings, color-shade guidance, and use-case theatres. Full topic coverage pre-answers objections and builds justified confidence in claims.

**Importance rationale.** Content breadth is what converts A+ from decoration into a selling machine.

**How to evaluate.**
- **Topic checklist benchmarking:** derive the union of themes covered by top-seller A+ (from A+ text blocks and images) and measure our coverage against it.
- **Claim-support check:** every flagship claim (blackout %, thermal, noise) should have a dedicated explanatory module.
- **AI semantic + visual understanding needed:** topics live inside images, so evaluation requires reading module imagery, not just text.

**Evidence in the datasets.** The #1 competitor's A+ text covers triple-weave technology, room-darkening, privacy, noise, energy savings, shade charts, and a theater-atmosphere use case (33 text blocks); three of our five products expose zero A+ text blocks.

---

### 3.4 A+ Text Layer (Alt-Text / Crawlable Copy) — Importance: 6/10

**Why it matters.** A+ modules built as pure images with no text layer are invisible to search indexing and accessibility tooling. Competitor A+ exposes rich crawlable text; ours mostly does not — a hidden SEO and completeness gap.

**Importance rationale.** Invisible to shoppers but real for discoverability; cheap to detect from the scraped `aplus_text_blocks`.

**How to evaluate.**
- **Text-layer presence:** measure extractable A+ text volume per listing vs. competitors.
- **Keyword value:** whether the text layer reinforces the keyword footprint (1.4).

**Evidence in the datasets.** Competitor A+ text blocks: up to 48 per listing. Ours: 0, 0, 0, 4 — three products with A+ imagery expose no text layer at all.

---

### 3.5 Brand Story Module — Importance: 6/10

**Why it matters.** A brand story ("Proudly based in India… Every Home Has A Story") humanizes a house brand, differentiates against commodity sellers, and supports premium pricing. It also occupies additional real estate on the detail page.

**Importance rationale.** Trust-builder with indirect conversion effect; more important for lesser-known distributed brands than for category giants.

**How to evaluate.**
- **Presence check** of the brand-story module per listing.
- **Narrative quality:** authenticity, values, manufacturing story, and consistency with the brand's other listings (semantic analysis).

**Evidence in the datasets.** The #1 competitor runs a brand story with taglines and origin narrative; no equivalent narrative text is detectable on our listings.

---

### 3.6 Comparison & Cross-Sell Charts — Importance: 6/10

**Why it matters.** Leaders embed comparison tables of their own product range ("Blackout Foil vs Blackout Digital vs Printed Cotton"), which keeps undecided shoppers inside the brand family instead of bouncing to competitors, and lifts basket value.

**Importance rationale.** A retention/expansion device rather than a first-order conversion driver.

**How to evaluate.**
- **Presence check:** does A+ include a range-comparison module.
- **Coverage:** does it link the shopper to the right variant for their need (size, opacity level, budget tiers).

**Evidence in the datasets.** Story@Home's A+ includes a "Curtain Comparison" section spanning three product lines; ours has none.

---

## Pillar 4 — Structured Specifications

### 4.1 Specification Completeness — Importance: 8/10

**Why it matters.** Structured attributes feed search filters, comparison widgets, and voice/AI shopping surfaces. Every empty field is a filter the product silently drops out of and a question the customer must answer elsewhere (often by leaving).

**Importance rationale.** Directly measurable, strongly differentiated in the data, and connected to both discoverability and conversion.

**How to evaluate.**
- **Field-count benchmarking:** compare populated spec keys per product against the category-leader norm (31–41 fields vs. our 29–36).
- **Union-coverage audit:** construct the union of fields populated by best sellers and flag each field missing on our listings — in this data: Fabric Type (9/10 competitors vs 2/5 ours), Fits Rod Size (8/10 vs 2/5), Model Name (10/10 vs 3/5), Occasion Type (8/10 vs 2/5), warranty description (2/10 vs 0/5), Closure Type (3/10 vs 0/5).
- **Value breadth:** fields like Room Type and Seasons should carry the full applicable value list, not a single value (competitor: five room types; ours: one).

---

### 4.2 Specification Accuracy & Internal Consistency — Importance: 8/10

**Why it matters.** Wrong spec values are worse than missing ones: they create returns (wrong material expectations), erode trust, and can contradict marketing copy elsewhere on the page.

**Importance rationale.** Accuracy failures found in our current data already contradict our own bullets, feeding the claim-consistency problem (1.7).

**How to evaluate.**
- **Spec-vs-copy reconciliation:** every spec value cross-checked against title/bullets/A+ semantically (material, opacity, lining, water resistance, GSM, weight).
- **Physical plausibility:** dimensions, weights, and unit counts sanity-checked against the product type.
- **Review corroboration:** reviews used as evidence where spec truthfulness is questioned (fabric feel vs declared material).

**Evidence in the datasets.** Ours declares Enclosure Material "Polyester" while bullets sell "quality faux linen"; declares Lining "Unlined" on a product marketed as blackout; the misfilled "Item Type Name" carries another market's copy.

---

### 4.3 Category-Critical Technical Attributes — Importance: 9/10

**Why it matters.** In curtains, a handful of technical attributes *are* the purchase decision: opacity percentage, fabric GSM/weight, lining type, weave, thermal/noise properties, and grommet specifications. These determine whether the product actually delivers its promise — and whether the listing can credibly make the promise at all.

**Importance rationale.** This is where listing quality meets product quality; the gap analysis must benchmark the declared *values*, not just field presence.

**How to evaluate.**
- **Value benchmarking vs. leaders:** compare declared opacity ("100%" vs vague "Blackout"), GSM (competitor bullets declare 300 GSM; one of ours declares 250 GSM), item weight per panel (760 g competitor vs 500 g ours — a proxy for fabric density customers describe as "thin"), lining ("blackout" vs "Unlined"), water resistance ("Waterproof" vs "Not Water Resistant").
- **Quantification quality:** numeric, verifiable values score higher than qualitative labels.
- **Review corroboration:** fabric-thinness and light-leakage complaints used as evidence that declared values overstate reality.
- **Feature-set breadth:** the Product Features field of leaders lists "Blackout, Grommets, Room Darkening, Thermal Insulated, Wrinkle Free" vs. ours "Washable" — compare feature vocabularies.

---

### 4.4 Dimensions & Size Data Quality — Importance: 8/10

**Why it matters.** Curtains are bought to fit an exact opening. Ambiguous or inconsistent size data (naming, unit mixing, per-panel vs per-set) produces the misfit returns visible in our reviews.

**Importance rationale.** High-severity, category-specific; the data shows it is an active failure mode for us.

**How to evaluate.**
- **Precision and consistency:** exact L×W present, size naming consistent across surfaces ("Door 7 Feet" vs "7FT" vs title feet), eyelet inner diameter and rod-fit declared.
- **Cross-surface agreement:** dimension in specs equals dimension in title, bullets, and infographics.
- **Review corroboration:** measured-size complaints ("actually 6.5 ft") treated as evidence of either data inaccuracy or manufacturing variance.

---

### 4.5 Package Contents & Unit Count Clarity — Importance: 6/10

**Why it matters.** "Set of 2" ambiguity (price per panel vs per set, what's included) is a recurring marketplace complaint pattern that produces instant 1-star reviews when expectations break.

**Importance rationale.** Narrow but sharp failure mode; cheap to evaluate.

**How to evaluate.**
- **Explicitness check:** pack count declared consistently in title, bullets, Included Components, Number of Items, and Unit Count.
- **Ambiguity detection:** flag surfaces where a shopper could reasonably read a different pack count or contents.

---

### 4.6 Care Instructions — Importance: 5/10

**Why it matters.** Clear care guidance prevents post-purchase product damage (and the resulting negative reviews), and detailed instructions signal product expertise.

**Importance rationale.** Post-purchase quality lever rather than a discovery/conversion lever.

**How to evaluate.**
- **Completeness and specificity:** compare against leader-level detail (competitor: remove eyelets before machine wash, cold water, no tumble dry; ours: "Machine Wash").
- **Consistency:** care text identical in spirit across bullets and specs.

---

### 4.7 Warranty & Guarantee Information — Importance: 6/10

**Why it matters.** A declared warranty converts hesitant buyers, justifies premium pricing, and pre-empts quality anxiety — particularly powerful when reviews mention quality doubts.

**Importance rationale.** Differentiating trust signal that is entirely absent from our listings today.

**How to evaluate.**
- **Presence check:** warranty fields populated (2/10 competitors declare a 6-month manufacturing warranty; 0/5 of ours declare any).
- **Clarity:** duration, coverage, and claim path stated plainly.

---

### 4.8 Compliance, Origin & Manufacturer Data — Importance: 7/10

**Why it matters.** Country of Origin, manufacturer/packer/importer identity and addresses are legally mandated for the India marketplace (Legal Metrology). Gaps risk listing suppression; complete data also feeds "Made in India" purchase preferences.

**Importance rationale.** Regulatory hygiene with suppression risk — a must-pass gate rather than an optimization.

**How to evaluate.**
- **Completeness gate:** all mandated fields present per marketplace policy (both datasets are largely complete here; ours lacks Importer fields where applicable).
- **Data quality:** contact strings well-formed, GST/address plausibility, consistency across manufacturer/packer fields.

---

### 4.9 Variant / Family Structure — Importance: 7/10

**Why it matters.** Demand in curtains is fragmented across sizes (window/door/long-door) and colors. Leaders capture the whole demand curve under one parent listing — aggregating reviews and BSR — while sparse variant families forfeit both sales and consolidated social proof.

**Importance rationale.** Structural driver of review accumulation and search coverage; competitor A+ actively sells across its own size range.

**How to evaluate.**
- **Breadth benchmarking:** count purchasable sizes/colors per product family vs. leaders (competitor copy references 8 sizes and Door | Window | Long Door ranges).
- **Structure quality (requires additional collection):** whether variants are correctly twinned under one parent vs scattered as standalone ASINs.
- **Per-variant listing parity:** each variant carries correct images, price, and specs.

---

## Pillar 5 — Price & Value

### 5.1 Price Positioning — Importance: 8/10

**Why it matters.** Price is evaluated by shoppers *relative* to the visible quality tier of the listing and the surrounding category price bands. A price that is out of band for its perceived tier suppresses conversion in both directions (too high = skipped; suspiciously low = distrusted).

**Importance rationale.** Major conversion lever, but only interpretable jointly with content and social-proof tiers — hence 8, not 10.

**How to evaluate.**
- **Band mapping:** place each product within the category's observed price distribution (best sellers: ₹231–₹1,539; ours: ₹250–₹1,170) normalized per panel and per size class.
- **Price-to-spec-tier coherence:** whether the price matches the declared GSM/material/feature tier vs. competitors at the same price point.
- **Value framing on the listing:** whether pack count and per-panel value are made explicit.

---

### 5.2 Perceived Value for Money — Importance: 7/10

**Why it matters.** The customer verdict on price-vs-quality lives in reviews ("value for money", "not worth buy") and directly forecasts rating trajectory and return rates.

**Importance rationale.** An implicit, review-derived signal that connects pricing to product reality.

**How to evaluate.**
- **Review sentiment mining:** extract value-for-money judgments per product and compare their polarity ratio against competitors at similar prices.
- **Expectation calibration:** whether the listing sets a price-appropriate expectation (premium copy on a budget product manufactures disappointment).

**Evidence in the datasets.** Our reviews split between "Better in low price / value for money" and "not worthy / Cheap quality"; the #1 competitor at 2× our price sustains "Good product at reasonable price".

---

### 5.3 Promotions, Deals & Coupons — Importance: 5/10

**Why it matters.** Coupons, deal badges, and strike-through pricing lift click-through and conversion, and deal participation drives review velocity.

**Importance rationale.** Tactical accelerant rather than structural quality; also volatile over time.

**How to evaluate.**
- **Presence tracking (requires additional collection):** deal/coupon state was not captured in the current scrape and should be observed longitudinally.
- **Competitive deal cadence:** how often leaders run promotions in the category.

---

## Pillar 6 — Ratings & Reviews

### 6.1 Average Star Rating — Importance: 9/10

**Why it matters.** The star rating is the most visible trust signal on both the search results page and the detail page; it also gates ad efficiency and badge eligibility. Sub-4.0 ratings measurably depress click-through in a category where every leader sits at 4.0–4.3.

**Importance rationale.** A compressed summary of true product-market quality with direct ranking and conversion consequences.

**How to evaluate.**
- **Benchmark vs. leader band:** compare each product's rating to the best-seller band (4.0–4.3) — ours span 3.8–4.4, with two products below 4.0.
- **Trend awareness:** rating direction over time (recent reviews vs lifetime) matters more than the static value.
- **Interpretation with volume:** a 4.4 on 42 reviews is statistically weaker evidence than a 4.1 on 8,867 — evaluate jointly with 6.2.

---

### 6.2 Review Volume — Importance: 9/10

**Why it matters.** Review count is social proof at scale: it dominates the perceived safety of a purchase and compounds — high-volume products win the click, which wins more reviews. The gap between ours (42–661) and leaders (up to 9,243) is the single largest numerical disparity in the dataset.

**Importance rationale.** Slow-moving but decisive competitive moat; must be measured to size the social-proof gap honestly.

**How to evaluate.**
- **Ratio benchmarking:** review count relative to the category leaders and relative to price-band peers.
- **Family aggregation:** volume evaluated at parent/variant-family level, since leaders aggregate reviews across variants (see 4.9).

---

### 6.3 Rating Distribution Shape — Importance: 7/10

**Why it matters.** Two products with identical averages can have very different risk profiles: a heavy 1-star tail signals systematic defects (sizing, damage) rather than taste variance, and 1-star reviews are disproportionately read.

**Importance rationale.** Diagnostic depth behind the average; identifies *fixable* systematic failures.

**How to evaluate.**
- **Tail analysis:** share of 1–2 star reviews vs competitor norms (note: the scrape caps 50 per star, so distribution must be interpreted from full-listing star breakdowns where available, using sampled text for diagnosis).
- **Severity classification:** whether low-star reviews cite product defects, listing mismatch, or logistics — each implies a different gap owner.

---

### 6.4 Review Recency & Velocity — Importance: 6/10

**Why it matters.** A stream of recent reviews signals live sales momentum to both shoppers ("people are buying this now") and ranking systems; stale review dates suggest a declining listing.

**Importance rationale.** Momentum indicator; useful for trend detection more than absolute quality.

**How to evaluate.**
- **Date-distribution comparison:** density of reviews in the last 30/90 days vs competitors (review dates are captured in both datasets).
- **Velocity-vs-age normalization:** newer ASINs should be judged on velocity, not cumulative volume.

---

### 6.5 Review Theme Mining (Praise & Complaint Clusters) — Importance: 9/10

**Why it matters.** Reviews are the only ground-truth record of the delivered product experience. Recurring complaint clusters identify exactly where product or listing reality breaks expectations; recurring praise clusters in *competitor* reviews reveal what the category's winning formula actually is (fabric feel, true blackout, easy hanging).

**Importance rationale.** The richest implicit signal in the entire dataset — it converts thousands of unstructured customer verdicts into a prioritized gap map.

**How to evaluate.**
- **AI semantic clustering required:** group review text into themes (blackout performance, fabric weight/feel, stitching quality, size accuracy, color accuracy, packaging, delivery, value) for our products and competitors separately.
- **Comparative theme balance:** theme-level sentiment ratio for us vs leaders (e.g., "thin fabric" frequency).
- **Emerging-issue detection:** new complaint themes in recent reviews.
- **Praise-theme benchmarking:** what leaders' customers celebrate that ours never mention.

**Evidence in the datasets.** Our complaint clusters already visible: unequal panel lengths, sub-claimed blackout, thin/transparent fabric, poor stitching, stained/crushed on arrival, rejected returns. Leader praise clusters: "complete blackout even in afternoon", premium fabric feel, effective heat blocking.

---

### 6.6 Review-vs-Claim Validation — Importance: 9/10

**Why it matters.** This attribute closes the loop between marketing and reality: for every flagship claim on the listing (blackout %, thermal insulation, material, size), reviews provide corroborating or contradicting evidence. Persistent contradiction is the most reliable predictor of rating decay and return-rate problems.

**Importance rationale.** Uniquely able to distinguish "listing gap" from "product gap" — the two require entirely different responses, so the framework must separate them.

**How to evaluate.**
- **Claim-evidence matrix:** map each major claim to supporting/contradicting review statements (AI semantic understanding required — customers phrase "blackout" as "blocks light", "room dark", "sunlight").
- **Corroboration scoring:** proportion of relevant reviews that confirm each claim, benchmarked against how strongly competitor claims are corroborated.
- **Directional diagnosis:** claims contradicted by reviews indicate either over-claiming (listing fix) or product deficiency (sourcing fix).

**Evidence in the datasets.** Competitor claim "100% blackout" is corroborated ("Complete blackout even in afternoon"); our claim "80-90% blackout" is contradicted by a cluster of reviews ("only block 20-40%", "not blackout curtains").

---

### 6.7 Customer Media in Reviews (Photos / Videos) — Importance: 6/10

**Why it matters.** Customer-submitted photos and videos are the most trusted content on the page — they show the product in real homes under real light. Their presence also indicates engaged, satisfied buyers.

**Importance rationale.** High-trust but not directly controllable; evaluated as an outcome signal and social-proof asset.

**How to evaluate.**
- **Volume comparison:** count of media-bearing reviews vs competitors (video flags captured: competitors 2–6 per product; ours 0–4, with two products at zero).
- **Content valence:** whether the visible customer media supports or undermines the listing's visual promise (visual analysis).

---

### 6.8 Review Credibility & Prominence Signals — Importance: 5/10

**Why it matters.** Verified-purchase share protects against authenticity suspicion, and the handful of most-helpful reviews are read by nearly every serious shopper — their content disproportionately shapes conversion.

**Importance rationale.** Hygiene plus a narrow high-visibility surface; rarely the primary gap.

**How to evaluate.**
- **Verified share:** verified ratio vs competitors (both datasets are nearly fully verified — parity today).
- **Top-review audit:** sentiment and topic of the highest-helpful-count reviews per product (helpful votes are captured), since these act as de-facto listing copy.

---

### 6.9 Q&A Section Coverage — Importance: 5/10

**Why it matters.** The Q&A section is where undecided shoppers resolve final objections; unanswered questions are abandoned purchases, and the questions themselves reveal what the listing failed to communicate.

**Importance rationale.** Secondary surface, but a cheap diagnostic of listing information gaps.

**How to evaluate.**
- **Coverage check (requires additional collection):** Q&A was not captured in the current scrape; the framework should include question count, answer rate, seller-answer presence, and recurring question topics.
- **Feedback loop:** recurring questions treated as evidence of gaps in bullets/images/specs (links to 10.2).

---

## Pillar 7 — Marketplace Performance Signals

### 7.1 Best Sellers Rank (BSR) — Importance: 8/10

**Why it matters.** BSR is the marketplace's own composite verdict on sales velocity — the outcome variable every other attribute ultimately feeds. Both the category sub-rank and the broader department rank contextualize how far each product sits from the winners' circle.

**Importance rationale.** Not an input to fix directly, but the essential benchmark axis for the whole analysis — gap severity should be read against BSR distance.

**How to evaluate.**
- **Positional benchmarking:** sub-category rank distance from the top-10 band (ours: #22, #254, #264, #411, #1,153 vs leaders #1–#10).
- **Trend tracking:** BSR trajectory over repeated scrapes matters more than a snapshot.
- **Peer-normalized reading:** interpret BSR jointly with price band and product age.

---

### 7.2 Badges (Best Seller / Amazon's Choice / Deals) — Importance: 7/10

**Why it matters.** Badges are marketplace-endorsed trust marks rendered directly in search results; they materially lift click-through and are self-reinforcing.

**Importance rationale.** High visibility, but earned through other attributes — evaluated as a status indicator and gap symptom.

**How to evaluate.**
- **Presence tracking (requires additional collection):** badge state per ASIN and per key search term was not captured in the current scrape.
- **Eligibility diagnosis:** which badge prerequisites (rating floor, price competitiveness, availability) each product currently fails.

---

### 7.3 Organic Search Visibility — Importance: 8/10

**Why it matters.** Most category demand flows through a handful of head search terms; position on those result pages *is* the demand share. A listing can be excellent and still invisible.

**Importance rationale.** The most direct discoverability outcome measure; ties the keyword footprint (1.4) to reality.

**How to evaluate.**
- **Share-of-shelf measurement (requires additional collection):** rank position of our ASINs vs competitors for the category's head and mid-tail terms ("blackout curtains", "door curtains 7 feet", "curtains for living room").
- **Coverage breadth:** number of relevant terms where each product appears at all, benchmarked against leaders.

---

### 7.4 Advertising Presence — Importance: 5/10

**Why it matters.** Sponsored placements shape the effective shelf; competitors' ad aggressiveness determines how much organic quality alone can achieve, and ad-driven traffic accelerates review accumulation.

**Importance rationale.** Context for interpreting performance gaps rather than a listing-quality attribute itself.

**How to evaluate.**
- **Competitive ad observation (requires additional collection):** sponsored-slot occupancy by competitors on category head terms, and whether our products appear.

---

## Pillar 8 — Trust, Fulfillment & Post-Purchase

### 8.1 Fulfillment Channel & Prime Eligibility — Importance: 8/10

**Why it matters.** The Prime badge is one of the strongest conversion levers on amazon.in — it bundles delivery speed, returns confidence, and platform trust into a single mark shown at the point of decision.

**Importance rationale.** Large, well-documented conversion effect; a channel-level gap invalidates content-level comparisons.

**How to evaluate.**
- **Parity check (requires additional collection):** Prime/FBA status per ASIN vs competitors was not captured in the current scrape and must be part of the framework.

---

### 8.2 Delivery Promise — Importance: 6/10

**Why it matters.** The displayed delivery date competes directly with rivals shown side-by-side; slower promises lose time-sensitive purchases (festivals, guests, moving-in dates — all gifting occasions this category serves).

**Importance rationale.** Meaningful conversion factor, partially subsumed by 8.1.

**How to evaluate.**
- **Comparative speed observation (requires additional collection):** promised delivery window vs competitors across representative pincodes.

---

### 8.3 Stock Availability & Continuity — Importance: 7/10

**Why it matters.** Out-of-stock events destroy accumulated search rank and BSR, and unavailable variants leak demand to competitors permanently. Continuity is a prerequisite for every other investment to compound.

**Importance rationale.** Binary killer when it fails; invisible when healthy.

**How to evaluate.**
- **Longitudinal tracking (requires additional collection):** in-stock state per variant across repeated observations; frequency and duration of stockouts vs competitors.

---

### 8.4 Returns & Refund Experience Signals — Importance: 6/10

**Why it matters.** Return friction shows up in reviews and poisons trust beyond the individual transaction ("my return was rejected" is a warning to every future reader). Return policy clarity also affects purchase confidence for textiles bought sight-unseen.

**Importance rationale.** Post-purchase trust factor with visible review evidence in our data.

**How to evaluate.**
- **Review mining:** frequency and sentiment of returns/refund mentions in our reviews vs competitors.
- **Policy display check:** whether the listing communicates return eligibility clearly.

**Evidence in the datasets.** Our reviews include "The quality is not great and my return was rejected" — a compound quality-plus-trust failure competitors' sampled reviews do not show.

---

### 8.5 Seller Reputation — Importance: 5/10

**Why it matters.** The "Sold by" entity's rating and history feed buyer confidence, feature eligibility, and account health; a weak seller score undermines strong listings.

**Importance rationale.** Background trust factor, rarely the decisive gap.

**How to evaluate.**
- **Reputation comparison (requires additional collection):** seller rating, rating count, and seller-page signals vs the sellers behind category leaders.

---

### 8.6 Packaging & Arrival Condition Signals — Importance: 6/10

**Why it matters.** For textiles, arrival condition is the first physical brand touchpoint. Products arriving crushed, wrinkled, or stained generate immediate negative reviews regardless of intrinsic quality, and packaging failures are systematic (they repeat on every unit).

**Importance rationale.** A repeating, fixable failure mode with direct review evidence in our data.

**How to evaluate.**
- **Review mining:** cluster arrival-condition complaints (damage, stains, wrinkles, used appearance) for us vs competitors.
- **Packaging data sanity:** declared package weight vs item weight as a rough proxy for protective packaging investment.

**Evidence in the datasets.** Our reviews: "All curtains were very crushed. Looked to be very old", "it was stained", "Damage items", "I received damaged product".

---

## Pillar 9 — Brand & Differentiation

### 9.1 Brand Store Presence & Depth — Importance: 6/10

**Why it matters.** A brand store ("Visit the Cortina Store") aggregates the catalog, captures cross-shopping demand, enables brand-level advertising, and signals legitimacy versus anonymous sellers.

**Importance rationale.** Ecosystem asset whose value scales with portfolio size; presence is table stakes, depth is the differentiator.

**How to evaluate.**
- **Presence parity:** all 15 products in both datasets carry a store link — presence is at parity.
- **Depth and quality (requires additional collection):** store page richness, navigation, content quality vs competitor stores.

---

### 9.2 Brand Consistency Across Surfaces — Importance: 6/10

**Why it matters.** Inconsistent brand naming, tone, or visual identity across the title, specs, A+ and store fragments brand recall and looks like a reseller operation rather than a brand — undermining the premium the brand exists to create.

**Importance rationale.** Foundational brand hygiene; failures are cheap to detect and quietly corrosive.

**How to evaluate.**
- **Cross-surface identity audit:** brand spelling, logo usage, tone-of-voice, and design language consistency across every listing surface and across the brand's ASINs (semantic + visual analysis).
- **Copy provenance check:** detect copy blocks borrowed from other markets or sellers that break brand voice.

**Evidence in the datasets.** "Cortina" appears as "Corttina" in a spec field; one spec field carries US-market seasonal copy ("Fall Decor") unrelated to the India listing.

---

### 9.3 Differentiation & USP Clarity — Importance: 7/10

**Why it matters.** In a category where every listing claims "blackout" and "thermal insulated", the winning listings still manage to communicate a distinct reason-to-buy (true 100% blackout, embossed premium texture, sheer linen aesthetic). Generic template copy makes a product interchangeable — and interchangeable products compete on price alone.

**Importance rationale.** Determines whether the listing can ever command margin; a strategic attribute beyond hygiene.

**How to evaluate.**
- **Semantic uniqueness analysis:** how much of our listing copy is distinguishable from generic category boilerplate vs competitors' copy (AI semantic comparison).
- **USP identifiability:** can a distinct primary selling proposition be extracted from each listing at all, and is it substantiated by specs and images.
- **Positioning coherence:** the USP should be consistent across title, hero image, bullets and A+.

---

### 9.4 Portfolio Breadth Within Category — Importance: 6/10

**Why it matters.** Leaders present a coherent range across opacity levels, sizes, and styles, capturing the shopper whatever their need — and cross-selling between their own listings. A narrow or incoherent range leaks every non-matching shopper to competitors.

**Importance rationale.** Category-strategy signal that frames per-ASIN findings.

**How to evaluate.**
- **Range mapping:** sizes, opacities, materials, and styles covered by our brand in the category vs the ranges of the leading brands.
- **Coverage-vs-demand check:** whether our range covers the highest-demand size/color nodes observable from best-seller composition.

---

## Pillar 10 — Cross-Cutting & Implicit Signals

### 10.1 Customer-Language Alignment — Importance: 7/10

**Why it matters.** Customers search with the words they think in; reviews are the richest source of that vocabulary ("blocks sunlight", "room cool", "thick curtains", "hostel"). Listings written in customer language rank for real queries and feel instantly relevant; listings written in manufacturer language do neither.

**Importance rationale.** Bridges SEO and conversion; entirely derivable from data already collected.

**How to evaluate.**
- **Vocabulary-gap analysis (AI semantic):** compare the term distribution of category reviews (ours + competitors) against the vocabulary of our listing copy, surfacing high-frequency customer terms absent from our listings.
- **Use-case echo check:** whether real usage contexts from reviews (hostels, late sleepers, summer heat, baby rooms) are reflected in the listing's copy and imagery.

---

### 10.2 Unaddressed Purchase Objections — Importance: 6/10

**Why it matters.** Every recurring pre-purchase doubt that the listing fails to answer (Will the panels match in length? How dark is 80%? Will grey look this dark at home?) becomes either an abandoned purchase or a disappointed buyer. Reviews and Q&A reveal these doubts explicitly.

**Importance rationale.** Connects review intelligence back to content completeness; a listing-level diagnostic.

**How to evaluate.**
- **Objection extraction:** mine our and competitors' reviews (and Q&A once collected) for recurring doubts and confusions.
- **Coverage cross-check:** verify whether each recurring objection is answered anywhere on our listing (bullets, images, A+, specs) — unanswered objections are content gaps ranked by frequency.

---

### 10.3 Mobile Presentation Quality — Importance: 6/10

**Why it matters.** The majority of amazon.in traffic is mobile, where titles truncate around 70–80 characters, long bullets collapse, and A+ modules render single-column. A listing optimized only for desktop silently underperforms for most real shoppers.

**Importance rationale.** A rendering lens over existing content rather than new content — but one that changes what "good" means for 1.1, 1.2 and 3.2.

**How to evaluate.**
- **Truncation audit:** whether the first ~75 characters of the title carry the complete core message (brand, product, size, key benefit).
- **Bullet front-loading:** whether each bullet's first clause carries its payload.
- **A+ legibility:** whether A+ module text remains readable at mobile scale (visual analysis).

---

### 10.4 Localization & Cultural Fit — Importance: 6/10

**Why it matters.** The India marketplace rewards listings that speak to local realities: vernacular search terms ("parda"), local room types ("pooja room"), festival gifting (Diwali, weddings), climate framing (summer heat, monsoon). Best sellers lean into all of these; imported copy misses them and occasionally contradicts them.

**Importance rationale.** Market-fit multiplier on the entire text and visual layer; clearly separates the #1 seller's copy from generic exporter templates.

**How to evaluate.**
- **Local-signal checklist:** presence of vernacular keywords, local occasions, local room types, and climate-relevant benefits across title/bullets/A+ vs the best-seller standard.
- **Foreign-artifact detection:** flag copy oriented to other markets (seasons, color trends, holidays that don't apply).
- **Visual localization:** whether lifestyle imagery depicts homes the target customer recognizes (visual analysis).

**Evidence in the datasets.** The #1 competitor's copy spans "parda", "pooja room", Diwali/wedding gifting, and summer/winter insulation; our specs carry leftover US "Fall Decor" copy.

---

### 10.5 Content Freshness — Importance: 4/10

**Why it matters.** Stale listings accumulate drift: discontinued claims, outdated occasion references, old design language, and un-refreshed A+ while competitors iterate. Freshness also correlates with active catalog management overall.

**Importance rationale.** Supporting signal — meaningful mainly as a symptom of neglect rather than a direct lever.

**How to evaluate.**
- **Change tracking:** listing content diffs across repeated scrapes (the `scraped_at` field enables longitudinal comparison).
- **Staleness markers:** seasonal/occasion references that have lapsed; claims superseded elsewhere on the page.

---

## Appendix A — Signal Availability in the Current Datasets

The framework above deliberately covers the full evaluation space. The current scrape already supports most of it; the remainder defines the data-collection scope for the engine.

**Fully evaluable from data already collected:**
titles, bullets, descriptions, structured specs, prices, ratings, review counts, review text/dates/verified/video/helpful votes, gallery image URLs and counts, A+ image URLs and text blocks, BSR, brand strings, category placement, scrape timestamps.

**Requires visual analysis of already-collected image URLs:**
hero image quality (2.1), image type mix (2.3), lifestyle quality (2.4), infographic presence (2.5), technical quality (2.6), color fidelity (2.7), variant imagery (2.9), A+ design quality (3.2), A+ topic coverage in imagery (3.3), mobile legibility (10.3), visual localization (10.4).

**Requires additional collection to evaluate:**
listing videos (2.8), Q&A section (6.9), badges (7.2), organic search positions (7.3), ad presence (7.4), Prime/fulfillment status (8.1), delivery promise (8.2), stock continuity (8.3), seller reputation (8.5), brand store depth (9.1), variant family structure (4.9 — parent/child relationships), promotions state (5.3).

## Appendix B — Reading Weights at Evaluation Time

Weights express an attribute's influence on listing quality, not the size of our current gap on it. A product can score well on a weight-10 attribute (no gap) while failing a weight-6 attribute badly (large gap); the eventual gap analysis should surface both the attribute weight and the measured gap magnitude side by side. Attributes that act as **gates** (category placement 1.6, compliance 4.8, stock availability 8.3) should be treated as pass/fail prerequisites regardless of numeric weight, because failing them nullifies performance on everything else.
