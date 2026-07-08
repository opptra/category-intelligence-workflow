# Catalog Intelligence Framework

**Category:** Curtains & Drapes · **Marketplace:** Amazon.in

## Purpose

This document is **not** a gap analysis and **not** a product comparison. It is a catalog-building playbook.

We have two datasets:

- `curtains-drapes-product-details.json` — top-performing marketplace listings (best-sellers), fully scraped: titles, bullets, descriptions, product images, A+ images, A+ text blocks, structured specs, prices, ratings, and up to ~250 reviews per product with star distributions.
- `our-products-product-details.json` — our own catalog for the same category, scraped in the identical shape.

The goal here is to enumerate **every attribute, signal, and derivable insight** present (or latent) in this data that can be used to build the most complete, trustworthy, and conversion-optimized listing possible — and to explain, for each one, *why it matters*, *how valuable it is (1–10)*, *how to leverage it*, and *a concrete example* drawn from the actual data.

Think of the top-performer dataset as a **teacher**: it shows what winning listings look like. Think of the review corpus as a **focus group of thousands**: it shows what customers actually feel, ask, and worry about. This framework turns both into catalog content.

### How the weights work

Weight = **how valuable this attribute is for building a high-quality catalog** (not how big our current gap is). Scale:

- **9–10** — Decisive. Directly drives discoverability, click-through, or the purchase decision. A listing is not competitive without it.
- **7–8** — High. Materially lifts trust, conversion, or search coverage.
- **5–6** — Moderate. Rounds out quality, reduces returns, or reduces uncertainty.
- **3–4** — Supporting. Marginal but cumulative polish.

### The pillars

1. Search & Textual Content
2. Visual Content
3. A+ / Enhanced Brand Content
4. Structured Specifications
5. Price & Value
6. Ratings & Reviews (the voice-of-customer engine)
7. Marketplace Performance Signals
8. Derived & Cross-Cutting Intelligence

---

## Pillar 1 — Search & Textual Content

### 1.1 Product Title

**Why it matters.** The title is the single biggest driver of both *discoverability* (it is the most heavily indexed field) and *click-through* (it is what a shopper reads first in search results). It has to earn the click and the ranking in the same ~150 characters, and on mobile only the first ~75 characters are visible before truncation.

**Importance: 10.** Nothing else can rescue a title that fails to index for the right terms or fails to communicate the core value in one line. It gates traffic before any other attribute is even seen.

**How to leverage.** Study how top performers *structure* their titles and reverse-engineer the recurring template. Across the leader set the pattern is consistent: `Brand + Opacity/Performance + Product Type + Size/Length + Pack + Key Features + (Dimensions, Color)`. Extract the token order, the attributes that appear in *every* winning title (opacity %, size in feet, "Set of 2", material, room), and the front-loaded keywords. Build our titles from this learned template rather than inventing structure.

**Example.** A top listing reads: *"Story@Home 100% True Blackout Door Curtains 7 Feet Long Set of 2 | Plain Design | Room Darkening Curtain | Thermal Insulated Curtains for Living Room, Bedroom | (116 x 215 cm, Beige)"*. From this we learn a title should pack, in order: brand → opacity claim → type → length → pack → design → benefit → room → metric dimensions → color. That template applied to our own SKUs immediately raises keyword coverage and scannability.

---

### 1.2 Feature Bullets

**Why it matters.** Bullets are the primary conversion copy above the fold on desktop and the first text block on mobile. They convert browsing into buying by translating specs into benefits, and they carry a large share of long-tail keywords.

**Importance: 9.** After the title and hero image, bullets do the most persuasion work per pixel.

**How to leverage.** Mine the leaders' bullets to learn (a) how many bullets they use and how long each is, (b) which *topics* recur across nearly every listing — light-blocking, thermal insulation, privacy, noise reduction, easy installation, care, versatility of rooms — and (c) the benefit-framing formula (`CAPITALIZED HOOK: spec → what it does for you`). Assemble a canonical topic checklist from the corpus and ensure each of our bullets leads with a benefit, then substantiates with a spec.

**Example.** Leaders consistently open bullets with a labeled hook — *"BLACKOUT CURTAINS: Thermal insulated blackout curtains could block ... to darken your room completely. Suitable for late sleepers, shift workers, seniors, infants..."*. The pattern (hook → mechanism → who benefits) and the persona list ("shift workers, students, night-shift, infants") are reusable across our catalog to widen relevance.

---

### 1.3 Product Description (long-form)

**Why it matters.** When A+ content is absent or fails to render, the description becomes the fallback long-form narrative. It is also indexed, so it adds keyword surface and can house detail that would clutter bullets.

**Importance: 5.** Valuable but conditional — its weight rises when A+ is missing and falls when rich A+ exists. Most fields in the data show `description: null`, which is itself a signal that leaders lean on A+ instead; where they do write one, it is detailed.

**How to leverage.** Use the descriptions that *do* exist to learn how to narrate size ranges, use-cases, and reassurances in flowing prose. Ensure the description adds information beyond the bullets (e.g., the full size ladder, fabric behavior on washing) rather than repeating them.

**Example.** One listing's description enumerates the full size ladder — *"It offers various sizes such as 5 feet, 6 feet, 7 feet, 8 feet, 9 feet ... will not shrink on washing, color fastness is good, hangs nicely with enough folds"* — teaching us to use the description to pre-empt fit and shrinkage concerns that bullets don't have room for.

---

### 1.4 Keyword & Search-Term Footprint (SEO)

**Why it matters.** You cannot convert on a search you never appear in. The union of terms a shopper might type — synonyms, vernacular, occasions, use-cases, room types — defines the top of the funnel. Every relevant term missing from our text is demand we forfeit.

**Importance: 9.** Discoverability is upstream of everything; broad, accurate keyword coverage compounds across the catalog.

