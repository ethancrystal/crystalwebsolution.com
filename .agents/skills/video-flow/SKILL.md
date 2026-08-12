---
name: video-flow
description: Parse a local video into a per-second, human-readable index (frames + transcript + scene cuts + metadata) plus an editable JSON manifest that re-renders the video when changed — editing video by editing text. Use this skill whenever the user says "go with the flow", or asks to index, break down, analyze, or map out a video; build an editable timeline or edit-decision-list from a video; extract frames, audio, transcript, or metadata from a video; or trim/cut/reorder a video by editing a manifest instead of using a GUI editor. Runs on Linux or WSL2 and requires ffmpeg.
---

# Video Flow

Turn a video file into two things: an **index** you can read and a **manifest** you can edit. Change the manifest, re-render, and the video changes. This is a non-linear editor whose project file is plain text.

## The two artifacts

1. **Analysis index** — `index.json` (source of truth) + `index.md` (readable view with inline thumbnails). One row per second: timecode, frame thumbnail, scene number, and the words spoken at that moment. This is for *seeing* what the video contains. Editing it does nothing to the video.

2. **Edit manifest** — `manifest.json`. An ordered timeline of segments. This is the part that round-trips: reorder it, trim it, drop segments, mute audio — then render. See `references/manifest-schema.md` for every operation.

Editing the index does not edit the video. Editing the manifest and rendering does. Keep that distinction clear when talking to the user.

## Prerequisites

This skill runs on **Linux or WSL2** and shells out to `ffmpeg`. Check and install once:

```bash
ffmpeg -version >/dev/null 2>&1 || sudo apt update && sudo apt install -y ffmpeg
python3 -c "import faster_whisper" 2>/dev/null || pip install faster-whisper
```

`faster-whisper` is optional — without it, ingest still works but the transcript column is empty. With it, the first run downloads a model (~140 MB for `base`).

All commands are subcommands of `scripts/flow.py`. Run `python3 scripts/flow.py <command> -h` for options.

## Workflow

When the user says **"go with the flow"** (or asks to index / break down / build an editable timeline from a video), run these steps in order. Do not skip the file-selection step — the user picks, never assume.

### 1. List the videos

```bash
python3 scripts/flow.py list
```

On WSL2 this auto-finds `/mnt/c/Users/<you>/Documents/Videos` (it skips system accounts like `Public`/`Default`). It prints JSON.

- If it returns `{"ambiguous": [...]}` — more than one Windows user has a Videos folder. Ask the user which one, then re-run with `--dir`.
- If it errors — ask the user for the folder path and pass `--dir "/mnt/c/..."`.
- Present the `videos` list to the user as a clean numbered menu (name + size). Ask which one.

### 2. Ingest the chosen video

```bash
python3 scripts/flow.py ingest "/mnt/c/Users/you/Documents/Videos/clip.mp4"
```

This copies the file into a **native-filesystem workspace** at `~/video-flow/<slug>/`, then extracts metadata (`ffprobe`), per-second frame thumbnails, the audio track, a timestamped transcript, and scene-cut points. It prints the workspace path — capture it; the next steps need it.

The copy is deliberate. Files under `/mnt/c` are bridged from Windows and are ~10× slower for the heavy I/O this skill does. Tell the user the workspace lives in WSL's native filesystem, and that final results get copied back next to their video in step 6.

Useful flags: `--skip-transcribe` (faster, empty transcript), `--model small` (more accurate, slower), `--scene-threshold 0.4` (less sensitive scene detection; default 0.3).

### 3. Build the index and manifest

```bash
python3 scripts/flow.py index "~/video-flow/<slug>"
```

Produces `index.json`, `index.md`, and `manifest.json` in the workspace.

### 4. Show the user what they've got

Open `index.md` and walk the user through it — duration, resolution, scene count, and that each row is one second. For a long video the per-second table is large; offer to surface just the scene-change rows or just rows containing speech if they want a faster overview. Tell them `manifest.json` is the file to edit.

### 5. Edit the manifest

The user can edit `manifest.json` directly, or describe the edit and you make it. The `timeline` array is an ordered list of segments — array order is output order. Read `references/manifest-schema.md` before editing so you use the operations correctly (`keep`/`drop`, reorder, trim via `source_start`/`source_end`, `audio: mute`). Before rendering, confirm with the user exactly which edits are about to be applied.

### 6. Render and publish

```bash
python3 scripts/flow.py render "~/video-flow/<slug>"
python3 scripts/flow.py publish "~/video-flow/<slug>"
```

`render` rebuilds the video as `render.mp4` from the current manifest. `publish` copies the user-facing artifacts (index, manifest, render, frames) into a `<name>-flow/` folder right next to the original video, so they appear in Windows Explorer.

## Render notes

- Cuts are **frame-accurate**, which means segments are re-encoded, not stream-copied. This is correct but not instant — a long or high-resolution video takes real time. Warn the user before starting a big render.
- The render never touches the original file. It is always a new `render.mp4`.
- If a render ever fails at the concat stage, it usually means segments have mismatched parameters — re-run `ingest` so all parts derive from one clean source copy.

## Tone

The user may be a video creator, not a command-line user. Explain what each step is doing in plain language, surface the index visually rather than dumping JSON, and treat the manifest as a creative tool — "here's the timeline, what do you want to change" — not a config file lecture.
