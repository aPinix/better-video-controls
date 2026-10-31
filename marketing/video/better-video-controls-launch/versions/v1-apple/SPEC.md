# SPEC — Better Video Controls, product film

```text
GOAL:    the viewer remembers "I can scroll a video to rewind it without leaving what I'm doing", sees
         that the same extension also loops, marks, boosts, speeds, dims, tints, snaps and floats video,
         and knows it is for Chrome and Firefox.
OUTPUT:  HyperFrames, 1920 x 1080, 30 fps, MP4 (H.264 + AAC)
TIME:    20.0 s x 30 = 600 frames. Music 120 BPM: 15 frames a beat, 60 a bar (10 bars).
LOOK:    Apple-light product film.
         desktop world: wallpaper #E9E6E0 with one radial light #F7F5F1 from the upper left (radius 70%).
         studio world: #F5F5F7 seamless. cinema beat floods to #000000 (the extension's "Cinema" preset).
         ink #1D1D1F, quiet ink #6E6E73, on dark #F5F5F7.
         brand accent (from public/icon/128.png): #3D75FE -> #7B34E9 gradient; solid accent #614FF9.
         The accent appears only on: one word per line max, the app icon, the end-card line.
         extension UI colours from the source: loop #F3CD45 (grip #332B0C), bookmark marker #38D9FF,
         editing track #121A2EE8 / border #A4C4FF, timeline track rgb(255 255 255/.2) blur 8px saturate 140%,
         progress = match-colour mode at 80% alpha (blender.org orange #EA7600 -> rgb(234 118 0/.8)).
         display: Inter Variable (the extension's own font), opsz 32, weight 640, 84 px, tracking -0.035em.
         body/UI: Inter Variable opsz 14, weight 500-600, 22-30 px.
         windows: radius 14 px, shadow 0 30px 70px rgba(0,0,0,.20) + 0 2px 6px rgba(0,0,0,.08).
         studio player: 1344 x 756 at (288, 236), radius 28 px, shadow 0 40px 90px rgba(0,0,0,.22).
         no grain, no vignette, no glow.
OBJECTS: macOS-style windows (traffic lights: focused #FF5F57 #FEBC2E #28C840, unfocused #D6D4D0);
         a browser window with one tab "Spring", address "studio.blender.org/films/spring";
         a Notes window with typed scene notes and a blinking caret;
         a macOS arrow cursor, 60 px tall (5.6% of frame);
         a two-finger trackpad gesture: two 22 px discs, #1D1D1F at 35%, sliding 90 px;
         the extension's seek bar, "Fast seeking"/"Slow seeking" label, loop range with handles,
         bookmark marker, vertical volume pill, filter preset names (Vivid, Mono), "Screenshot saved.",
         mini player; the real app icon PNG; Chrome and Firefox logos from their own files.
MOTION:  enter: expo.out 0.6-0.8 s (titles: per-word blur 8px->0 + opacity, 0.16 s, 0.07 s apart)
         move/camera: power2.inOut 0.6 s; flick to corner: expo.out 0.9 s
         exit: power3.in 0.25 s, blur out 8 px
         verb roll: out y -40% + blur 10 px 0.12 s power2.in; in from y 40% 0.22 s expo.out
         springs: none on UI. Landed titles hold dead still.
SHOTS:   f0-165 (0-5.5 s) DESKTOP. Notes in front (focused), browser behind (unfocused) playing Spring.
           0.25 "Video in the background." | 1.5 cursor enters, lands on the video 2.15 |
           2.3-3.5 two-finger swipe, seek bar shows, film rewinds 398.3 s -> 390.5 s |
           2.3 "Scroll over it to rewind." | 3.9 punch-in x1.55 on both title bars: Notes still lit,
           caret still blinking | 3.95 "No click. No switching windows." | 4.75-5.5 dive: Notes and
           chrome fall away, the film grows into the studio player rect. SFX: whoosh at 4.8.
         f165-480 (5.5-16 s) STUDIO, same player throughout.
           5.9 "Seek 3× faster." + key cap ⌥, label Fast seeking, film jumps 393 -> 385.2 |
           7.2 "Or ¼× finer." + ⌥ ⇧, label Slow seeking, film creeps 385.6 -> 386.2 |
           8.5 "Loop it." yellow A-B range drawn | 9.5 "Mark it." cyan marker drops |
           10.5 "Boost it." volume pill fills, "Volume boost 5×" | 11.5 "Speed it." 1× -> 2× chip, film at 2× |
           12.5 "Dim it." ground floods to #000 | 13.5 "Tint it." Vivid then Mono, baked |
           14.25 "Snap it." flash, frame card, "Screenshot saved." |
           15.0 "Float it." ground returns, player flicks to bottom-right as a 560 x 315 mini player.
           The verb rolls on every change; "it." never moves.
         f480-600 (16-20 s) END CARD. Mini player travels to centre and becomes the icon (0.9 s),
           name blurs in per letter, "For Chrome and Firefox." with both logos, held 2.4 s. Riser into the icon.
BANNED:  dark void ground; glow/particles; purple-blue gradient grounds or mesh gradients; glass cards;
         numbered labels, mono caps labels; three cards in a row; title over a dimmed screenshot;
         logo docked in a corner; titles drifting after they land; breathing/pulsing loops;
         every element fading and sliding up; CSS filters on footage (filters are baked);
         any reuse of marketing/video/better-video-controls-promo (person's instruction).
QA:      0.0 (thumbnail: desktop, both windows, first line); 3.0 (rewind mid-scrub, bar moving);
         4.3 (punch-in: lit vs grey traffic lights); 5.3 (dive mid-flight); 6.4 (Fast seeking);
         8.0 (Slow seeking); 9.1 loop; 10.0 marker; 11.0 boost; 12.0 2×; 13.0 cinema dark;
         13.9 Mono; 14.5 screenshot; 15.6 mini player; 17.2 icon; 19.0 end card.
```
