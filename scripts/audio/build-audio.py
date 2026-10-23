#!/usr/bin/env python3
"""Build the Japanese audio clips from the content data.

Synthesised with Open JTalk (BSD) and the "Mei" voice (CC BY 3.0, Nagoya
Institute of Technology / MMDAgent Project Team), through pyopenjtalk.
Attribution is required: see public/audio/CREDITS.md.

    pip install pyopenjtalk      # needs ffmpeg on PATH
    python3 scripts/audio/build-audio.py

Writes public/audio/ja/<id>.mp3 and public/audio/ja/manifest.json
({ "<text the app speaks>": "<file>" }). Clips already built are kept.
"""
import hashlib, json, subprocess, sys, tempfile
from pathlib import Path
import numpy as np
import pyopenjtalk
from scipy.io import wavfile

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data" / "japanese"
OUT = ROOT / "public" / "audio" / "ja"


def texts():
    found = []
    for name in ("hiragana", "katakana"):
        for c in json.loads((DATA / "characters" / f"{name}.json").read_text())["characters"]:
            found.append((c["kana"], True))
    for f in sorted((DATA / "vocabulary").glob("*.json")):
        for v in json.loads(f.read_text())["items"]:
            found.append((v["kana"], False))
    for f in sorted((DATA / "sentences").glob("*.json")):
        for s in json.loads(f.read_text())["items"]:
            found.append((s["text"], False))
    for f in sorted((DATA / "native").glob("*.json")):
        for s in json.loads(f.read_text())["items"]:
            found.append((s["text"], False))
    for f in sorted((DATA / "situations").glob("*.json")):
        for s in json.loads(f.read_text())["items"]:
            found.append((s["model"], False))
    for f in sorted((DATA / "passages").glob("*.json")):
        for p in json.loads(f.read_text())["items"]:
            if p["form"] not in ("text", "dialogue"):
                continue  # excerpts of published writing are read, not played
            # One clip per passage, keyed by the lines joined with a space (what the app speaks).
            found.append((" ".join(line["text"] for line in p["lines"]), False))
    for f in sorted((DATA / "listening").glob("*.json")) if (DATA / "listening").exists() else []:
        for d in json.loads(f.read_text())["items"]:
            for line in d["lines"]:
                found.append((line["text"], False))
    seen, out = set(), []
    for t, single in found:
        if t not in seen:
            seen.add(t)
            out.append((t, single))
    return out


def to_katakana(s):
    return "".join(chr(ord(c) + 0x60) if "ぁ" <= c <= "ゖ" else c for c in s)


def synth(text, single):
    # Alone, は and へ would be read as the particles "wa" and "e": use katakana for single kana.
    x, sr = pyopenjtalk.tts(to_katakana(text) if single else text, speed=0.9)
    x = np.asarray(x, dtype=np.float64)
    peak = max(1.0, float(np.abs(x).max()))
    return (x / peak * 0.85 * 32767).astype(np.int16), sr


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    manifest_path = OUT / "manifest.json"
    manifest = {}
    for text, single in texts():
        name = hashlib.sha1(text.encode()).hexdigest()[:12] + ".mp3"
        target = OUT / name
        if not target.exists():
            pcm, sr = synth(text, single)
            with tempfile.TemporaryDirectory() as tmp:
                wav = Path(tmp) / "a.wav"
                wavfile.write(wav, sr, pcm)
                subprocess.run(
                    ["ffmpeg", "-y", "-loglevel", "error", "-i", str(wav),
                     "-af", "silenceremove=start_periods=1:start_threshold=-45dB:stop_periods=1:stop_threshold=-45dB:stop_duration=0.15",
                     "-ac", "1", "-ar", "24000", "-b:a", "40k", str(target)],
                    check=True,
                )
        manifest[text] = name
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True) + "\n")
    print(f"{len(manifest)} clips in {OUT}")


if __name__ == "__main__":
    sys.exit(main())
