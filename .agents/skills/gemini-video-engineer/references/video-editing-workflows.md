# AI Video Editing Workflows

Use this reference after the main skill has classified the operation.

## Table Of Contents

1. Project intake
2. Scene and track map
3. Create
4. Edit and repair
5. Extend
6. Remake
7. Scene operations
8. Sound operations
9. Caption operations
10. Generated asset integration
11. Quality control

## Project Intake

Inventory:

- project engine and entry point;
- compositions, scene IDs, and duration calculation;
- source and generated media;
- fonts, logos, palettes, and design rules;
- transcripts, captions, narration, music, ambience, and effects;
- current preview, render, test, and validation commands;
- delivery requirements.

Probe media rather than trusting filenames. Record duration, streams, dimensions, frame rate, sample rate, channel layout, codec, and alpha requirements.

## Scene And Track Map

Create a compact map:

| Scene | Time | Purpose | Visual tracks | Audio tracks | Transition | Protected |
|---|---:|---|---|---|---|---|

Use stable scene IDs. Keep human-readable seconds for editorial decisions and frames for deterministic implementation.

For an edit, add:

| Change | Affected range | Invariants | Timing impact | Verification |
|---|---|---|---|---|

## Create

1. Define the viewer, outcome, platform, duration, and single core idea.
2. Write the hook, progression, proof, and ending.
3. Establish design language: palette, typography, spacing, image treatment, and motion character.
4. Build each scene at its most informative static frame.
5. Acquire or generate only the missing assets.
6. Add entrances, internal motion, and transitions.
7. Cut narration and dialogue first; fit visuals to meaning.
8. Add music, ambience, effects, and captions.
9. Render a fast draft and review the whole sequence.
10. Lock approved scenes and finish the final render.

## Edit And Repair

Use a defect-first loop:

1. Observe the issue at a precise timestamp or frame.
2. Capture expected versus actual behavior.
3. Trace ownership:
   - wrong source or generation;
   - wrong scene timing;
   - wrong layout or crop;
   - wrong animation state;
   - wrong audio edit or mix;
   - render or codec failure.
4. Make the smallest owning-layer change.
5. Re-render the affected window.
6. Check adjacent scenes and global duration.

Common repairs:

- Overflow: measure text, enlarge or reflow the container, or fit text.
- Missing asset: fix asset resolution and preload behavior; do not hide the error.
- Flash or black frame: inspect clip boundaries, opacity state, and transition overlap.
- Animation jump: remove conflicting property ownership and verify initial state.
- Caption drift: retime from approved audio and re-check after speed changes.
- Audio click: cut at zero crossing when practical and add a short fade.
- Frozen video: inspect decode support, trim range, playback rate, and source duration.

## Extend

1. Select the final accepted frame and last clean audio boundary.
2. Extract continuity anchors: subject, wardrobe, environment, lens, camera height, direction of motion, grade, grain, and sound bed.
3. Create the extension as a separate branch or scene.
4. Match movement into and out of the join.
5. Crossfade or bridge ambience where a hard audio cut is audible.
6. Recalculate captions and downstream timing.
7. Compare frames immediately before and after the join.

## Remake

Decompose the reference:

- narrative beats and relative duration;
- frame composition and visual hierarchy;
- camera and object motion;
- typography and graphic system;
- edit rhythm and transition types;
- dialogue, music, ambience, and effect cues;
- finish: grain, glow, blur, grade, and texture.

Build a shot specification from the decomposition. Recreate the structure with approved assets and an original implementation. Use side-by-side frames to judge hierarchy and timing.

## Scene Operations

### Replace

Match canvas, duration, frame rate, color treatment, entry/exit states, and audio boundary. If replacement duration differs, choose explicitly between trimming, retiming, extending the timeline, or changing downstream offsets.

### Reorder

Move complete scene units. Recompute references, captions, transition timing, music cues, and any narration that assumes prior context.

### Trim Or Split

Keep edits on frame boundaries. For source media, confirm media trim offsets and composition duration are not being confused.

### Merge

Unify duplicated backgrounds and audio beds, then preserve separate internal beats. Avoid two simultaneous transitions at the join.

### Reframe

