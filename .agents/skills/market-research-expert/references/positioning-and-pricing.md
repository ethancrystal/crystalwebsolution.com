# Positioning & Pricing

Positioning sets the **context** in which your product is the obvious choice for a specific customer. Pricing captures a fair slice of the value that positioning makes visible. Both must be evidence-backed — grounded in the competitive set (→ competitive-analysis.md) and audience WTP (→ audience-and-jtbd.md).

---

## Part A — Positioning (April Dunford's method)

Dunford's premise: positioning is **deliberate context-setting**, not a tagline. The same product can win or lose depending on the market frame you place it in. Work the five (+1) components in order.

### The components
1. **Competitive alternatives** — what would the customer use if you didn't exist? (Including spreadsheets, a manual process, "do nothing.") This defines the real frame of reference. *Source: competitive set + interview "what do you use today?"*
2. **Unique attributes/capabilities** — what you have that the alternatives don't (features, model, data, integrations, business model).
3. **Value (+ proof)** — the benefit those attributes enable, mapped to what the customer cares about. Attribute → value → why-it-matters. Quantify where possible (time/money/risk). Each value needs evidence.
4. **Target customers who care most** — the segment for whom that value is most acute (the beachhead from audience research). Position *for them*, not the average.
5. **Market category** — the frame that makes your value obvious and sets buyer expectations. Choosing the category is the highest-leverage decision: it determines who you're compared to and what features are "table stakes."
6. **(Optional) Relevant trend** — a wave that makes you timely (only if true and the customer already cares; don't bolt on hype).

### Process
1. List true competitive alternatives.
2. Isolate your unique attributes vs those alternatives.
3. Map each attribute → the value it delivers.
4. Identify the segment that cares most about that value.
5. Pick the market category/frame that makes the value obvious to that segment.
6. (Optional) Layer a trend if genuinely relevant.

### Positioning statement template
```
For [target segment] who [situation / job-to-be-done],
[product] is a [market category]
that [single most important differentiated value].
Unlike [primary competitive alternative],
[product] [the key differentiator + proof].
```
Validate against evidence: the differentiator must be real (you have it, they don't — from the matrix) and the value must be one the segment actually voiced (from reviews/interviews). White space on the positioning map is only real positioning if **demand exists there** (→ free-data-sources.md).

### Value proposition & messaging
- **Lead with the value, support with the attribute.** "Close your books in a day" (value) > "automated reconciliation engine" (attribute).
- One primary message per segment; resist listing every feature.
- Pressure-test against the audience's four forces (push/pull/anxiety/habit, → audience-and-jtbd.md): does the message amplify pull and reduce switching anxiety?

---

## Part B — Pricing

### 1. Pick the basis (in order of preference)
- **Value-based (best)** — price against the quantified value of the job done (time saved × cost, revenue gained, risk/cost avoided). Sets the ceiling and the story.
- **Competition-based** — anchor to incumbents' published prices; choose to undercut, match, or premium *with a reason*. Capture competitor pricing dated (it changes monthly).
- **Cost-plus (weakest)** — only a floor; ignores what the customer will actually pay. Never the sole basis.

### 2. Pick the model (align price metric to the value metric)
The price metric should scale with the value the customer receives.
- **Per-seat** — value scales with users (collaboration tools). Simple; can penalize adoption.
- **Usage / consumption** — value scales with volume (API calls, GB, transactions). Aligns cost to value; harder to forecast.
- **Tiered / feature-based (good/better/best)** — segments by willingness to pay; 3 tiers is the common sweet spot.
- **Flat / per-account** — simplicity; risks under-monetizing heavy users.
- **Freemium / free trial** — acquisition lever, not a price model; define the upgrade trigger and free→paid conversion assumption (typical SaaS freemium converts low single-digit %; cite if you have data).
- **Hybrid** — base platform fee + usage is common in B2B.

### 3. Set the points (estimate WTP without a big budget)
- **Van Westendorp PSM** — 4 questions yield an acceptable price band (see audience-and-jtbd.md).
- **Gabor-Granger** — test discrete price points → demand curve and revenue-maximizing point.
- **Competitor anchoring** — position your tiers relative to the dated competitive pricing matrix.
- **Behavioral test** — a real pricing page + traffic beats any stated-intent survey.
- Use **price as a positioning signal**: too cheap can read as low-value in some categories; price communicates tier.

### 4. Structure & psychology (note, don't over-engineer)
Anchor with a high tier, make the middle tier the obvious target (decoy effect), annual-vs-monthly discount, charm pricing where it fits the brand. Keep the page legible — confusion kills conversion.

### Pricing recommendation template
```
RECOMMENDED: [model] at [tiers/points] — primary basis: [value/competition]
RATIONALE: value = [quantified job value]; competitors = [anchor prices, dated]; WTP = [signal/method]
MODEL FIT: price metric [X] tracks value metric [Y]
EXPECTED CONVERSION/ARPA ASSUMPTION: ___ [tag: assumption]
SENSITIVITY: revenue impact if WTP/conversion off by ±X%
RISKS: [margin, price war, perceived value, churn at this point]
TEST PLAN: [PSM / Gabor-Granger / pricing-page A/B] to confirm before locking
CONFIDENCE: H/M/L + why
```

---

## Anti-patterns
- **Positioning = tagline.** A clever slogan without a chosen category, segment, and frame of reference.
- **Positioning against everyone / no one.** "For all businesses" positions for nobody.
- **Cost-plus pricing in a value market** — leaving money on the table because you priced off your costs.
- **Ignoring substitutes/"do nothing"** as the real competitive alternative.
- **Price-metric mismatch** — per-seat pricing where value is usage-driven (or vice versa); customers game it.
- **Stated WTP as truth** — "would you pay $X?" Discount heavily; prefer revealed/behavioral evidence.
- **Untested premium/discount** — claiming a price tier without anchoring to dated competitor data or a value calc.
- **Hype-trend bolt-on** — attaching an "AI/Web3/agentic" trend the target customer doesn't actually care about.
