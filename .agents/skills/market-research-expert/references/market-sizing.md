# Market Sizing: TAM / SAM / SOM

Goal: a defensible **range** with a transparent, reproducible calculation path and a sanity check from a second method. Never a single hero number.

## Definitions (annual revenue unless stated)
- **TAM — Total Addressable Market.** Total demand if you had 100% of every buyer who could conceivably use the category. Sets the ceiling.
- **SAM — Serviceable Addressable Market.** The slice of TAM you can actually serve given your product, geography, channel, language, and segment. The realistic market you compete in.
- **SOM — Serviceable Obtainable Market.** The share of SAM you can win in a defined horizon (typically Y1–Y3) given competition, GTM capacity, and budget. This is the number a plan is built on.

## Always compute it two ways
Do **top-down** AND **bottom-up**, then reconcile. If they diverge >2–3×, one model has a broken assumption — find it before reporting.

### Top-down (start from a published market figure, narrow down)
```
TAM (published category size, with source+date)
 × % relevant to your sub-category        [filter: product fit]
 × % in your geography                     [filter: where you sell]
 × % in your target segment                [filter: SMB/enterprise/etc.]
 = SAM
 × realistic share in horizon (%)          [filter: competition + GTM]
 = SOM
```
Caveat: third-party "market size" reports are often inflated and definition-fuzzy. Always note the report's definition and date; treat as one source, triangulate.

### Bottom-up (build up from units × price — usually more credible)
```
SOM = (# target accounts you can reach in horizon)
      × (realistic conversion / penetration %)
      × (annual revenue per customer = price × purchase frequency)
```
Build SAM/TAM by widening the account count to the full serviceable / total population. Bottom-up forces explicit, checkable assumptions (population, conversion, ACV) and is harder to fudge than a top-down percentage.

## Worked example (illustrative — replace with cited inputs)
Product: a $40/mo scheduling SaaS for independent US hair salons.

**Bottom-up**
- US hair/nail salons ≈ 800k establishments *(US Census CBP / IBISWorld, cite + date)* `[fact]`
- Share that are small/independent & could adopt SaaS ≈ 70% → 560k `[assumption: from review of segment]`
- Realistic 3-yr penetration given 5+ incumbents ≈ 3% → 16,800 customers `[assumption]`
- ARPA = $40 × 12 = $480/yr
- **SOM (Y3) ≈ 16,800 × $480 ≈ $8.1M** `[inference]`
- SAM (all 560k serviceable) × $480 ≈ **$269M**

**Top-down check**
- US salon software market ≈ $X00M *(report, date)* → US small-salon slice ≈ $Y00M.
- If SAM here ($269M) lands within ~2× of that slice → models corroborate. If not, revisit penetration or population.

Report as: "SOM Y3 ≈ **$6–10M** (bottom-up), SAM ≈ **$250–290M**; top-down corroborates within ~1.5×. Largest sensitivity: 3-yr penetration rate (3% assumed; each +1pt ≈ +$2.7M SOM)."

## Sanity checks (run before reporting)
- **Reconcile the two methods** — explain any gap >2×.
- **Per-capita / per-account smell test** — does implied revenue per buyer match observed pricing?
- **Comparable check** — does TAM fit incumbents' known/estimated revenue? (Sum of top players' revenue should be ≤ TAM and usually a meaningful fraction of SAM.)
- **Growth realism** — is implied CAGR consistent with cited category growth? Flag hockey sticks.
- **Sensitivity** — identify the 1–2 assumptions the answer is most sensitive to; show ± impact.

## Free inputs for sizing (see free-data-sources.md for the full directory)
- Census / Statistical agencies (US Census CBP, BLS, Eurostat, World Bank, OECD) — establishment & population counts.
- Company filings (10-K/annual reports), investor decks — incumbent revenue & customer counts.
- Industry associations — segment counts and adoption rates.
- App store / G2 / Capterra review counts — proxy for installed base.

## Output template
```
SCOPE: geography | segment | horizon | currency
TAM: $___  (method, source, date)
SAM: $___  (filters applied: ___)
SOM: $___  (horizon, penetration assumption)
METHODS: top-down result vs bottom-up result → reconciliation note
KEY ASSUMPTIONS (each editable, tagged fact/assumption/inference): ...
SENSITIVITY: most-sensitive assumption + ± impact
CONFIDENCE: H/M/L + why
```