Protect faces, products, text, and action. Prefer focal-point-aware crops. Verify all hero frames because animated subjects can leave a crop later.

### Stabilize And Track

Stabilize only enough to remove unwanted motion; preserve deliberate camera energy. Track masks, labels, blur, graphics, or replacements to the source feature and inspect for drift, occlusion, scale changes, and motion blur.

### Mask, Key, Blur, And Redact

Use masks and chroma/luma keys for controlled compositing. Feather edges appropriately and inspect hair, hands, transparency, spill, and moving boundaries. Redactions must cover the sensitive region for every frame, including transitions and reframes.

### Cleanup, Grade, And Upscale

Treat denoise, deblock, deinterlace, sharpening, restoration, frame interpolation, and upscaling as reversible derived assets. Avoid invented detail around faces, text, products, and evidence-sensitive footage. Match white balance, exposure, contrast, saturation, and grain across joins before applying a final grade.

### Restyle

Change palette, type, material, lighting, and motion consistently across every element in the scene. Preserve content and timing unless the brief permits broader variation.

### Regenerate

Pass the previous accepted asset as a reference when continuity matters. State both the requested change and protected attributes. Replace only after comparison.

## Sound Operations

### Dialogue Or Narration Replacement

1. Preserve the original transcript and timing map.
2. Generate or record replacement speech.
3. Remove silence and breaths only when editorially appropriate.
4. Align words, phrases, or sentence boundaries.
5. Update captions from the final audio.
6. Duck music under speech and restore it between phrases.

### Music Replacement

Match editorial energy, tempo, phrase length, and rights requirements. Cut on musical phrases, not arbitrary timestamps. Use fades or beat-aligned edits.

### Sound Effects

Use effects to clarify causality and emphasis. Sync transients to the exact visual event. Avoid stacking effects that compete with dialogue.

### Cleanup

Use media tools for denoise, hum reduction, channel repair, resampling, silence detection, and loudness normalization. Keep an unprocessed original. Compare for artifacts after aggressive cleanup.

### Speed And Pitch

When retiming:

- preserve pitch for ordinary dialogue unless an intentional effect is requested;
- re-check lip sync;
- re-check captions;
- inspect interpolation or duplicated-frame artifacts;
- recalculate scene and total duration.

### Mix Checks

- no clipping or unintended distortion;
- dialogue remains intelligible on small speakers;
- no sudden ambience disappearance;
- no clicks at cuts;
- stereo channels are present and correctly routed;
- beginning and ending fades are intentional;
- output matches the destination’s loudness requirements when specified.

## Caption Operations

1. Use the final approved audio as timing authority.
2. Import or generate timed words.
3. Group text into readable semantic phrases.
4. Keep exact names, figures, URLs, and legal copy.
5. Fit text through measurement and wrapping.
6. Verify caption entry and exit around every audio edit.
7. Check platform-safe areas in both portrait and landscape exports.

## Generated Asset Integration

Every generated asset should record:

- asset ID and immutable source path;
- provider, model, prompt version, and parameters;
- references and parent asset;
- intended scene and time range;
- safety status;
- review status: candidate, accepted, rejected, or superseded.

Do not generate final text overlays inside footage. Composite exact text later.

## Quality Control

### Visual

- correct framing and safe margins;
- no unintended overlap, clipping, or overflow;
- identity and style continuity;
- readable text and adequate contrast;
- smooth transitions with no empty outgoing scene;
- no black, duplicate, frozen, or corrupted frames;
- motion is deterministic and physically coherent.

### Audio

- sync is correct;
- words are not clipped;
- levels are consistent;
- music and effects support rather than mask speech;
- edits have clean boundaries;
- channels, sample rate, and codec are valid.

### Delivery

- dimensions, frame rate, duration, codec, container, and alpha are correct;
- file opens and seeks;
- thumbnail and final frame are intentional;
- filename and output path are stable;
- preview or final render is clearly identified.

### Rights And Consent

- cloned faces and voices have appropriate consent;
- private avatars have completed provider consent;
- music, footage, fonts, and graphics are licensed for the intended use;
- generated or materially altered media carries required disclosures;
- redaction and privacy requirements survive every exported version.