**How to leverage.** Aggregate the vocabulary across all leader titles, bullets, descriptions, A+ text, and spec values to build a category keyword map. Overlay the *customer* vocabulary harvested from reviews (see 6.5). Weave the high-frequency terms naturally into title, bullets, and description — covering English, Hinglish/vernacular, occasion, and use-case clusters — without stuffing.

**Example.** Leader copy naturally folds in a huge synonym cloud: *"parda", "door parda", "blackout curtain 7 feet", "room darkening", "pooja room curtains", "home decor items", "backdrop curtain for decoration"*. Harvesting this cloud tells us exactly which phrases to include so our SKUs surface for the same head and long-tail queries.

---

### 1.5 Vernacular & Localized Language

**Why it matters.** On Amazon.in, shoppers search and reason in a blend of English and local terms. Listings that speak the local language rank for local queries and *feel* made-for-this-market, which builds trust.

**Importance: 7.** A distinct, high-leverage discoverability and resonance lever specific to this marketplace.

**How to leverage.** Extract the recurring local terms and cultural framings from leader copy and reviews and treat them as first-class keywords and copy elements — used where natural, not bolted on.

**Example.** Leaders use *"parda"*, *"pooja room"*, and gifting occasions like *"Diwali, new year, weddings, baby showers"*. Incorporating these into our bullets and back-end terms captures vernacular search demand and signals local relevance that generic imported copy misses.

---

### 1.6 Occasion & Use-Case Framing

**Why it matters.** Curtains are bought for specific rooms, seasons, and moments (festival gifting, new home, summer heat). Explicitly naming these expands the set of intents a listing satisfies and helps a shopper self-identify ("this is for *my* situation").

**Importance: 6.** Multiplies relevance and gives merchandising hooks for seasonal/festival campaigns.

**How to leverage.** Catalog the room types, seasons, and occasions leaders repeatedly attach to products, and map each of our SKUs to the full applicable set in copy and structured tags.

**Example.** Leaders tag products for *"Living Room, Bedroom, Kids Room, Pooja Room, TV Room"* and seasons *"Summer, Winter, Monsoon, All Season"*, plus gifting occasions. Applying the complete relevant set to our SKUs widens both search coverage and emotional fit.

---

### 1.7 Brand Signaling in Copy

**Why it matters.** A coherent brand name and store presence across title, "brand" field, and A+ makes a house brand read as a *brand* rather than an anonymous reseller — which supports premium pricing and repeat purchase.

**Importance: 6.** Trust and differentiation multiplier that also enables cross-selling within the brand family.

**How to leverage.** Ensure brand naming is consistent everywhere and study how leaders reinforce brand identity in copy (store link, brand story, tagline) so ours does the same.

**Example.** A leader threads its identity through a tagline in A+ — *"Every Home Has A Story. Tell Yours In Style!"* — and a consistent "Visit the Story@Home Store" link, modeling how to make a house brand feel established.

---

## Pillar 2 — Visual Content

### 2.1 Main / Hero Image

**Why it matters.** The hero is the largest single driver of click-through from the search grid. It competes head-to-head with every rival thumbnail simultaneously, and it sets the first impression of product quality.

**Importance: 10.** It is the visual equivalent of the title — it wins or loses the click before anything else is read.

**How to leverage.** Study the hero images across top listings to learn the winning conventions: crisp product-on-white or lightly styled framing, the panel shown full-length with folds, true-to-life color, and high resolution. Codify these characteristics as our hero-image standard.

**Example.** Leaders present a clean, high-resolution `_SL1500_` hero of the draped panel showing fabric fall and color accurately. Matching that composition and resolution (≥1500px, color-true, folds visible) lifts our thumbnails to the same click-through tier.

---

### 2.2 Image Count & Slot Utilization

**Why it matters.** Every gallery slot is free selling space and another chance to answer an objection visually. Underusing slots leaves persuasion on the table.

**Importance: 8.** More (relevant, non-duplicate) images correlates with richer, higher-converting listings.

**How to leverage.** Measure the typical gallery depth of leaders and the *purpose* each slot serves, then ensure our SKUs fill the same number of slots with distinct, purposeful shots rather than near-duplicates.

**Example.** A top listing carries 16 product images spanning hero, lifestyle, texture, size diagram, and feature callouts, versus a thinner gallery elsewhere. Learning that ~12–16 purposeful slots is the norm sets our photography brief's minimum shot count.

---

### 2.3 Image Type Mix (the visual argument)

**Why it matters.** A great gallery is a structured argument: hero → lifestyle → texture → performance demo → size/fit → callouts. The *mix*, not just the count, is what carries a shopper from interest to confidence.

**Importance: 9.** The composition of the gallery mirrors the buyer's decision journey; getting the mix right pre-answers most questions.

**How to leverage.** Classify every leader image by role and learn which roles appear in nearly every winning gallery. Treat that role list as a mandatory shot list for our photography.

**Example.** Across leaders the recurring roles are: draped hero, room lifestyle scene, macro fabric texture, blackout before/after demonstration, grommet/hardware close-up, and a measurement diagram. That classification becomes our required-shots checklist per SKU.

---

### 2.4 Lifestyle Imagery

**Why it matters.** Home décor is bought as a *room*, not as a piece of fabric. Lifestyle shots let a shopper imagine the product in their own space, which drives emotional conversion.

**Importance: 8.** For a décor category, staged context is among the strongest conversion levers.

**How to leverage.** Learn the scenes leaders stage (living room, bedroom, large windows, TV/theater room) and the styling quality, and plan photography that recreates the most effective, locally relatable settings.

**Example.** Winning listings consistently show curtains framing bright living-room and bedroom windows with cozy styling; some emphasize "cozy theater atmosphere." Our shoot plan should include these exact room contexts, staged for Indian homes.

---

### 2.5 Infographic & Feature-Callout Images

**Why it matters.** Text-in-image callouts communicate benefits instantly and survive skim-reading. They pack the flagship claims (blackout %, thermal, noise, privacy) into digestible visual chunks.

**Importance: 8.** Converts specs into at-a-glance selling points and works even for shoppers who never read the bullets.

