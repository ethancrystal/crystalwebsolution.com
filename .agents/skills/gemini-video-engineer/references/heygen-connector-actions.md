# HeyGen Connector Actions

This catalog describes the HeyGen app actions exposed when this skill was consolidated. Connector capabilities can change. Use tool discovery before calling an action, then follow the live schema when it differs from this reference.

## Safety And Routing

- Prefer the authenticated HeyGen app when available.
- Use hosted HTTPS media or an existing HeyGen `asset_id`.
- The connector does not accept local filesystem paths as media inputs. Upload local media first through the HeyGen CLI or approved asset-upload path.
- Poll asynchronous jobs with their matching `get` action.
- Get explicit confirmation before permanent deletion.
- Private avatars require consent before video generation.
- Use the same Video Agent `sessionId` to continue an existing video conversation; omit it for a new video.

## Shared Types

### AssetInput

One of:

```json
{"type":"url","url":"https://..."}
```

```json
{"type":"asset_id","asset_id":"..."}
```

Voice cloning may also expose an inline binary media form in the live schema.

### Pagination

List actions use:

- `limit`: page size;
- `token`: opaque cursor returned by the previous page.

### Video Background

```json
{"type":"color","value":"#000000"}
```

```json
{"type":"image","url":"https://..."}
```

or an image `asset_id` when supported by the live schema.

### Voice Settings

Video creation can accept:

- `locale`;
- `speed`;
- `pitch`;
- `volume`;
- `engine_settings`.

Engine settings are provider-specific. Live schemas may expose ElevenLabs settings such as model, stability, similarity boost, style, and speaker boost; Fish settings such as model, stability, and similarity; or an engine type alone.

### Presenter Video Options

The avatar and image video actions share most of these fields:

- `script` or one of `audioAssetId` / `audioUrl`;
- `voiceId` when synthesizing the script;
- `voiceSettings`;
- `aspectRatio`: `16:9` or `9:16`;
- `resolution`: `720p`, `1080p`, or `4k`;
- `outputFormat`: `mp4` or `webm`;
- `background`;
- `caption`: SRT/default style options exposed by the live schema;
- `motionPrompt`;
- `expressiveness`: `low`, `medium`, or `high`;
- `removeBackground`;
- `title`;
- `callbackId` and `callbackUrl`.

## Account

### `_get_current_user`

Return the authenticated user's profile, remaining credits or balance, and billing details. Use before a credit-spending job (video, translation, lipsync, avatar training) to confirm sufficient balance.

- no parameters.

## Avatars

### `_list_avatar_groups`

List character identity groups.

- `ownership`: `public` or `private`;
- `limit`;
- `token`.

### `_get_avatar_group`

Get group details, previews, look count, and training status.

- required `groupId`.

### `_list_avatar_looks`

List concrete looks. The returned look ID is the `avatarId` used for video generation.

- `groupId`;
- `avatarType`: `studio_avatar`, `digital_twin`, or `photo_avatar`;
- `ownership`: `public` or `private`;
- `limit`;
- `token`.

### `_get_avatar_look`

Get supported engines, preferred orientation, previews, and training status.

- required `lookId`.

### `_update_avatar_look`

Rename a photo-avatar or digital-twin look.

- required `lookId`;
- `name`.

### `_create_prompt_avatar`

Create an asynchronous avatar from text.

- required `name`;
- required `prompt`;
- `avatarGroupId` to add a look to an existing identity;
- `referenceImages`: up to three `AssetInput` items, usable with an existing group when supported.

### `_create_photo_avatar`

Create a photo avatar.

- required `name`;
- required `file`: `AssetInput`;
- `avatarGroupId`.

### `_create_digital_twin`

Train a digital twin from video footage.

- required `name`;
- required `file`: `AssetInput`;
- `avatarGroupId`.

### `_create_avatar_consent`

Start the consent flow required for a private avatar.

- required `groupId`;
- `rerouteUrl`.

## Voices And Speech

### `_list_voices`

List voices.

- `type`: `public` or `private`;
- `engine`, such as `starfish`;
- `language`;
- `gender`;
- `limit`;
- `token`.

Use `engine: "starfish"` to find voices compatible with connector speech synthesis.

### `_get_voice`

Get voice details or poll a voice clone.

- required `voiceId`.

### `_design_voice`

Return up to three voices matching a natural-language description.

- required `prompt`;
- `gender`;
- `locale`;
- `seed` for deterministic alternate batches.

### `_clone_voice`

Create an asynchronous voice clone.

- required `audio`: `AssetInput` or supported inline media;
- required `voiceName`;
- `language`;
- `removeBackgroundNoise`.

Poll with `_get_voice`.

### `_create_speech`

Synthesize speech and return an audio URL, duration, and possibly word timings.

- required `text`: 1-5000 characters;
- required `voiceId`, compatible with the `starfish` engine;
- `inputType`: `text` or `ssml`;
- `language`;
- `locale`;
- `speed`: 0.5-2.0.

