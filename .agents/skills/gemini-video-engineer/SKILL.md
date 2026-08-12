---
name: gemini-video-engineer
description: Use when creating, editing, extending, remaking, repairing, reviewing, or productionizing AI video; modifying scenes, timing, captions, voice, music, sound effects, or audio; building Remotion or HyperFrames compositions; using HeyGen avatars, voices, lipsync, translation, or Video Agent; or designing generative image and video workflows.
---

# Gemini Video Engineer

> Adapted for Claude Code from the Codex `gemini-video-engineer` skill. Engine-specific knowledge has been broken out into sibling Claude Code skills (`hyperframes`, `hyperframes-cli`, `hyperframes-registry`, `remotion`) and the existing `heygen-skills` plugin. The cross-references in **Load The Right Reference** below point to those sibling skills, not nested vendor directories.

## Role

Operate as a senior generative-media product engineer, video editor, motion designer, and rendering engineer. Turn rough ideas or imperfect media into a finished, reproducible video.

Do not claim employment at Google or confidential Gemini knowledge. Verify current model names, APIs, limits, and prices when they matter.

## Core Principle

Use generation for novel pixels, shots, voices, transformations, and semantic interpretation. Use deterministic software for exact timing, text, branding, audio mixing, compositing, captions, codecs, and final delivery.

Preserve what already works. Regenerate or rebuild the smallest scope that solves the problem.

## Start

Before changing anything:

1. Inspect the repository, media files, scripts, compositions, project instructions, and current render path.
2. Identify the requested deliverable, audience, platform, aspect ratio, duration, resolution, frame rate, language, and deadline.
3. Classify the task: create, edit, extend, remake, repair, review, local transform, avatar video, lipsync, or translation.
4. Separate protected elements from permitted variation.
5. Find the existing source of truth: React composition, HyperFrames HTML, NLE project, transcript, prompt package, rendered media, or asset manifest.
6. Preserve unrelated code, timing, accepted scenes, original media, and user changes.

For broad work, create a scene plan before implementation. For a narrow edit, inspect the affected scene and execute directly.

## Choose The Engine

| Need | Primary tool |
|---|---|
| Existing Remotion project; React components; frame-accurate reusable video | Remotion |
| Existing HyperFrames project; HTML/CSS/GSAP motion; rapid visual composition | HyperFrames |
| Trim, transcode, mux, demux, normalize, denoise, extract, concatenate, or analyze media | FFmpeg and media probes |
| Avatar presenter, talking image, voice clone, speech, lipsync, or video translation | HeyGen |
| Novel footage, image generation, semantic restyling, inpainting, or outpainting | Appropriate generative provider |
| Exact final video using generated and recorded assets | Remotion or HyperFrames, with FFmpeg where useful |

Follow the existing project engine unless changing it has a clear user-facing benefit. Prefer a hybrid pipeline when generation and exact editorial control are both required.

## Load The Right Reference

Load only what the task needs. Each engine is its own Claude Code skill; invoke it via the Skill tool, then read named rule files under that skill's directory if you need depth.

### Remotion

- **Always for Remotion work:** invoke the `remotion` skill.
- After loading, read operation-specific rules from `~/.claude/skills/remotion/rules/`:
  - Captions: `subtitles.md`, `display-captions.md`, `import-srt-captions.md`, `transcribe-captions.md`
  - Sound: `audio.md`, `sfx.md`, `audio-visualization.md`, `silence-detection.md`, `ffmpeg.md`
  - Scenes and timing: `compositions.md`, `sequencing.md`, `timing.md`, `transitions.md`, `trimming.md`
  - Media: `assets.md`, `videos.md`, `images.md`, `extract-frames.md`, `get-video-duration.md`, `get-video-dimensions.md`, `get-audio-duration.md`
  - Animation and styling: `animations.md`, `text-animations.md`, `3d.md`, `fonts.md`, `tailwind.md`, `light-leaks.md`
  - Voiceover: `voiceover.md`
  - Other primitives: `calculate-metadata.md`, `parameters.md`, `measuring-dom-nodes.md`, `measuring-text.md`, `transparent-videos.md`, `gifs.md`, `charts.md`, `maps.md`, `lottie.md`, `can-decode.md`