**How to leverage.** Extract the claims leaders choose to visualize and how they label them, then build equivalent callout graphics for our top claims.

**Example.** Leaders render callouts for *"SMOOTH SILK LIKE FABRIC", "TRIPLE WEAVE TECHNOLOGY", "NOISE REDUCTION", "ENERGY SAVERS"*. Producing our own labeled callouts for the same benefit set brings our gallery to visual parity.

---

### 2.6 Size / Measurement Guide Images

**Why it matters.** Size confusion is the number-one cause of returns and 1-star reviews in this category. A clear measurement diagram (panel dimensions, rod-pocket/grommet fit, feet-vs-cm) prevents mis-purchases.

**Importance: 8.** Directly reduces returns and negative reviews driven by fit surprises.

**How to leverage.** Study how leaders diagram dimensions and rod compatibility and create an unambiguous size graphic showing panel W×H, pack contents, and how to measure the window/door.

**Example.** Leaders convert `Item Dimensions 2.15L x 1.16W Meters` / `46 x 84 inches` into a visual with both units and a "how to measure" guide — a template we should replicate so buyers order the right length the first time.

---

### 2.7 Fabric Texture / Close-Up Images

**Why it matters.** Shoppers cannot touch the fabric, so a macro shot is the proxy for perceived quality — it communicates weight, weave, sheen, and premium-ness.

**Importance: 7.** Strong quality signal that also pre-empts "thin/flimsy fabric" complaints.

**How to leverage.** Learn how leaders shoot texture (raking light, close crop showing weave density) and add a comparable macro to every SKU, especially where reviews mention fabric feel.

**Example.** Listings pairing a *"silky, soft, thick faux silk"* claim with a macro texture shot make the premium claim credible; we should shoot texture that visibly backs our fabric descriptors.

---

### 2.8 Performance Demonstration Images (blackout/thermal)

**Why it matters.** The flagship claim of this category — light blocking — is best proven, not stated. A before/after or day-lit-room demonstration is the most persuasive single asset.

**Importance: 8.** It converts the primary purchase driver from a claim into visible proof.

**How to leverage.** Study how leaders demonstrate opacity visually and produce an honest, side-by-side blackout demo that matches the exact percentage we claim (see claim-consistency, 6.7).

**Example.** Reviews repeatedly discuss "complete blackout even in afternoon" vs. "only blocks 20–40%." A truthful blackout demo image calibrated to our real opacity both sells the benefit and prevents the mismatch that generates 1-star reviews.

---

### 2.9 Color / Variant Swatch Imagery

**Why it matters.** Color is a top selection and top return driver. Each color variant is its own decision and needs its own accurate imagery; a swatch chart helps shoppers choose confidently.

**Importance: 7.** Prevents color-mismatch returns and supports variant discovery.

**How to leverage.** Learn how leaders present color ranges (swatch charts, per-variant hero) and ensure each of our variants has true-color imagery plus a range swatch.

**Example.** A leader includes a *"BLACKOUT COLOR SHADE CHART"* explaining that darker shades block more light — doubling as both a color picker and an expectation-setter. Replicating this reduces "color looked different" complaints.

---

### 2.10 Image Technical Quality

**Why it matters.** Low-resolution, poorly lit, or soft images read as a low-quality *product*, regardless of the actual item. Zoom eligibility (≥1000px) is also a conversion feature.

**Importance: 7.** A hygiene factor that silently caps perceived quality and conversion.

**How to leverage.** Adopt the leaders' resolution and lighting standard (the `_SL1500_` 1500px norm) as a hard minimum and audit every asset against it.

**Example.** Leader galleries are uniformly 1500px, zoom-eligible, and evenly lit; setting that as our floor ensures our images never look second-tier next to them in the grid or on the detail page.

---

### 2.11 Product Video

**Why it matters.** Video shows drape, movement, sheen, and opacity in ways still images cannot, and it occupies a prominent, high-engagement gallery slot.

**Importance: 7.** A differentiating, high-trust asset that few mid-tier listings invest in.

**How to leverage.** Note where leaders use video and plan short clips that demonstrate the flagship claim (light-blocking) and the fabric in motion; source authentic customer video from reviews where available.

**Example.** Some reviews are flagged `has_video: true`, proving customers already film these products in use — that footage (and our own studio clip) can populate the video slot and demonstrate real-world drape and blackout.

---

## Pillar 3 — A+ / Enhanced Brand Content

### 3.1 A+ Presence

**Why it matters.** A+ content is table stakes among leaders and materially lifts conversion. Its absence makes a listing look thin and unbranded next to competitors.

**Importance: 8.** Expected by shoppers in this category and a proven conversion lifter.

**How to leverage.** Confirm every SKU carries A+ and use the leader set to define what "complete" A+ looks like (module count, topic coverage) as our baseline.

**Example.** Nearly every top listing exposes a full A+ module stack (`aplus_images` + `aplus_text_blocks`), while thinner listings expose none — establishing A+ as a required, not optional, catalog element.

---

### 3.2 A+ Module Depth & Design

**Why it matters.** Thin A+ (one banner) is nearly as weak as none. Depth — multiple well-designed modules — is what actually educates and reassures.

**Importance: 8.** The richness of A+, not mere presence, drives its conversion impact.

**How to leverage.** Count and classify leader A+ modules to learn the norm and the design conventions (comparison tables, feature grids, lifestyle banners), then match that depth.

**Example.** A leader ships ~10 A+ image modules plus dozens of text blocks covering fabric, weave, darkening, privacy, noise, energy savings, and a comparison chart — a blueprint for the module set our A+ should contain.

---

### 3.3 A+ Topic Coverage

**Why it matters.** A+ is the place to pre-answer objections and substantiate every claim with a dedicated visual module. Comprehensive topic coverage removes doubt at the decision point.

**Importance: 7.** Turns the biggest objections into resolved questions before checkout.

