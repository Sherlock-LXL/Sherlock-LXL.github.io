# Web 使用与架构 · Web Guide

## Controls

| Input | Action |
|---|---|
| WASD / arrows | Walk |
| Shift | Run |
| Space | Jump |
| Click canvas / drag | Look around; drag works when pointer lock is unavailable |
| F | Experience the nearby AI project in a window; other exhibits open GitHub/exhibitions, artwork or harbor routes |
| E | Project description, technologies, results and exhibition |
| R | Demo / music / MV, shown only when a destination exists |
| G | Discoveries and memory fragments |
| Q | Pick up / place seasonal objects, or pet the animal you face |
| T | Ride a deer / polar bear, or dismount on clear ground |
| P | Photo mode; WASD moves, Q / E changes altitude |
| Esc | Close panel / release pointer |
| Sidebar region | Teleport |
| World overview | Orbit map |
| ♪ sound button | Start / pause background music, seasonal cues and chimes |

Touch devices have a movement joystick, drag-to-look, jump and contextual
interaction buttons. The Help panel offers reduced rendering quality.

The original four islands contain 16 portable objects and ten animals.
Animals alternate between resting, wandering, grazing and curious looks;
petting produces hearts. Mounts move 1.45× faster and jump higher within their
home island. Object placement requires clear, level ground and keeps entrances
open. Object arrangements last for the current visit.

Island Time includes distant tornadoes, hail, aurora and sunset skies. Choosing
aurora or sunset also selects a suitable hour. Photo mode freezes their motion.
Run `node tests/living-browser.mjs` for the object, pet, mount and weather checks;
`TEST_WEBKIT=1` includes WebKit.


## Content and architecture

```text
index.html                   Landing
projects/index.html          Filterable Portfolio
world/index.html             Deferred 3D entrance
ai-lab/index.html            Three original models, standalone or embedded
data/profile.json            Name, introduction, GitHub and music profile
data/world.json              Original islands and world layout
data/audio.json              Seven BGM tracks, four seasonal cues, playback gain
data/image-previews.json     Real artwork preview → detail mapping
modules/<id>/manifest.json   Single authoring source for project + world data
modules/<id>/scene.ts        Optional original procedural scene extension
modules/<id>/assets/         Author-supplied images; local media archive
shared/                     Schemas, physics, navigation and collision rules
src/portfolio-page.ts        Lightweight ordinary pages
src/main.ts                 World interface and project actions
src/core/nearby-actions.ts   Shared key/label definitions for signs, HUD and input
src/world/                  Original world implementation
scripts/web-content.mjs      Validated static content + asset allowlist
.github/workflows/pages.yml  Build, test and deploy on main
```

The build generates `content/projects.json` and `content/world.json` from the
same manifests. Do **not** edit the generated JSON. The export strips Python
runtime settings, model forms, album audio sources and private configuration.
Only the compressed background/seasonal tracks in `data/audio.json` are exported.

Add an exhibit with a manifest using an existing visual preset, then give it
a `portfolio` section:

```json
{
  "name": "My Project",
  "category": "AI",
  "summary": "A short, factual description.",
  "technologies": ["Python", "PyTorch"],
  "github": "https://github.com/your-name/your-project",
  "order": 11,
  "featured": false
}
```

Supported categories: `AI`, `Research`, `Engineering`, `Creative`. `github`,
`demo`, `screenshots` are optional; absent links are hidden. Region-local
`position`, `visual`, `rotation`, `facts` and `story` stay in the same manifest.
Existing module schemas and optional `scene.ts` provide the full contract.
A new valid manifest automatically appears in both experiences; no registry
edit is required. Projects without verified source URLs remain browsable
without an invented GitHub link.
Physical consoles, nearby cards and the bottom action button share the same
F/E/R definitions. F always performs the displayed primary action; E opens
project details, and R appears only when a Demo/music/MV destination exists.


## Web scope and performance

- Five AI project archives link to their source repositories. Local Python
  inference remains in the historical source for other projects. Gift Chooser,
  Expression CNN and Blind Verse now run their original models in AI Lab,
  using JavaScript or ONNX Runtime Web WASM in a Worker.
- Both bubble research simulations still run in a browser Worker. Parameters
  illustrate the equations; they are not fitted experimental predictions.
- Albums use the author's supplied NetEase links; the MV links to Bilibili.
  The original seven BGM tracks and four seasonal cues are retained as MP3.
  They download only after clicking ♪, with crossfades, pause/resume and a
  shuffled BGM playlist. Each seasonal cue premieres once per tab journey.
- The 11 background tracks use LAME VBR q2, 44.1 kHz stereo: **83.05 MB →
  46.21 MB** (44% smaller). Playback gain balances loudness without changing
  the recordings' dynamics. Original masters remain in the local archive.
  Optional chime/interface sounds remain synthesized.
- Home and Projects do not import Three.js. World loading has a program
  download indicator, followed by measured construction-stage progress.
- All core collision geometry and **20 real artwork previews (384 KB total)**
  are ready before the loading screen closes. Region arrival upgrades the
  same textures; map/photo mode upgrades all. Full photography originals
  still load only when explicitly opened.
- Static batching, instancing, capped pixel ratio, shadow update throttling
  and the original procedural architecture are preserved. The revised world
  adds sculpted rock strata, coastal reflections/foam, warm architectural
  details and stronger directional lighting. Default DPR is capped at 1.5;
  2048px shadows update three times per second. Reduced quality remains available.
- WebGL failure offers a direct Portfolio link. Refreshing `/projects/` and
  `/world/` works with real directory index files; no SPA rewrite is needed.

There are no original GLB models to compress in this version. Draco/Meshopt,
KTX2 and additional geometry LOD remain options if future imported assets
justify them. See [migration notes](web-migration.md) for measured build
sizes and validation limits.
