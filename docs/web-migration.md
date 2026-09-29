# XiangMeta Web migration

Implementation follows the approved [source audit](web-portfolio-audit.md).
The original engine is Three.js 0.180 with TypeScript and Vite, not Unity or
Godot. No engine rewrite was needed.

## Reused and changed

The four islands, ten exhibit positions, procedural architecture, WASD
movement, collisions, jumping, teleports, terrain, seasons, weather, memories,
discoveries and photo mode remain in the original implementation.

The entry is now three static pages: `/`, `/projects/`, `/world/`.
`modules/*/manifest.json` remains the authoring source, with an optional
`portfolio` section. `data/profile.json` holds public identity/contact links.
The Vite content plugin validates manifests and emits public JSON plus an
allowlist of referenced images and compressed background tracks. The frontend never calls `/api/`.

The five Python model interfaces are replaced by project descriptions and
verified GitHub links. No backend/model inference is implied by the UI.
The two research simulations already used browser Workers and remain local
browser computations with demonstration parameters.

All four personal albums use the exact NetEase links supplied by the author.
The artist profile is also linked. 《燕来有声》 retains its existing poster,
team credits and Bilibili MV link. At the author's subsequent request, seven
original BGM tracks and all four seasonal cues are restored as compressed MP3.
Album recordings, WAV and MP4 remain external/local archives. No music is
requested until the visitor clicks the sound button. Chimes remain synthesized.

World refinements preserve the established terrain heights, exhibit positions,
routes and colliders. Sculpted island strata replace the old conical foundations
below the walking plane; richer coastal water, directional light, gallery trim,
tower facades and stage canopies add detail. The walking HUD has a fixed center
and reserved text widths. F/E/R keycaps use explicit dark text on light keys.

Physical consoles and nearby cards share `src/core/nearby-actions.ts` with
keyboard availability. Projects show F GitHub, or F exhibition when no
repository is linked, E About, and R Demo/music/MV when configured. The bottom
button uses the same primary action. Artwork keeps its own F inspection action,
and the harbor shows only F routes, without unrelated project actions.
Discoveries and memory fragments now use G, avoiding the old R conflict.
Photo mode retains Q/E altitude controls and pauses ordinary world actions.

## Loading and size

The 2026-09-29 production build measured approximately:

| Payload | gzip |
|---|---:|
| Ordinary page JS + CSS, including shared helper | 8.4 KB |
| Shared projects JSON | 13.2 KB |
| World code + engine + styles, excluding content | 271 KB |
| World JSON | 19.0 KB |

Vite gzip figures are estimates, not measured network transfer on GitHub Pages.
Image assets total about 10.6 MB on disk, but are not all fetched at entry.
The 20 entry previews total 384,324 bytes. MP3 payload totals 46,206,683 bytes,
down from 83,048,502 bytes; each track downloads on demand. This is the complete
background library size, not the initial page download.

The world program downloads only after choosing the world entrance. An
indeterminate program-download indicator precedes counted scene-construction
stages. Stage progress is not presented as byte-download percentage.
Construction yields between islands and exhibits, then starts walking only
after the collision world and artwork previews are ready. Preview progress
counts completed images. Detail textures upgrade on entering their region or
using map/photo mode, with an async guard so a late preview cannot replace a
sharper image. Thumbnail/full-image separation remains in the photography collection.

The original checkout includes `scripts/prepare-web-media.py`, a one-time
authoring tool using Pillow and FFmpeg/libmp3lame. It keeps the masters intact.
Generated media and `data/audio.json`, `data/image-previews.json`,
`data/media-sizes.json` are included in the clean export; CI needs no Python
or FFmpeg. MP3 settings are VBR q2, 44.1 kHz stereo, average 122–194 kbps across
the recordings. All 11 outputs decode successfully; decoded durations match
their originals within 0.04 seconds. Original MP3 header estimates are less
accurate than decoded durations. No subjective listening comparison is claimed.

Existing static batching, instancing, capped DPR and shadow throttling remain.
The original procedural construction and first shader compilation can still
take noticeable time on older GPUs. This V1 does not stream region geometry,
and is intended primarily for desktop browsers. KTX2, imported-model
compression and geometry LOD are deferred until profiling or new assets
justify them.

## Validation

`npm run build` passes TypeScript and Vite production compilation.
`npm test` passes 20 Web/export, movement, terrain, physics and music-programme checks.

The production site was served through a strict static server, with no SPA
rewrite. Expanded Chromium assertions passed with the site built and served
both at `/` and under `/xiangmeta/`:

- Lightweight landing with no Three.js or image downloads.
- Project category/search and refresh; album links and no embedded players.
- World boot, project deep link, first-person movement and jumping.
- E opening project information, F opening GitHub and R opening NetEase.
- All ten physical console hints matching their nearby F/E/R buttons; every
  project without a repository opening its exhibition with F and its details
  with E. Bottom-button and floating-button clicks use the same actions.
- Harbor showing only F routes; E/R do not open an unrelated project.
- Photo-mode E raising the camera without opening a project panel; G
  collecting a memory after teleporting to it.
- Map view and music gallery; touch-device recommendation and mobile layout.
- WebGL unavailable: visible fallback, then all projects accessible.
- Distant artwork visible before region arrival; fixed HUD while walking.
- Legible F/E keycaps; opt-in MP3 playback and all four seasonal premieres.
- Pause/resume retains playback position; revisiting a region does not restart its cue.
- Central-hub BGM starts from the seven-track playlist; both research Workers
  recompute their curves after changing parameters.
- No page errors, failed HTTP responses or API requests; no MP3 before opting in.

Final visual checks at 1600×1000 and DPR 1.5 cover the overview, night, both
galleries and MV stage. No shader/console errors were observed. Representative
render snapshots recorded 750 draw calls / 1.22M triangles for the full map,
and 112–250 calls / 0.54–0.65M triangles for the three exhibit approaches.
These include view-dependent rendering work and are not an FPS benchmark.
The overview remains heavier than normal walking. Reduced quality switches
to DPR 1 and disables shadows; its UI path was also checked.

The initial checks (before the additional R/G/photo/WebGL cases) also passed
in Playwright WebKit, but the host sandbox reported restricted WebKit storage
writes on process exit. This is partial WebKit evidence, not a clean Safari
release result. Actual Windows Chrome/Edge and macOS Safari still require a
device-level smoke check.

Browser evidence is in `artifacts/web/` (ignored); README screenshots are
copied to `docs/images/`. The GitHub workflow runs Chromium on Linux.
The MV stage poster was also visually checked from its first-person approach.

## Publishing and remaining boundaries

`npm run export:pages` creates `.runtime/pages-source/` with only public source
and referenced images plus the 11 compressed background tracks. It strips local runtime/media fields from manifests,
removes Electron tooling from the exported package and creates a fresh lock
file based on the existing pinned dependency tree. Original media and the
current Git repository remain untouched. It refuses to overwrite an existing
export directory.

The clean source was independently verified with `npm ci --ignore-scripts`,
`npm run build` and all 20 regression tests. Its dependency installation has
30 packages and no Electron tooling. The obsolete local audio mixer is kept
only in the original checkout and is not imported by the website or exported.

Only `dist/` is uploaded by the GitHub Actions deployment. Public availability
is established only after an authenticated push and a successful Pages run;
preparing the local workflow is not itself a deployment.

At this handoff the environment had no usable GitHub HTTPS credentials,
SSH-agent identities or GitHub connector. No remote repository was created
or pushed, and the public URL has not been verified. Follow the README's
publishing commands after connecting the author's GitHub account.