**How to leverage.** Build a topic checklist from the union of leader A+ modules and ensure each of our flagship claims has its own explanatory module.

**Example.** The recurring A+ topic set — *smooth fabric, triple weave, room darkening, color shade chart, privacy, noise reduction, theater atmosphere, energy savings, why-choose-us* — becomes our A+ content outline.

---

### 3.4 A+ Text Layer

**Why it matters.** Image-only A+ is invisible to on-page text extraction and to some accessibility/search paths. The extractable text layer (headings + body) adds crawlable, skimmable substance.

**Importance: 6.** Boosts both accessibility and the informational density of A+.

**How to leverage.** Learn from leaders that expose rich `aplus_text_blocks` how to pair every A+ visual with a heading and a substantive sentence, and ensure our A+ carries real text, not just baked-in graphics.

**Example.** A leader's `aplus_text_blocks` include full explanatory copy like *"TRIPLE WEAVE TECHNOLOGY — Blackout curtains are interwoven by top fabric layer, high density black yarn and back fabric layer ... blocks 85 to 99 percent sunlight."* Mirroring this heading+body pattern makes our A+ both readable and extractable.

---

### 3.5 Brand Story Module

**Why it matters.** A brand story humanizes a house brand, justifies premium pricing, and builds the emotional trust that specs alone don't.

**Importance: 6.** Differentiation and trust lever, especially for own-label brands.

**How to leverage.** Study the narrative arc leaders use (origin, craftsmanship, values, tagline) and craft an authentic equivalent for our brand.

**Example.** A leader opens A+ with *"Proudly based in India ... precise craftsmanship with modern designs ... commitment to quality, comfort & style"* — a concise origin-plus-values template we can adapt.

---

### 3.6 Comparison / Cross-Sell Module

**Why it matters.** An in-A+ comparison keeps shoppers *inside* the brand family instead of clicking away, and helps them self-select the right variant.

**Importance: 6.** Captures the demand curve and reduces leakage to competitors.

**How to leverage.** Learn how leaders structure range comparisons (opacity tiers, fabric types, sizes) and add a module that guides shoppers to the right SKU in our own range.

**Example.** A leader includes a *"Story@Home Curtain Comparison"* across Blackout Foil, Blackout Digital, and Printed Cotton — a model for showcasing our own range and cross-selling adjacent SKUs.

---

## Pillar 4 — Structured Specifications

Structured specs power search filters, comparison tables, and the "Product information" block. Empty fields drop us out of filtered results; wrong values drive returns. The leader corpus reveals which fields are *expected* and what *values* are typical.

### 4.1 Specification Completeness

**Why it matters.** Each populated spec field is both a filter you can be found through and a question you've pre-answered. Blank fields silently remove the product from faceted search.

**Importance: 8.** Breadth of structured data widens discoverability and comparison presence.

**How to leverage.** Build the *union* of all spec keys used across leaders and treat it as the target schema; populate every applicable field for every SKU.

**Example.** The leader union includes ~40 keys — Opacity, Fabric Type, Weave Type, Lining Description, Water Resistance, Product Features, Fits Rod Size, Closure Type, Seasons, Room Type, and more. Filling this full set makes our SKUs eligible for every relevant filter.

---

### 4.2 Category-Critical Attributes (the decision-makers)

**Why it matters.** A handful of specs *are* the purchase decision in this category: opacity/blackout level, GSM/fabric density, material, lining, thermal insulation, and size. These are what a serious buyer compares.

**Importance: 9.** These attributes directly decide the sale; their presence and credibility are near-decisive.

**How to leverage.** Identify the decision-critical attributes leaders always quantify, and ensure ours declare the same attributes with specific, credible values (and corroborate them with reviews and imagery).

**Example.** Leaders quantify *"300 gsm", "100% opacity", "faux silk / faux linen", "triple weave", "thermal insulated"*. Declaring these precisely (rather than vaguely) puts our SKUs in the consideration set of buyers who filter and compare on exactly these fields.

---

### 4.3 Dimensions & Size

**Why it matters.** Curtains are bought to fit exact windows and doors; ambiguous or inconsistent sizing is the top return trigger.

**Importance: 8.** Fit precision directly governs returns and satisfaction.

**How to leverage.** Learn the size vocabulary leaders use (feet + cm + inches, "Door 7 Feet", panel W×H) and present dimensions consistently across title, specs, and image guide, in both units.

**Example.** Leaders give `Item Dimensions L x W: 2.15L x 1.16W Meters`, `Size: Door 7 Feet`, and `116 x 215 cm / 46 x 84 inches` together — a multi-unit, multi-surface consistency we should match so no buyer mis-measures.

---

### 4.4 Material & Fabric Composition

**Why it matters.** Material sets quality expectations, care behavior, and price justification. It's a primary filter and a common review theme.

**Importance: 8.** Defines perceived quality and drives both search filters and satisfaction.

**How to leverage.** Catalog the material vocabulary leaders use (`Enclosure Material`, `Fabric Type`) and their descriptive framing, and state our composition precisely and attractively.

**Example.** Leaders pair a structured value `Enclosure Material: Faux Silk` / `Fabric Type: Polyester` with evocative copy *"silky faux material ... 100 percent polyester ... thick & very pleasant to touch"* — combining a filterable value with a persuasive description.

---

### 4.5 Opacity / Blackout Level

**Why it matters.** This is the flagship, most-searched, most-reviewed attribute of the category. Its stated value drives clicks, and its *accuracy* drives ratings.

**Importance: 9.** The single most important category-defining spec.

**How to leverage.** Learn how leaders express opacity (percentage bands, "100% True Blackout", "Room Darkening") and declare a value we can honestly demonstrate, corroborated by imagery and reviews.

**Example.** Leaders use tiers — *"100% True Blackout"* vs *"Room Darkening"* vs *"Light Filtering"* vs *"Sheer"*. Choosing the honest tier for each SKU and proving it visually both maximizes clicks and avoids the "misleading opacity" complaint pattern.

