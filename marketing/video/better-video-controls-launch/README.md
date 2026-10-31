# Better Video Controls — product film

20 seconds, 1920 × 1080, 30 fps, music + effects. Built from scratch in HyperFrames; nothing from
`../better-video-controls-promo` is reused.

## Deliverable

- `better-video-controls-film.mp4` — the master (H.264 + AAC).
- `index.html` + `compositions/` — the editable film. Preview: `npm run dev`, or
  `npx hyperframes preview --background`. Re-render:
  `npx hyperframes render --output better-video-controls-film.mp4 --fps 30 --quality delivery --video-frame-format png`

## Sequence

| Time | Line | What happens |
| --- | --- | --- |
| 0–5.5 s | Video in the background. / Just scroll to rewind. / Never leave your work. | Notes is the focused window, the browser plays *Spring* behind it. The cursor lands on the film without clicking, two fingers scroll, the extension's seek bar appears and the film rewinds. Notes keeps typing straight after ("Found it at 0:10"). The camera glides onto the film. |
| 5.5–8.5 s | Seek 3× faster. / Or ¼× finer. | ⌥ and ⌥⇧ key caps, the real "Fast seeking" / "Slow seeking" labels, the bar jumps then creeps. |
| 8.5–16 s | Loop it. Mark it. Boost it. Speed it. Dim it. Tint it. Snap it. Float it. | A–B loop range, bookmark marker ("Bookmark this moment"), volume pill + "Volume boost 5×", 1× → 2× (film plays at 2×), Cinema Mode floods the page black, Vivid then Mono presets, screenshot flash + "Screenshot saved.", then the player flicks into a mini player. |
| 16–20 s | Better Video Controls · Available for Chrome and Firefox | The mini player closes into the app icon; the name and both browsers land. |

All labels, numbers and colours come from the extension's source: 3× / ¼× defaults, `MAX_VOLUME_BOOST = 5`,
speed 0.25–4×, filter presets in `helpers/youtube-filters-menu.ts`, loop `#F3CD45`, marker `#38D9FF`,
the timeline track styles in `helpers/timeline-appearance.ts`, the Cinema preset `#000000`.

## How the footage works

HyperFrames never seeks a `<video>`, so each scroll, seek, the 2× speed and the Vivid/Mono filters are baked into
`assets/film-desktop.mp4` and `assets/film-studio.mp4` by `capture/bake.py`, from the segment table in
`capture/film-map.json`. The seek-bar tweens in the scenes use the same segments and eases, so bar and picture agree.
To change a seek: edit `film-map.json`, re-run `python3 -I capture/bake.py <Spring webm>`, and update the matching
`scaleX` tween (progress = (source seconds − 380) / 24).

## Credits and licences

- Film: **“Spring”** © Blender Foundation, studio.blender.org, **CC BY 4.0** (credited on the end card).
  Source: https://commons.wikimedia.org/wiki/File:Spring_-_Blender_Open_Movie.webm
- Music: original, generated locally with Meta MusicGen (`facebook/musicgen-stereo-medium`, `capture/musicgen.py`, take “a”).
  **The MusicGen weights are licensed CC BY-NC 4.0.** If this film is used commercially, replace
  `assets/music/bed.wav` with a licensed track (same 120 BPM grid; first downbeat at `data-media-start`).
- Sound effects: Pixabay Content License (bundled with HyperFrames media-use).
- Chrome logo: Google's official icon file (Wikimedia Commons). Firefox logo: theSVG (CC0 collection).
  Both are trademarks of their owners, shown only to say where the extension runs.
- Font: Inter (SIL OFL), the extension's own UI font.
- App icon: `public/icon/128.png` from this repository (the largest that exists; a 512 px master would sharpen the end card).
