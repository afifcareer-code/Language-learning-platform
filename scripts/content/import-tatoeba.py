#!/usr/bin/env python3
"""Import native Japanese sentences from Tatoeba into data/japanese/native/.

Tatoeba sentences are released under CC BY 2.0 FR (https://tatoeba.org/downloads).
Every imported sentence keeps its Tatoeba id and author, and so does each translation,
because the licence requires attribution. Nothing is copied from anywhere else.

    python3 scripts/content/import-tatoeba.py            # downloads ~35 MB, writes the file

Selection (deterministic, so the output can be reviewed and regenerated):
  * hiragana, katakana and punctuation only (the app does not teach kanji yet)
  * 5 to 30 characters
  * has an English and an Indonesian translation (both are required by content validation)
  * no profanity, violence, drugs, sex or similar (English word list below), no duplicates
  * ids listed in EXCLUDE_IDS were removed by review
"""
import bz2, io, json, re, sys, urllib.request
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "data" / "japanese" / "native" / "tatoeba.json"
BASE = "https://downloads.tatoeba.org/exports/per_language"
LIMIT = 150

# Sentences removed after reading the candidate list (unclear, unnatural or unsuitable for learners).
EXCLUDE_IDS: set[str] = {
    "629344",  # rude
    "414248",  # rude
    "13992451",  # odd ("I'm a baguette")
    "13203561",  # political
    "13254759", "12184709",  # website welcome messages
    "9196637", "11605473",  # religious
    "2252788",  # gambling
    "4858", "194395", "2125748", "199353",  # the Indonesian or English translation does not match the Japanese
    "12463447",  # an animal sound, not a sentence
}

BLOCK = re.compile(
    r"\b(fuck|shit|sex|sexy|kill|killed|die|died|dead|death|suicide|rape|drunk|damn|hell|bitch|ass|naked|"
    r"drug|drugs|gun|bomb|stupid|idiot|hate|hates|murder|blood|cry|crying|divorce|porn|nude|ugly|fat|"
    r"cigarette|smoke|beer|wine|alcohol|god|jesus|allah|war|terror|jerk|crap|screw|piss|whore)\b",
    re.I,
)
KANA = re.compile(r"^[ぁ-ゖァ-ヺー。、？！\s]+$")


def fetch(path: str) -> list[list[str]]:
    with urllib.request.urlopen(f"{BASE}/{path}", timeout=300) as response:
        raw = bz2.decompress(response.read())
    rows = (line.split("\t") for line in raw.decode("utf-8").split("\n"))
    return [r for r in rows if len(r) >= 2]


def main() -> None:
    jpn = {r[0]: (r[2], r[3]) for r in fetch("jpn/jpn_sentences_detailed.tsv.bz2") if len(r) >= 4}
    eng = {r[0]: (r[2], r[3]) for r in fetch("eng/eng_sentences_detailed.tsv.bz2") if len(r) >= 4}
    ind = {r[0]: (r[2], r[3]) for r in fetch("ind/ind_sentences_detailed.tsv.bz2") if len(r) >= 4}
    links = {"en": defaultdict(list), "id": defaultdict(list)}
    for code, name in (("en", "jpn-eng"), ("id", "jpn-ind")):
        for a, b in fetch(f"jpn/{name}_links.tsv.bz2"):
            links[code][a].append(b)

    existing = set()
    for f in (ROOT / "data" / "japanese" / "sentences").glob("*.json"):
        existing |= {s["text"] for s in json.loads(f.read_text())["items"]}

    candidates = []
    seen = set()
    for sid, (text, author) in jpn.items():
        if sid in EXCLUDE_IDS or text in seen or text in existing or not KANA.match(text):
            continue
        if not 5 <= len(re.sub(r"[。、？！\s]", "", text)) <= 30:
            continue
        en = next((t for t in links["en"].get(sid, []) if t in eng), None)
        idn = next((t for t in links["id"].get(sid, []) if t in ind), None)
        if not en or not idn or BLOCK.search(eng[en][0]):
            continue
        if author in ("\\N", ""):
            continue
        seen.add(text)
        candidates.append((len(text), int(sid), sid, text, author, en, idn))
    candidates.sort()
    items = []
    for _, _, sid, text, author, en, idn in candidates[:LIMIT]:
        items.append(
            {
                "slug": f"tatoeba-{sid}",
                "text": text,
                "translation": {"en": eng[en][0], "id": ind[idn][0]},
                "source": {
                    "name": "Tatoeba",
                    "license": "CC BY 2.0 FR",
                    "sentence": {"id": int(sid), "author": author},
                    "translations": {
                        "en": {"id": int(en), "author": eng[en][1]},
                        "id": {"id": int(idn), "author": ind[idn][1]},
                    },
                },
            }
        )
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(
        json.dumps(
            {
                "source": "Native sentences from Tatoeba contributors, CC BY 2.0 FR (https://tatoeba.org). Selected by scripts/content/import-tatoeba.py.",
                "level": "n5",
                "items": items,
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n"
    )
    print(f"{len(items)} sentences of {len(candidates)} candidates -> {OUT}", file=sys.stderr)


if __name__ == "__main__":
    main()
