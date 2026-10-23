#!/usr/bin/env python3
"""Build data/japanese/kanji/{n5,n4}.json.

Sources (all free to reuse, credited in data/japanese/kanji/README.md):
- KANJIDIC2 (EDRDG, CC BY-SA 4.0): on/kun readings, stroke counts, frequency.
- KanjiVG (Ulrich Apel, CC BY-SA 3.0): the stroke paths in writing order.
- JLPT level lists by Jonathan Waller (tanos.co.uk, CC BY), as extracted in davidluzgouveia/kanji-data.
- Meanings: kanji_meanings.py, written for this project.

    python3 scripts/content/import-kanji.py && npx prettier --write data/japanese/kanji
"""
import gzip, io, json, re, sys, urllib.request, xml.etree.ElementTree as ET
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from kanji_meanings import MEANINGS  # noqa: E402

OUT = Path(__file__).resolve().parents[2] / "data/japanese/kanji"
LEVELS = {5: "n5", 4: "n4"}

def get(url):
    return urllib.request.urlopen(url, timeout=60).read()

def main():
    levels = json.loads(get("https://raw.githubusercontent.com/davidluzgouveia/kanji-data/master/kanji.json"))
    wanted = {k: v["jlpt_new"] for k, v in levels.items() if v.get("jlpt_new") in LEVELS}
    root = ET.parse(io.BytesIO(gzip.decompress(get("https://www.edrdg.org/kanjidic/kanjidic2.xml.gz")))).getroot()
    entries = {}
    for c in root.iter("character"):
        lit = c.findtext("literal")
        if lit not in wanted:
            continue
        rm = c.find("reading_meaning")
        on = [r.text for r in rm.iter("reading") if r.get("r_type") == "ja_on"]
        kun = []
        for r in rm.iter("reading"):
            if r.get("r_type") != "ja_kun":
                continue
            # "た.べる" -> "た(べる)": the part after the dot is okurigana. Prefix/suffix forms are dropped.
            if r.text.startswith("-") or r.text.endswith("-"):
                continue
            stem, _, oku = r.text.partition(".")
            form = f"{stem}({oku})" if oku else stem
            if form not in kun:
                kun.append(form)
        misc = c.find("misc")
        freq = misc.findtext("freq")
        entries[lit] = dict(level=wanted[lit], on=on[:4], kun=kun[:5], strokes=int(misc.findtext("stroke_count")), freq=int(freq) if freq else 9999)

    for num, slug in LEVELS.items():
        items = []
        for ch in sorted((k for k, v in entries.items() if v["level"] == num), key=lambda k: entries[k]["freq"]):
            e = entries[ch]
            svg = get(f"https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji/{ord(ch):05x}.svg").decode()
            paths = re.findall(r'<path id="kvg:[0-9a-f]+-s(\d+)"[^>]*\sd="([^"]+)"', svg)
            paths = [d for _, d in sorted(paths, key=lambda p: int(p[0]))]
            if len(paths) != e["strokes"]:
                print(f"note: {ch} KANJIDIC2 {e['strokes']} strokes, KanjiVG {len(paths)}; using KanjiVG")
            en, id_ = MEANINGS[ch]
            items.append({
                "character": ch,
                "meanings": {"en": en, "id": id_},
                "onyomi": e["on"],
                "kunyomi": e["kun"],
                "strokeCount": len(paths),
                "strokes": paths,
            })
        OUT.mkdir(parents=True, exist_ok=True)
        (OUT / f"{slug}.json").write_text(json.dumps({
            "source": "KANJIDIC2 (EDRDG, CC BY-SA 4.0), KanjiVG (CC BY-SA 3.0), JLPT lists by J. Waller (CC BY); meanings written for this project",
            "level": slug,
            "items": items,
        }, ensure_ascii=False, indent=2) + "\n")
        print(f"{slug}: {len(items)} kanji")

main()
