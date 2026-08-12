# Blog categories — exact enum values

The `category` field must match one of these strings exactly. Wrong values get a 400.

## Allowed (18 values)

| Value | Use for |
|---|---|
| `demand-letters` | Any post about attorney-signed demand letters (the core product) |
| `cease-and-desist` | Trademark/copyright infringement, harassment, content removal |
| `contract-disputes` | Breach of contract, contractor disputes, deposit recovery |
| `eviction-notices` | 3/30/60-day notices, unlawful detainer prep |
| `employment-disputes` | Wage theft, wrongful termination, harassment |
| `consumer-complaints` | Refund disputes, defective goods, service failures |
| `pre-litigation-settlement` | Settlement negotiations before filing |
| `debt-collection` | Unpaid invoices, B2B collections, freelancer non-payment |
| `estate-probate` | Wills, trusts, executor disputes |
| `landlord-tenant` | Security deposits, repairs, habitability, rent issues |
| `insurance-disputes` | Bad-faith claims, denied coverage |
| `personal-injury` | Auto accidents, premises liability |
| `intellectual-property` | DMCA, trademark enforcement, counterfeits |
| `family-law` | Divorce, custody, support |
| `neighbor-hoa` | Boundary disputes, HOA violations, nuisance |
| `document-analysis` | Posts about TTML's contract review feature |
| `pricing-and-roi` | Comparisons, cost analysis, "is it worth it" content |
| `general` | Fallback when nothing else fits |

## Auto-inference (markdown mode only)

When `Content-Type: text/markdown` and `category:` is not in frontmatter, the server infers from the first matching tag:

| Tag substring | → category |
|---|---|
| `demand letter` | `demand-letters` |
| `cease and desist`, `cease-and-desist` | `cease-and-desist` |
| `contract dispute` | `contract-disputes` |
| `eviction`, `eviction notice` | `eviction-notices` |
| `employment`, `employment dispute` | `employment-disputes` |
| `consumer complaint` | `consumer-complaints` |
| `pre-litigation`, `settlement` | `pre-litigation-settlement` |
| `debt collection` | `debt-collection` |
| `estate`, `probate` | `estate-probate` |
| `landlord`, `tenant`, `landlord-tenant`, `security deposit` | `landlord-tenant` |
| `insurance` | `insurance-disputes` |
| `personal injury` | `personal-injury` |
| `intellectual property`, `trademark`, `copyright` | `intellectual-property` |
| `family law`, `divorce`, `child custody` | `family-law` |
| `hoa`, `neighbor` | `neighbor-hoa` |
| `pricing`, `roi`, `cost` | `pricing-and-roi` |
| anything else | `general` |

Matching is case-insensitive. First matching tag wins.
