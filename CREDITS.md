# Credits & media rights

## Original work

XiangMeta and its procedural world: 李湘伦 / Sherlock-LXL. Original software
is available under the [MIT License](LICENSE).

The author explicitly confirmed during the Web migration that the supplied
internal music and other media are their own and that they hold the necessary
copyright rights. This is the basis for displaying the supplied covers,
photography, lyrics and MV poster. It does not grant visitors permission to
reuse the media independently. Team credits remain visible in the exhibits.

| Material | Source / attribution | Web treatment |
|---|---|---|
| Architecture, terrain, vegetation, roads, ocean, interface icons | Existing XiangMeta procedural code | Reused; no purchased 3D asset pack found |
| 14 photographs | Author's original photography, `modules/photography/assets/` | WebP thumbnails; full image on request |
| Four personal albums | Author's original music and covers | Covers and selected track archive; listening links below |
| Seven BGM recordings and four seasonal cues | Author's original music | Opt-in compressed MP3; original full-length recordings, playback gain only |
| 《燕来有声》 | 未名拾音 · 团队项目; rights confirmed by author | Existing WebP poster; external Bilibili MV |
| Root `燕来有声.png` | Supplied backup MV cover | Preserved locally; existing optimized WebP used online |
| Research descriptions and equations | Existing module manifests and `shared/research-physics.mjs` | Original attribution retained; interactive calculations use demonstration parameters |
| Original audio/video masters and album recordings | Author's local archive | Excluded from the static site and clean Pages source export |

The 20 distant-view previews are resized versions of the supplied photographs,
album covers and MV poster. No substitute imagery is used. Background music
is encoded with FFmpeg/libmp3lame (VBR q2, stereo); these tools are used locally
to prepare media and are not bundled with the website.

## Music destinations

- [Artist / 个人主页](https://music.163.com/#/artist?id=46962347)
- [Secret](https://music.163.com/#/album?id=172971428)
- [星辰代我想你](https://music.163.com/#/album?id=181322022)
- [近地轨道](https://music.163.com/#/album?id=249590756)
- [二分之一星球](https://music.163.com/#/album?id=286933696)
- [燕来有声 · Bilibili MV](https://www.bilibili.com/video/BV1kCTX6uEf7/)

## Third-party software

| Software | Role | License |
|---|---|---|
| Three.js 0.180, including addons | WebGL rendering, controls, geometry utilities | MIT; © 2010–2025 three.js authors |
| Zod 4 | Build-time manifest validation | MIT; © 2025 Colin McDonnell |
| Vite 7 | Development server / bundler | MIT; dependency notices in package |
| TypeScript 5 | Type checking | Apache-2.0 |
| Playwright | Browser validation | Apache-2.0 |
| Electron / electron-builder | Retained historical desktop tooling; absent from Web runtime | MIT |

The build copies the installed Three.js and Zod license texts into
`dist/THIRD_PARTY_NOTICES.txt`. `package-lock.json` fixes the dependency tree.
Installed package licenses remain authoritative for dependencies and tooling.
No external fonts, analytics, music streams, paid models or texture packs are
required to load the site.
