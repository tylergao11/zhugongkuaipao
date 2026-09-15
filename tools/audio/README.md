# Original BGM — 溜为上策

`compose-bgm.py` synthesizes a hand-written 32-bar, 130 BPM score with NumPy and SciPy. It does not use external music, recordings, or soundfonts. Melody uses D minor pentatonic phrases, with changing chord voicings, plucked accompaniment, a flute-like lead and war drums / wood blocks.

Run from the project root:

```powershell
python tools/audio/compose-bgm.py
ffmpeg -i output/audio/liu-run-loop-master.wav -ar 32000 -codec:a libmp3lame -b:a 128k assets/game/liu-run-bgm-v1.mp3
```

The master is 59.076916 seconds. All note and room tails wrap across the sample boundary to avoid an artificial fade-out between loops. MP3 contains encoder delay/padding metadata; Web Audio uses the decoded sample buffer for playback. Use a new asset version when changing the score or encoding, because runtime MP3 files use versioned caching.

MP3 decodes as stereo 32 kHz; mean volume -18.0 dBFS and peak -1.6 dBFS. Runtime output gain is 0.65. The startup progress includes the entire MP3 download and decoding; Start remains unavailable until both visual and audio assets are ready. The Start tap unlocks audio and waits for playback initialization before starting the simulation. Failure leaves the loading/start panel visible for retry. Resume and subsequent taps recover a suspended mobile audio context. No physical WeChat audio measurement was performed.