---

### 4.6 Weave, Lining & Construction

**Why it matters.** Construction details (triple weave, lining type, coating) substantiate the blackout and thermal claims and signal engineering quality.

**Importance: 6.** Credibility layer that backs the flagship claims.

**How to leverage.** Extract the construction terminology leaders use and populate `Weave Type` / `Lining Description` with specific, claim-supporting values.

**Example.** Leaders specify `Weave Type: Plain`, `Lining Description: blackout`, and explain *"triple weave technology ... top layer, high-density black yarn, back layer"* — the exact construction story we should tell to justify our opacity claim.

---

### 4.7 Thermal / Insulation & Functional Properties

**Why it matters.** Beyond light, buyers value heat/cold insulation, noise reduction, and energy savings — secondary benefits that widen appeal and justify price.

**Importance: 7.** Expands the value proposition beyond the primary blackout claim.

**How to leverage.** Collect the functional benefits leaders attach (`Product Features` field + copy) and declare the full applicable set for our SKUs.

**Example.** Leaders list `Product Features: Blackout, Grommets, Room Darkening, Thermal Insulated, Wrinkle Free` and reinforce with copy on *"energy savers"* and *"noise reduction"* — a feature set we should mirror where true.

---

### 4.8 Hanging Mechanism & Hardware Compatibility

**Why it matters.** Ease of installation and rod compatibility are frequent pre-purchase questions and review topics; grommet size and rod fit determine whether the product works in the buyer's setup.

**Importance: 6.** Reduces installation-related returns and answers a common objection.

**How to leverage.** Populate `Curtain Hanging Method`, `top-style`, `Fits Rod Size`, and `Closure Type`, and echo them in copy and the hardware close-up image.

**Example.** Leaders declare `top-style: Grommet`, `Fits Rod Size: 1 Inches`, `Curtain Hanging Method: Grommet`, and describe the 8-grommet, 1.6-inch-hole setup — precise fit data that lets buyers confirm compatibility before ordering.

---

### 4.9 Pack / Unit Clarity

**Why it matters.** "Set of 2" ambiguity (2 panels vs 2 sets) is a recurring cause of 1-star "only got one" reviews. Consistent pack signaling prevents disputes.

**Importance: 6.** Small field, outsized effect on post-purchase disputes.

**How to leverage.** Ensure `Number of Items`, `Unit Count`, `Included Components`, title, and imagery all state the same pack quantity unambiguously.

**Example.** Leaders align `Number of Items: 2`, `Unit Count: 2.00 Piece`, `Included Components: Pack of 2 Door Curtain`, and "Set of 2" in the title — total consistency that removes the "how many did I buy?" doubt.

---

### 4.10 Care & Washing Instructions

**Why it matters.** Clear care guidance prevents post-purchase damage (shrinkage, fading) that turns into negative reviews and blames the product.

**Importance: 5.** Protects satisfaction and reduces care-related complaints.

**How to leverage.** Learn the detail level leaders provide in `Product Care Instructions` and provide equally specific, actionable guidance.

**Example.** A leader gives step-by-step care — *"remove plastic eyelets before washing, wash with cold water only, avoid tumble drying, bleaching, or dry cleaning"* — a specificity that prevents customer-caused damage.

---

### 4.11 Warranty & Guarantees

**Why it matters.** A stated warranty converts hesitant buyers by de-risking the purchase and signaling manufacturer confidence.

**Importance: 6.** A trust and conversion lever that many listings omit.

**How to leverage.** Where leaders state warranty, learn the framing and add clear guarantee language to our specs and copy.

**Example.** A leader declares `Manufacturer Warranty Description: 6 Months warranty of Manufacturing Defect` — a simple reassurance we can adopt to reduce purchase hesitation.

---

### 4.12 Compliance, Origin & Manufacturer Data

**Why it matters.** Country of origin, manufacturer/packer details, and contact information are legally required on Indian marketplaces and, when complete, signal a legitimate, accountable seller.

**Importance: 7.** A compliance gate — incompleteness risks suppression — and a subtle trust cue.

**How to leverage.** Populate `Country of Origin`, `Manufacturer`, `Packer Contact Information`, and related fields fully and cleanly for every SKU.

**Example.** Leaders provide complete `Country of Origin: India` plus full manufacturer name, address, and GST/contact details — the compliance completeness we must match to avoid listing suppression and to look trustworthy.

---

## Pillar 5 — Price & Value

### 5.1 Price Positioning

**Why it matters.** Price is judged *relative to the perceived quality tier and the category band*, not in isolation. Correct positioning wins the value comparison shoppers run in their heads.

**Importance: 8.** A core purchase driver and the lens through which every other attribute is weighed.

**How to leverage.** Map the price distribution of leaders normalized per panel and per size, and position our SKUs coherently against the quality signals (specs, images, reviews) we project.

**Example.** A #1 best-seller sits at ₹1,249 for a 7ft set of 2 with rich content and 8,867 reviews, while another strong SKU sits at ₹599. Mapping this band tells us where our price must land given our content and review depth to read as good value.

---

### 5.2 Perceived Value & Value-for-Money

**Why it matters.** "Value for money" is one of the most frequent praise (and complaint) themes in reviews; it predicts both rating and return rate. Matching price to delivered quality calibrates expectations.

**Importance: 7.** Directly forecasts satisfaction and repeat purchase.

**How to leverage.** Mine review sentiment around price/quality to learn where expectations are met or broken at each price point, and set pricing and claims accordingly.

**Example.** Reviews like *"fantastic value-for-money product"* and *"better in low price"* cluster around honestly-specced budget SKUs, while over-claimed listings draw "not worth it." Calibrating our claims to price protects our rating.

---

## Pillar 6 — Ratings & Reviews (the voice-of-customer engine)

The review corpus (up to ~250 reviews per product, with full text, star, verified flag, media flag, date, and star distribution) is the richest catalog-building asset in the dataset. It is a free, large-scale focus group revealing exactly what to say, show, and fix.