## Direct Video Creation

### `_create_video_from_avatar`

Create a presenter video from a HeyGen look.

- required `avatarId`;
- provide `script` plus `voiceId`, or provide `audioAssetId` / `audioUrl`;
- accepts the shared Presenter Video Options.

### `_create_video_from_image`

Animate an arbitrary image with speech or supplied audio.

- required `image`: `AssetInput`;
- provide `script` plus `voiceId`, or provide `audioAssetId` / `audioUrl`;
- accepts the shared Presenter Video Options.

### `_list_videos`

List account videos.

- `folderId`;
- `title`: substring filter;
- `limit`;
- `token`.

### `_get_video`

Get status, output URL, thumbnail, duration, or failure information.

- required `videoId`.

### `_delete_video`

Permanently delete a video and associated files.

- required `videoId`.

## Video Agent

### `_video_agent_generate`

Create a new Video Agent session or continue one.

- required `prompt`: the direct, specific video request;
- `conversationContext`: expand all referenced scripts, facts, brand rules, and prior decisions rather than saying “as above”;
- `sessionId`: include to continue, omit to create a new video session.

Call only when the topic and narrative direction are specific enough to generate.

### `_list_video_agent_styles`

List curated Video Agent visual styles.

- `tag`, such as `cinematic`, `retro-tech`, `iconic-artist`, `pop-culture`, `handmade`, or `print`;
- `limit`;
- `token`.

### `_list_video_agent_sessions`

List sessions newest first.

- `limit`;
- `token`.

### `_get_video_agent_session`

Get progress, status, `video_id`, and recent messages.

- required `sessionId`.

### `_stop_video_agent_session`

Stop an active run at its next checkpoint while preserving partial results.

- required `sessionId`.

### `_list_video_agent_session_videos`

List videos produced by a session.

- required `sessionId`.

### `_get_video_agent_resource`

Get a session resource such as an image, video, draft, avatar, or voice.

- required `sessionId`;
- required `resourceId`.

## Video Translation

### `_list_video_translation_languages`

Return valid target-language names. No parameters.

### `_create_video_translation`

Translate and dub a video into one or more languages with voice cloning and lipsync.

- required `video`: `AssetInput`;
- required `outputLanguages`: array of names returned by the language-list action;
- `mode`: `speed` or `precision`;
- `inputLanguage`;
- `speakerNum`;
- `audio`: optional custom dubbing `AssetInput`;
- `brandVoiceId`;
- `srt`: optional subtitle `AssetInput`;
- `srtRole`: `input` or `output`;
- `startTime`, `endTime`;
- `translateAudioOnly`;
- `disableMusicTrack`;
- `enableCaption`;
- `enableDynamicDuration`;
- `enableSpeechEnhancement`;
- `enableWatermark`;
- `keepTheSameFormat`;
- `fpsMode`: `vfr`, `cfr`, or `passthrough`;
- `folderId`;
- `title`;
- `callbackId`, `callbackUrl`.

The action returns one translation ID per target language.

### `_update_video_translation`

Update the display title of a video translation job. Metadata only; does not re-run the translation.

- required `videoTranslationId`;
- `title`.

### `_list_video_translations`

List translation jobs.

- `limit`;
- `token`.

### `_get_video_translation`

Get status, target language, output URL, or failure details.

- required `videoTranslationId`.

### `_delete_video_translation`

Permanently delete a translation and associated files.

- required `videoTranslationId`.

## Lipsync

### `_create_lipsync`

Replace a video’s audio and re-animate mouth movement.

- required `video`: `AssetInput`;
- required `audio`: `AssetInput`;
- `mode`: `speed` or `precision`;
- `startTime`, `endTime`;
- `disableMusicTrack`;
- `enableCaption`;
- `enableDynamicDuration`;
- `enableSpeechEnhancement`;
- `enableWatermark`;
- `keepTheSameFormat`;
- `fpsMode`;
- `folderId`;
- `title`;
- `callbackId`, `callbackUrl`.

### `_update_lipsync`

Update the display title of a lipsync job. Metadata only; does not re-run the job.

- required `lipsyncId`;
- `title`.

### `_list_lipsyncs`

List lipsync jobs.

- `limit`;
- `token`.

### `_get_lipsync`

Get status, output video URL, caption URL, or failure details.

- required `lipsyncId`.

### `_delete_lipsync`

Permanently delete a lipsync job and associated files.

- required `lipsyncId`.

## Asynchronous Job Pattern

1. Validate source assets, consent, language, orientation, and output needs.
2. Call the matching create action once.
3. Store the returned ID immediately.
4. Poll the matching `get` action at a reasonable cadence.
5. On completion, preserve the output URL and lineage.
6. On failure, report the provider error and change the request before retrying.
7. Do not submit duplicate jobs while the first is still active.
