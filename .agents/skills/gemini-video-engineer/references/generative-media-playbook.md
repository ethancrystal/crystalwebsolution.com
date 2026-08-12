# Generative Media Product Playbook

## Product Modes

| Mode | Optimize for | Product behavior |
|---|---|---|
| Explore | Breadth and speed | Generate varied low-cost candidates; make comparison fast |
| Direct | Intent fidelity | Use a structured brief and explicit creative controls |
| Continue | Identity and style preservation | Carry references, lineage, protected attributes, and scene state |
| Edit | Locality | Change only the requested region, interval, object, or behavior |
| Produce | Reliability and finish | Lock approved assets and assemble deterministically |

Do not use one prompt box and one quality tier for every mode.

## Control Hierarchy

Give users controls in this order:

1. Outcome: what should exist when generation succeeds?
2. References: which identity, product, composition, or style must carry through?
3. Invariants: what cannot change?
4. Creative direction: camera, motion, light, palette, material, pacing.
5. Technical format: aspect ratio, duration, resolution, alpha, audio.
6. Advanced provider controls only when they produce a meaningful, explainable difference.

## Candidate Strategy

Candidate count is a product decision. More outputs improve search but increase cost and decision fatigue.

- Use wider variation during exploration.
- Narrow variation after selection.
- Preserve rejected candidates long enough to compare or branch.
- Let users branch from any accepted or promising candidate.
- Record which candidates were viewed, selected, revised, or abandoned.

The useful unit is not “generation.” It is a creative decision that advances the artifact.

## Continuity

Continuity requires application state, not prompt repetition alone. Persist:

- canonical reference assets;
- identity and wardrobe descriptors;
- protected product geometry and branding;
- style vocabulary and palette;
- scene, shot, and character IDs;
- prior accepted frames or clips;
- spatial and temporal relationships;
- parent-child generation lineage.

When continuity matters, regenerate the smallest possible scope. Rebuilding an entire sequence to fix one defect destroys accepted state and multiplies variance.

## Evaluation Matrix

Score dimensions separately; one aggregate score hides failure modes.

| Dimension | Example checks |
|---|---|
| Adherence | Requested subjects, actions, count, setting, and exclusions are present |
| Composition | Framing, placement, depth, and spatial relationships are correct |
| Fidelity | Reference identity, product, wardrobe, and style remain recognizable |
| Temporal quality | Motion is coherent; objects persist; cuts and camera moves make sense |
| Edit preservation | Unrequested regions and attributes remain unchanged |
| Craft | Anatomy, hands, faces, reflections, text, edges, and textures avoid artifacts |
| Safety | Policy decisions are correct, understandable, and consistently surfaced |
| Product performance | Time and cost per accepted result; revision success; abandonment rate |

Use blinded pairwise comparison for perceptual quality. Maintain a golden set spanning normal requests, difficult continuity, ambiguous intent, prohibited requests, and expected provider failures.

## Failure Taxonomy

Do not collapse every bad result into “try again.”

- **Intent failure:** model misunderstood the request.
- **Control failure:** product could not express the needed constraint.
- **Continuity failure:** identity, style, geometry, or state drifted.
- **Locality failure:** an edit changed unrelated content.
- **Temporal failure:** motion, persistence, causality, or camera behavior broke.
- **Craft failure:** visible image or video artifacts.
- **System failure:** timeout, quota, expired asset, malformed output, or lost job state.
- **Safety failure:** incorrect block, missed block, or unclear explanation.

Each category needs a different recovery action and telemetry event.

## Repository Review Lens

When reviewing an existing media repository:

1. Map ingestion, analysis, asset storage, edit representation, rendering, and delivery.
2. Identify deterministic capabilities worth preserving.
3. Find high-friction creative decisions where generation or multimodal understanding could help.
4. Check whether assets have stable IDs, lineage, metadata, and immutable originals.
5. Check whether the edit model can express generated inserts, replacements, extensions, and revisions.
6. Check whether evaluation data can connect a request to candidates, selection, revisions, and final use.
7. Recommend the smallest product experiment that tests user value before building broad provider infrastructure.

## Common Mistakes

- Starting with model selection instead of the user’s creative decision.
- Treating prompt text as the full product state.
- Offering raw technical parameters instead of creative controls.
- Regenerating accepted work to fix a local problem.
- Measuring generation success rather than accepted-output success.
- Asking a generative model to render exact typography or timelines.
- Coupling application records directly to one provider’s response schema.
- Shipping without a golden evaluation set and failure taxonomy.