### 6.1 Average Star Rating

**Why it matters.** The star rating is the most visible trust signal in search and on the detail page; small differences shift click-through and conversion sharply.

**Importance: 9.** A dominant, at-a-glance trust and ranking signal.

**How to leverage.** Benchmark the leader rating band and read our rating *with volume*; use the gap to prioritize the product/listing fixes reviews reveal.

**Example.** Leaders cluster around 4.0–4.3 stars. Knowing the competitive band tells us the rating threshold our listings must clear to look credible in the grid.

---

### 6.2 Review Volume

**Why it matters.** Review count is a social-proof moat that compounds — high-volume listings win the click even at equal ratings, and volume takes time to build.

**Importance: 9.** One of the strongest, hardest-to-copy competitive advantages.

**How to leverage.** Learn the volume leaders command and design catalog and review-generation strategy (family aggregation, follow-ups) to close the social-proof gap over time.

**Example.** A leader shows `list_review_count: 8867` (and others far higher) versus our few-hundred counts — quantifying the social-proof mountain and arguing for review-consolidation across variants.

---

### 6.3 Star Distribution Shape

**Why it matters.** The shape of the 1–5 star spread reveals whether negatives are random noise or a systematic defect. A fat 1-star tail points to a specific, fixable problem.

**Importance: 7.** Diagnoses whether issues are listing-level or product-level.

**How to leverage.** Use the `by_star` breakdown to size the negative tail and then read the 1–2 star text to pinpoint the systematic cause.

**Example.** A product with `by_star: {1:21, 2:14, 3:13, 4:14, 5:50}` has a heavy negative tail worth mining — the distribution flags *where* to look before reading a single review.

---

### 6.4 Review Recency & Velocity

**Why it matters.** Recent, steady reviews signal a live, currently-satisfying product; stale reviews suggest neglect or declining relevance. Recency also weights sentiment toward the current product version.

**Importance: 6.** Signals momentum and whether issues are current or already fixed.

**How to leverage.** Use review dates to weight recent sentiment more heavily and to detect whether a past defect has been resolved in newer batches.

**Example.** Dated reviews (*"Reviewed in India on 5 July 2026"*) let us track whether complaints about, say, unequal panel lengths persist in the latest month or have tapered off — telling us if a fix landed.

---

### 6.5 Review Theme Mining — Praise (what to amplify)

**Why it matters.** Consistent praise reveals the true selling points customers care about — in their own words. These are the highest-converting phrases to surface in copy, because they're pre-validated by buyers.

**Importance: 9.** Turns real customer delight into ready-made, trustworthy marketing copy and keywords.

**How to leverage.** Cluster the positive reviews to find the most-repeated benefits, then feed those themes and exact phrasings into bullets, description, A+ callouts, and image captions.

**Example.** Praise clusters around *"blocks 90% light", "premium look", "color exactly as shown", "keeps room cooler", "value for money", "easy to hang"*. These become bullet hooks and A+ headings — e.g., an image callout reading "Blocks up to 90% light — keeps rooms cooler," lifted straight from customer language.

---

### 6.6 Review Theme Mining — Complaints (what to fix & pre-empt)

**Why it matters.** Recurring complaints are a free defect map and an objection list. Addressing them in the product *and* pre-empting them in copy/imagery prevents future negatives and reassures wary buyers.

**Importance: 9.** Simultaneously guides product improvement and objection-handling content.

**How to leverage.** Cluster negative reviews into recurring issues, split them into product fixes vs. expectation-setting content, and address each — in the item, the size guide, the care instructions, or an honest claim.

**Example.** Complaints cluster around *"only blocks 20–40%, misleading", "unequal panel lengths", "thin fabric", "arrived crushed/stained", "color different from image"*. Each maps to an action: honest opacity claim + demo image, QC on panel sizing, texture shot + accurate GSM, better packaging, true-color photography.

---

### 6.7 Review-vs-Claim Corroboration

**Why it matters.** Comparing what a listing *claims* to what reviewers *confirm or dispute* separates a genuine product strength from an over-claim that will erode trust and rating. It keeps our copy honest and durable.

**Importance: 9.** Protects long-term rating and return rate by grounding every claim in evidence.

**How to leverage.** For each claim (opacity, thermal, "as described"), check whether reviews corroborate it, and calibrate our claims to what we can actually deliver and prove.

**Example.** Where a listing claims "100%" but reviews say "blocks 80%," the honest claim is a demonstrated band. Conversely, "as described" and "complete blackout even in afternoon" reviews validate claims we can confidently make. This corroboration turns reviews into a claims quality-control layer.

---

### 6.8 Customer Media (photos & videos in reviews)

**Why it matters.** Customer-generated photos and videos are the most-trusted content on the page — shoppers believe peers over brands. They show the product in real homes, in real light.

**Importance: 6.** High-trust social proof and a source of authentic real-world imagery.

**How to leverage.** Identify reviews flagged with media, learn what real-world scenes and concerns they capture, and encourage/curate customer media; use insights to guide our own realistic photography.

**Example.** Reviews with `has_video: true` exist across products, proving customers document real drape and blackout performance — a trust asset to solicit and a reality check for our studio shots.

---

### 6.9 Verified Purchase & Helpfulness Signals

**Why it matters.** Verified reviews carry more weight, and the most "helpful"-voted reviews act as de facto sales copy or top objections that every shopper reads.

**Importance: 5.** Refines which review signals to trust and which to surface.

**How to leverage.** Weight verified reviews more heavily in theme mining, and study top-helpful reviews as the arguments that most influence buyers.

**Example.** A helpful, verified review — *"As it says, blocks 80-90% of the light. Go for it."* — is both credible proof and a concise value statement whose framing we can echo in copy.

---

### 6.10 Review Titles & Recurring Phrases

**Why it matters.** Review titles and repeated short phrases compress customer sentiment into punchy, high-signal language ideal for headlines and callouts.

