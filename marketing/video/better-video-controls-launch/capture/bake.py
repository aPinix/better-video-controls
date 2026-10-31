"""Bake the film shown inside the player.

The extension seeks a real <video>; HyperFrames never seeks media, so each seek is baked into the
footage here. Every segment maps composition time to source time with the same ease the scene uses
for the seek bar, so the bar and the picture agree frame for frame.

usage: python3 -I capture/bake.py <path to Spring_-_Blender_Open_Movie.webm>
Source: https://commons.wikimedia.org/wiki/File:Spring_-_Blender_Open_Movie.webm (CC BY 4.0)
"""
import json, os, shutil, subprocess, sys, tempfile

SRC = sys.argv[1]
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "assets")
FPS, SRC_FPS = 30, 24
WIN = (380.0, 404.0)  # the window the seek bar represents (0..1)

EASES = {
    "none": lambda t: t,
    "power2.inOut": lambda t: 2 * t * t if t < 0.5 else 1 - (-2 * t + 2) ** 2 / 2,
    "power3.out": lambda t: 1 - (1 - t) ** 3,
}

MAPS = json.load(open(os.path.join(ROOT, "capture", "film-map.json")))


def source_time(segments, t):
    for t0, t1, s0, s1, ease in segments:
        if t0 <= t < t1 or t == segments[-1][1]:
            u = (t - t0) / (t1 - t0)
            return s0 + (s1 - s0) * EASES[ease](min(1.0, max(0.0, u)))
    raise ValueError(t)


def run(*cmd):
    subprocess.run(cmd, check=True)


work = tempfile.mkdtemp(prefix="bvc-bake-")
frames = os.path.join(work, "src")
os.makedirs(frames)
# 2048x858 scope -> centre 16:9 crop -> 1600x900
run("ffmpeg", "-v", "error", "-ss", str(WIN[0]), "-t", str(WIN[1] - WIN[0]), "-i", SRC,
    "-vf", "crop=1525:858:261:0,scale=1600:900:flags=lanczos", "-q:v", "2",
    os.path.join(frames, "%05d.jpg"))
count = len(os.listdir(frames))

for name, clip in MAPS.items():
    seq = os.path.join(work, name)
    os.makedirs(seq)
    segments = clip["segments"]
    total = round(segments[-1][1] * FPS)
    for k in range(total):
        s = source_time(segments, k / FPS)
        idx = min(count, max(1, round((s - WIN[0]) * SRC_FPS) + 1))
        os.symlink(os.path.join(frames, f"{idx:05d}.jpg"), os.path.join(seq, f"{k:05d}.jpg"))
    # The extension's filter presets (helpers/youtube-filters-menu.ts), baked by time window.
    chain = []
    for f in clip.get("filters", []):
        a, b = f["from"], f["to"]
        on = f"enable='between(t,{a},{b - 0.001})'"
        if f["preset"] == "Vivid":  # brightness 105, contrast 115, saturation 145
            chain.append(f"eq=brightness=0.03:contrast=1.15:saturation=1.45:{on}")
        if f["preset"] == "Mono":  # brightness 105, contrast 115, grayscale 100
            chain.append(f"hue=s=0:{on}")
            chain.append(f"eq=brightness=0.03:contrast=1.15:{on}")
    vf = ",".join(chain) if chain else "null"
    out = os.path.join(ASSETS, f"film-{name}.mp4")
    run("ffmpeg", "-v", "error", "-y", "-framerate", str(FPS), "-i", os.path.join(seq, "%05d.jpg"),
        "-vf", vf, "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-g", "15",
        "-pix_fmt", "yuv420p", "-movflags", "+faststart", out)
    for still in clip.get("stills", []):
        run("ffmpeg", "-v", "error", "-y", "-ss", str(still["at"]), "-i", out, "-frames:v", "1",
            "-q:v", "2", os.path.join(ASSETS, still["file"]))
    print(name, total, "frames ->", out)

shutil.rmtree(work)
