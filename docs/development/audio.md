# Audio

Sound questions play shipped clips first and fall back to the learner's device voice.

- Clips live in `public/audio/ja/` with a `manifest.json` mapping the exact text the app speaks to a file.
- They are synthesised (not recordings of a person) with Open JTalk and the "Mei" voice (CC BY 3.0, attribution in `public/audio/CREDITS.md` and Settings → Credits).
- Rebuild after changing content: `pip install pyopenjtalk` (ffmpeg required), then `python3 scripts/audio/build-audio.py`. The unit test `audio-clips.test.ts` fails if any spoken text has no clip.
- Single kana are synthesised from katakana so は and へ are read "ha" and "he", not as particles.
- Quality limit: the voice is clearly synthetic. Replace clips with native recordings under a compatible licence when available; the manifest format does not change.