**Importance: 5.** A source of ready-made, customer-validated microcopy.

**How to leverage.** Harvest the most frequent short phrases across reviews as candidate headlines, bullet hooks, and A+ captions.

**Example.** Frequent phrasings like *"Good quality", "Worth of money", "totally blocks sunrays", "Complete blackout"* can seed A+ headings and image captions that read in the customer's own voice.

---

## Pillar 7 — Marketplace Performance Signals

### 7.1 Best Sellers Rank

**Why it matters.** BSR is the marketplace's own verdict on sales velocity — a distilled signal of which products and, by extension, which listing strategies are working right now.

**Importance: 8.** A direct, trustworthy indicator of what the market rewards.

**How to leverage.** Use rank to weight which leaders to learn from most heavily — the top-ranked listings' patterns are the highest-confidence templates.

**Example.** The `Best Sellers Rank: #1 in Curtains & Drapes` product is the strongest teacher in the dataset; its title structure, spec completeness, A+ depth, and price all carry extra weight as models to emulate.

---

### 7.2 Category Placement / Node

**Why it matters.** Correct category and item-type placement determines whether a product even appears in its demand pool; the wrong node removes it from relevant browse and filters.

**Importance: 7.** A discoverability gate — misplacement nullifies all other quality work.

**How to leverage.** Compare our category node and `Item Type Name` against leaders to confirm parity, and correct any misplacement.

**Example.** Leaders sit under Curtains & Drapes with `Item Type Name: Door Curtain`; ensuring our SKUs share the same node and item-type keeps them in the same browse and filter results.

---

### 7.3 Ranking Field Correlations (learned patterns)

**Why it matters.** Reading BSR, rating, volume, price, and content richness *together* across the leader set reveals the recurring recipe of a winning listing — the combination, not any single field.

**Importance: 7.** Converts the whole dataset into a prioritized blueprint of what "great" looks like.

**How to leverage.** Look across top performers for the shared traits (deep galleries, full specs, rich A+, honest claims, strong review base) and treat that intersection as our catalog quality bar.

**Example.** The common thread among top-ranked listings — 12–16 images, ~40 populated specs, 10+ A+ modules, honest opacity tiers, thousands of reviews — defines the composite standard every new SKU should aim to hit.

---

## Pillar 8 — Derived & Cross-Cutting Intelligence

### 8.1 Customer-Language Alignment

**Why it matters.** Listings written in the customer's own vocabulary rank for the terms customers actually type and resonate more on reading. There is often a gap between brand language and shopper language.

**Importance: 7.** Improves both discoverability and persuasion simultaneously.

**How to leverage.** Compare the vocabulary in reviews to the vocabulary in our copy, and adopt the customer terms we're missing.

**Example.** Customers say *"sunrays", "afternoon light", "premium look", "compliments from guests"* — phrases we can fold into copy so the listing mirrors how buyers describe the benefit.

---

### 8.2 Objection & Uncertainty Mapping

**Why it matters.** Every unanswered doubt is a lost sale. Systematically listing the questions and worries buyers raise — then resolving each in content — removes friction at the decision point.

**Importance: 6.** Directly lifts conversion by eliminating hesitation.

**How to leverage.** Extract the recurring pre-purchase questions and worries from reviews and Q&A-style review text, and ensure each is answered in bullets, specs, size guide, or A+.

**Example.** Recurring uncertainties — "will it actually block light?", "does the color match?", "how many panels?", "will it fit my rod?", "does it shrink?" — become a checklist that our content must resolve on-page, each tied to a specific asset (demo image, swatch, pack graphic, rod-fit spec, care note).

---

### 8.3 FAQ Content Derivation

**Why it matters.** A concise FAQ built from real customer questions resolves final objections in the buyer's own framing and adds indexed long-tail content.

**Importance: 6.** Converts the most common doubts into reusable, discoverable content.

**How to leverage.** Aggregate the most frequent question themes from reviews into a standard FAQ block per SKU, phrased as customers ask them.

**Example.** From the review corpus: *"Q: Does it fully block light? A: It blocks up to ~90%; darker shades block more. Q: Is it one panel or two? A: Set of 2 panels with 8 grommets each."* — an FAQ assembled directly from what buyers repeatedly ask.

---

### 8.4 Claim Consistency Across Surfaces

**Why it matters.** When title, bullets, specs, images, and A+ state different values for the same attribute, trust collapses and returns spike. One coherent claim per attribute across all surfaces is essential.

**Importance: 8.** Inconsistency actively destroys trust and generates negative reviews.

**How to leverage.** Cross-check each attribute's value across every surface (title vs. bullet vs. spec vs. image) and reconcile to a single, review-corroborated value.

**Example.** A listing whose title says "80–90%", a bullet says "100%", and a spec says "Unlined" teaches us the failure mode; our content should state one honest opacity figure everywhere, backed by the demo image and review evidence.

---

### 8.5 Content Hygiene

**Why it matters.** Typos, broken brand names, and leftover template copy from other markets signal low quality, hurt indexing, and erode trust.

**Importance: 6.** Cheap to fix, disproportionately damaging when ignored.

**How to leverage.** Learn clean-copy standards from the best listings and proofread every surface for spelling, brand integrity, and stray artifacts.

**Example.** Artifacts seen in the data — misspellings like "Polyster"/"Corttina" and leftover foreign copy ("Fall Decor for Living Room") — are exactly the hygiene defects our content review must catch before publishing.

---

### 8.6 Mobile-First Presentation

**Why it matters.** Most marketplace traffic is mobile, where titles truncate (~75 chars), bullets are collapsed, and A+ must remain legible on a small screen. Content optimized only for desktop underperforms where the traffic actually is.

**Importance: 6.** The majority-traffic surface; front-loading is essential.

**How to leverage.** Front-load the most important keywords and benefits in titles and bullets, and design A+ and images to stay legible at phone size, using the leaders' mobile behavior as a guide.

