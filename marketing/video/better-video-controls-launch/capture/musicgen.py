import sys, time, numpy as np, soundfile as sf, torch
from transformers import AutoProcessor, MusicgenForConditionalGeneration

MODEL = "facebook/musicgen-stereo-medium"
PROMPTS = [
    ("a", 7, "Sleek minimal electronic pop instrumental for a premium tech product film, crisp punchy kick, snappy hand claps, plucky synth bass, bright staccato synth chords, confident and optimistic, clean modern glossy production, 120 bpm"),
    ("b", 11, "Upbeat modern electronic instrumental, glossy piano stabs, tight drum machine with claps and finger snaps, deep clean bass, playful and premium, keynote product reveal, bright major key, 120 bpm"),
    ("c", 23, "Minimal funky electro groove instrumental, clean muted guitar plucks, finger snaps, tight punchy drums, warm round bass, cool confident and modern, product commercial, 120 bpm"),
]
SECONDS = 28

device = "mps" if torch.backends.mps.is_available() else "cpu"
processor = AutoProcessor.from_pretrained(MODEL)
model = MusicgenForConditionalGeneration.from_pretrained(MODEL).to(device)
rate = model.config.audio_encoder.sampling_rate
tokens = int(SECONDS * model.config.audio_encoder.frame_rate)
for name, seed, prompt in PROMPTS:
    t0 = time.time()
    torch.manual_seed(seed)
    inputs = processor(text=[prompt], padding=True, return_tensors="pt").to(device)
    audio = model.generate(**inputs, do_sample=True, guidance_scale=3.0, max_new_tokens=tokens)
    wav = audio[0].float().cpu().numpy()  # (channels, samples)
    wav = wav / max(1e-6, np.abs(wav).max()) * 0.89
    sf.write(f"bed-{name}.wav", wav.T, rate)
    print(name, f"{time.time()-t0:.0f}s", wav.shape, flush=True)