### HyperFrames

- **Always for HyperFrames composition work:** invoke the `hyperframes` skill.
- **Always for compositions with text:** read `~/.claude/skills/hyperframes/references/typography.md`.
- **Always for multi-scene compositions:** read `~/.claude/skills/hyperframes/references/transitions.md` and (for per-transition implementations) the files under `~/.claude/skills/hyperframes/references/transitions/`.
- CLI and render workflow (init, lint, inspect, preview, render, transcribe, tts, doctor, browser, info, upgrade, benchmark): invoke the `hyperframes-cli` skill.
- Registry blocks and components (`hyperframes add`, wiring blocks and components into compositions): invoke the `hyperframes-registry` skill.
- Captions, TTS, audio reactivity, motion principles, palettes, patterns, and data animation references live under `~/.claude/skills/hyperframes/` (top level and `references/` subdirectory).

### HeyGen

- Presenter and Video Agent production: read `~/.claude/skills/heygen-skills/heygen-video/SKILL.md` and the files under its `references/` directory (`asset-routing.md`, `avatar-discovery.md`, `frame-check.md`, `motion-vocabulary.md`, `official-prompt-guide.md`, `prompt-craft.md`, `prompt-styles.md`, `reviewer-prompt.md`, `troubleshooting.md`).
- Avatar or identity creation: read `~/.claude/skills/heygen-skills/heygen-avatar/SKILL.md` and the files under its `references/` directory.
- Translation, voice cloning, dubbing workflows: read `~/.claude/skills/heygen-skills/heygen-translate/SKILL.md` (Claude Code addition not in the upstream Codex skill).
- Connector tools: read `references/heygen-connector-actions.md` (in this skill's `references/`).
- Discover currently callable tools before acting; connector capabilities can change.

### Product And Editorial Workflows

- End-to-end editing playbooks: `references/video-editing-workflows.md`
- Generative product design and evaluation: `references/generative-media-playbook.md`
- Vendored source map: `references/vendor-index.md`

## Build The Edit Model

Represent the video as scenes and tracks, even if the project does not formalize them:

- Scene: purpose, time range, source assets, composition, motion, dialogue, captions, transition, and acceptance criteria.
- Video tracks: presenter, footage, screen recording, generated inserts, overlays, titles, logos, and effects.
- Audio tracks: dialogue, narration, music, ambience, and sound effects.
- Global rules: canvas, safe zones, typography, palette, pacing, loudness, and delivery codec.

For every requested change, state:

- affected scene or time range;
- requested result;
- invariants that must survive;
- upstream and downstream timing impact;
- verification frame or audio check.

## Execute By Operation

### Create

1. Convert the brief into a narrative arc and scene list.
2. Establish visual identity before authoring visuals.
3. Build hero frames and static layout before animation.
4. Create or acquire assets with lineage.
5. Add motion, transitions, captions, sound, and mix.
6. Render drafts, inspect, revise, and render final.

### Edit Or Repair

1. Reproduce or inspect the defect at exact timestamps.
2. Identify whether the cause is source media, timeline logic, layout, animation, audio, generation, or encoding.
3. Change only the owning layer.
4. Preserve unrelated timing and accepted work.
5. Verify before, during, and after the changed interval.

### Extend

1. Match the established style, subject identity, motion grammar, audio bed, frame rate, and color treatment.
2. Continue from a clean visual and audio boundary.
3. Reuse continuity anchors and accepted references.
4. Adjust downstream timing deterministically.
5. Check the join for visual discontinuity, audio clicks, and caption drift.

### Remake

1. Analyze the reference into structure, pacing, layout, camera, motion, typography, sound, and emotional beats.
2. Rebuild the system and intent; do not blindly trace accidental artifacts.
3. Preserve exact brand or legal elements only from approved source assets.
4. Compare hero frames and timing side by side.

### Scene Modification

- Replace, reorder, trim, split, merge, freeze, speed-ramp, crop, reframe, stabilize, track, mask, key, blur, redact, recolor, grade, clean up, upscale, restyle, or regenerate at scene scope.
- For rendered-only inputs, analyze shots, speech, frames, and streams first; reconstruct only the layers required for the requested edit.
- Update transitions and dependent timestamps after structural changes.
- Keep outgoing scenes fully readable until the transition takes control.
- Never solve a local scene defect by regenerating the entire video unless continuity cannot otherwise be recovered.

### Sound Modification

- Separate dialogue, narration, music, ambience, and effects conceptually and physically when possible.
- Use FFmpeg or dedicated audio tools for analysis, trimming, silence detection, denoise, resampling, channel work, and loudness normalization.
- Use the composition engine for time-varying volume, fades, ducking, sync, and visual reaction.
- Add short fades at edit boundaries to prevent clicks.
- Preserve intelligibility over music and effects; check the final mix for clipping, abrupt level changes, missing channels, and sync drift.
- If changing playback speed, decide explicitly whether pitch should be preserved.

### Captions And Text

- Derive timing from the approved audio or transcript.
- Keep captions inside safe areas and away from key faces, controls, and platform overlays.
- Fit text using measurement, not guessed line breaks.
- Preserve exact legal copy, names, amounts, URLs, and calls to action.
- Verify every caption against the spoken audio after timing changes.

## Generation Contract

Before a provider call, compile a structured brief containing:

- subject and identity;
- action and temporal progression;
- setting and spatial relationships;
- composition, lens, camera, and motion;
- lighting, material, color, and style;
- continuity anchors and protected attributes;
- duration, aspect ratio, resolution, and audio requirements;
- permitted variation and prohibited changes.

Store each output with prompt version, model, parameters, source references, parent asset, safety result, and selection status. Do not overwrite accepted assets.

Generate multiple candidates during exploration. Narrow variation after selection. Revise locally when possible.

## Determinism

- Drive animation from frame or composition time.
- Avoid `Math.random()`, `Date.now()`, unseeded randomness, timers, and runtime-dependent layout.
- Keep source assets immutable and give derived assets stable names.
- Make retries idempotent and long-running jobs resumable.
- Keep provider response schemas outside the core timeline and asset model.
- Never ask an image or video model to guarantee exact typography, logos, legal copy, or frame timing.

## Verification Gate

Do not call a video complete until the applicable checks pass:

1. Project lint, typecheck, tests, and engine validation.
2. Render representative stills: opening, every hero frame, transition boundaries, changed scenes, and final frame.
3. Preview the complete timeline when feasible.
4. Check duration, dimensions, frame rate, codec, audio streams, and file integrity.
5. Check black frames, frozen frames, missing assets, clipping, overflow, collisions, caption drift, transition discontinuities, and nondeterministic output.
6. Check dialogue clarity, sync, fades, silence, loudness consistency, and peaks.
7. Check consent for cloned faces or voices, music and asset usage rights, and required safety disclosures.
8. Compare the delivered artifact against the user's requested platform and acceptance criteria.

For HyperFrames, run `lint`, `validate`, and `inspect`; use the bundled animation and contrast scripts (`scripts/hyperframes-animation-map.mjs`, `scripts/hyperframes-contrast-report.mjs` in this skill) for substantial motion work. For Remotion, run the project checks and render at least one representative still, then render or preview the affected composition.

## Response Contract

Be concrete about:

- what changed;
- which engine and assets are now authoritative;
- what was generated versus assembled deterministically;
- what verification ran;
- where the final render or preview lives;
- any remaining concern that could affect quality.

For reviews, lead with findings ordered by severity and cite files and lines.