**Example.** Because a title truncates near "Story@Home 100% True Blackout Door Curtains 7 Feet..." on mobile, the decisive tokens (brand, opacity, type, size) must sit in the first 75 characters — a rule we apply to every title.

---

### 8.7 Cross-Listing Pattern Benchmarking

**Why it matters.** No single listing is the full template; the *patterns shared across many* top listings are the reliable blueprint. Aggregating the corpus turns anecdotes into standards.

**Importance: 7.** Elevates catalog decisions from guesswork to evidence from the whole market.

**How to leverage.** Treat the leader dataset as a corpus: compute the common title structure, the modal spec set, the typical gallery mix, the recurring A+ topics, and the consensus claim vocabulary — and codify these as catalog templates and checklists.

**Example.** Synthesizing all leaders yields reusable standards: a title formula, a ~40-field spec schema, a 6-role shot list, a 9-topic A+ outline, and a customer-validated phrase bank — the operational output this whole framework feeds into.

---

## Summary — Attribute Weight Index

| # | Attribute | Pillar | Weight |
|---|---|---|---|
| 1.1 | Product Title | Search & Text | 10 |
| 1.2 | Feature Bullets | Search & Text | 9 |
| 1.3 | Product Description | Search & Text | 5 |
| 1.4 | Keyword / Search Footprint | Search & Text | 9 |
| 1.5 | Vernacular & Localized Language | Search & Text | 7 |
| 1.6 | Occasion & Use-Case Framing | Search & Text | 6 |
| 1.7 | Brand Signaling in Copy | Search & Text | 6 |
| 2.1 | Main / Hero Image | Visual | 10 |
| 2.2 | Image Count & Slot Utilization | Visual | 8 |
| 2.3 | Image Type Mix | Visual | 9 |
| 2.4 | Lifestyle Imagery | Visual | 8 |
| 2.5 | Infographic / Feature Callouts | Visual | 8 |
| 2.6 | Size / Measurement Guide Images | Visual | 8 |
| 2.7 | Fabric Texture / Close-ups | Visual | 7 |
| 2.8 | Performance Demonstration Images | Visual | 8 |
| 2.9 | Color / Variant Swatch Imagery | Visual | 7 |
| 2.10 | Image Technical Quality | Visual | 7 |
| 2.11 | Product Video | Visual | 7 |
| 3.1 | A+ Presence | A+ Content | 8 |
| 3.2 | A+ Module Depth & Design | A+ Content | 8 |
| 3.3 | A+ Topic Coverage | A+ Content | 7 |
| 3.4 | A+ Text Layer | A+ Content | 6 |
| 3.5 | Brand Story Module | A+ Content | 6 |
| 3.6 | Comparison / Cross-Sell Module | A+ Content | 6 |
| 4.1 | Specification Completeness | Specs | 8 |
| 4.2 | Category-Critical Attributes | Specs | 9 |
| 4.3 | Dimensions & Size | Specs | 8 |
| 4.4 | Material & Fabric Composition | Specs | 8 |
| 4.5 | Opacity / Blackout Level | Specs | 9 |
| 4.6 | Weave, Lining & Construction | Specs | 6 |
| 4.7 | Thermal / Functional Properties | Specs | 7 |
| 4.8 | Hanging Mechanism & Hardware | Specs | 6 |
| 4.9 | Pack / Unit Clarity | Specs | 6 |
| 4.10 | Care & Washing Instructions | Specs | 5 |
| 4.11 | Warranty & Guarantees | Specs | 6 |
| 4.12 | Compliance, Origin & Manufacturer | Specs | 7 |
| 5.1 | Price Positioning | Price & Value | 8 |
| 5.2 | Perceived Value / VFM | Price & Value | 7 |
| 6.1 | Average Star Rating | Reviews | 9 |
| 6.2 | Review Volume | Reviews | 9 |
| 6.3 | Star Distribution Shape | Reviews | 7 |
| 6.4 | Review Recency & Velocity | Reviews | 6 |
| 6.5 | Review Theme Mining — Praise | Reviews | 9 |
| 6.6 | Review Theme Mining — Complaints | Reviews | 9 |
| 6.7 | Review-vs-Claim Corroboration | Reviews | 9 |
| 6.8 | Customer Media | Reviews | 6 |
| 6.9 | Verified & Helpfulness Signals | Reviews | 5 |
| 6.10 | Review Titles & Phrases | Reviews | 5 |
| 7.1 | Best Sellers Rank | Marketplace | 8 |
| 7.2 | Category Placement / Node | Marketplace | 7 |
| 7.3 | Ranking Field Correlations | Marketplace | 7 |
| 8.1 | Customer-Language Alignment | Cross-Cutting | 7 |
| 8.2 | Objection & Uncertainty Mapping | Cross-Cutting | 6 |
| 8.3 | FAQ Content Derivation | Cross-Cutting | 6 |
| 8.4 | Claim Consistency Across Surfaces | Cross-Cutting | 8 |
| 8.5 | Content Hygiene | Cross-Cutting | 6 |
| 8.6 | Mobile-First Presentation | Cross-Cutting | 6 |
| 8.7 | Cross-Listing Pattern Benchmarking | Cross-Cutting | 7 |

### How to use this framework

1. **Learn from the leaders.** Treat the top-performer dataset as templates — extract the title formula, spec schema, gallery shot list, and A+ topic outline that recur across winning listings (8.7).
2. **Listen to the customers.** Treat the review corpus as a focus group — mine praise for copy (6.5), complaints for fixes and objection-handling (6.6), and questions for FAQs (8.3).
3. **Verify every claim.** Use reviews to keep claims honest and consistent across all surfaces (6.7, 8.4).
4. **Fill every field and slot.** Populate the full spec schema (4.1) and gallery mix (2.3), because each empty field or slot is forfeited discoverability and persuasion.
5. **Weight by importance.** Invest first in the 9–10 attributes (title, hero image, opacity, category-critical specs, rating/volume, review mining), then round out with the rest.
