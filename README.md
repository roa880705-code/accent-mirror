# Accent Mirror v0.12.0 Timeline Voice Script

Accent Mirror is a Japanese listener-facing pronunciation mirror.

Concept:

> Not how you speak. How they hear.

This prototype is not a simple pronunciation score app. It diagnoses how a learner's English may be heard, then turns that into a Japanese mirror experience.

## Current Architecture

- Browser microphone recording
- Node.js + Express local API
- Azure Speech Pronunciation Assessment
- Azure TTS for Japanese Mirror Voice
- API-first design, suitable for a future iPhone app:

```text
iPhone app -> API server -> Azure Speech / Azure TTS -> app response
```

Azure keys must stay on the API server, not inside the iPhone app.

## v0.12.0 Focus

v0.12.0 adds `Timeline Voice Script`.

The mirror engine now builds:

- `mirrorTimeline.phonemeTimeline`
  - word
  - phoneme
  - score
  - startMs
  - durationMs
  - vowel/consonant class

- `mirrorTimeline.japaneseMirrorTimeline`
  - source word
  - kana mirror
  - severity
  - reason
  - timing
  - pauseAfterMs

- `mirrorTimeline.pitchOverlay`
  - intonation status
  - early/final Hz
  - rise/fall in semitones

- `voiceScript`
  - Japanese voice segments
  - per-segment rate/pitch
  - real pause durations from the timeline

This is the bridge from:

```text
English phoneme analysis -> Japanese kana mirror -> Japanese Mirror Voice
```

## Current Test Phrase Coverage

The acoustic kana renderer currently has hand-tuned support for:

- Could
- you
- help
- me

Examples:

- final `d` only in `could`: `クドゥ(?)`
- long vowel + strong final `d`: `クルド?`
- weak `l` in `help`: `ヘウプ`
- weak `l` and `p` in `help`: `ヘウ`

## Run

Double-click:

```text
start-3003-visible.cmd
```

Or run from this folder:

```powershell
node server.js
```

Then open:

```text
http://localhost:3003/
```

Health check:

```text
http://localhost:3003/api/health
```

## Check

PowerShell may block `npm.ps1`, so use:

```powershell
node --check server.js
node --check src/services/mirrorGeneratorService.js
node --check src/services/azureTtsService.js
node --check public/app.js
```

or double-click:

```text
check-v012.cmd
```

## Next Product Step

Use real validation attempts to tune:

- kana mirror accuracy
- pause mapping
- weak-consonant Japanese voice behavior
- pitch/final-contour mapping
- more natural Japanese TTS voice selection

