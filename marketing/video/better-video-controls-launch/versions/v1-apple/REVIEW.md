# Review

## Creative calls

- Storyline A of `STORYLINES.md` ("Hands stay on your work"): the person's headline feature, seeking a video in an
  unfocused window, is the hook, proven by Notes typing again straight after the scroll. B (type on the beat) and
  C (one seek bar morphing through every feature) were not built.
- Look: Apple-light stage (#F5F5F7 / #1D1D1F), Inter (the extension's own font) at display optical size, brand
  blue-violet only on "rewind.", the accent numbers and the icon. Cinema Mode is the one dark world.
- Footage is Blender's *Spring* (CC BY 4.0), so no platform or creator content is implied.
- Music: three MusicGen takes; take "a" chosen by measurement (steadiest 120 BPM grid, −15 LUFS, sections at 10 s and
  15 s that fall on the montage and the float). Its weights are CC BY-NC (see README).

## What was checked

- `hyperframes check`: 0 errors. Lint, runtime, layout, motion clean.
- Snapshots: QA frames from SPEC.md, the beat sheet, both seams (−0.2…+0.2 s: continuous, no jump),
  the phone sheet (titles readable at 360 px; in-player chips are small there).
- Rendered file: 20.0 s, 1920 × 1080, 30 fps H.264 + AAC 48 kHz stereo, 16.4 MB. Frame sheet of the encoded MP4 read
  at 1 fps; a stray cursor tip in the first second was found there and fixed (it now starts fully off-screen).
- Audio, measured not heard: −17.5 LUFS integrated, −13.6 short-term max, true peak −1.5 dBTP, no clipping. Slightly
  under the −16…−14 social target; raising it further would push the bed's peaks past −1 dBTP without a limiter.

## Kept on purpose

- `line_unread` on the typed note lines and the end-card name: the check counts split letters as words.
- `line_unread` on "1×", "1.5×" and "Mono": intermediate slot-roll states, read as motion, not text.
- "Bookmark this moment" holds 0.9 s (floor 1.05 s): it sits on a two-beat feature slot.
- Contrast on the unfocused browser's ‹ › glyphs: an inactive window is meant to look inactive.

## Weakest shot and next steps

- The studio stretch holds one framing for 10.5 s; a punch-in on the timeline for Loop/Mark would add a second
  scale, but it collides with the title band above the player. Worth trying with the title moved onto the stage.
- The app icon is a 128 px PNG shown at 160 px; a larger master would make the end card crisper.
- The music is model-generated and unheard by the author; a licensed track would raise both quality and licence safety.
