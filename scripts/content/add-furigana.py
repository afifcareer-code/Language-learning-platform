#!/usr/bin/env python3
"""Write kanji with furigana into lesson sentences, using only kanji the learner has been taught.

For each sentence of a lesson, a token is written in kanji (漢字《かな》) when it is a vocabulary word
(or a conjugated form of one) whose kanji spelling uses only kanji taught in that lesson or an earlier
one, and no other word with a different spelling reads the same. Everything else stays in kana.
The readings come from the vocabulary data, so the spoken text does not change.

    python3 scripts/content/add-furigana.py && npx prettier --write data/japanese
"""
import json, re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data/japanese"
KANJI = re.compile(r"[一-鿿々]")
RUBY = re.compile(r"(?:｜([^《》｜]+)|([一-鿿々]+))《([^》]+)》")
KANA_PREFERRED = set("""ある いる こと とき ところ ほう もの うち ため はず よう わけ まま たくさん ちょうど あまり いっぱい
 ください いい よく また もう まだ すぐ いつ なに なん これ この それ その あれ あの ここ そこ あそこ どこ ひと""".split())
# Grammar words and auxiliaries that are written in kana even when a homophone has a kanji spelling.
KANA_TOKENS = set("""した して しない します しました しません いた いて います いました いません いる ある あります ありません
 ない なる なります なりました いけない いけません いけ みたい みたいです らしい らしいです そう そうです よう ようです""".split())
PARTICLES = set("は が を に へ で と も の や か よ ね から まで より だけ しか ほど など でも ので のに けど".split())
GODAN_RU = set("入る 帰る 切る 知る 走る 要る 参る 減る 滑る 散る 限る 握る 焦る 照る 喋る 茂る 湿る 練る 蹴る 混じる".split())
NA_SUFFIX = ["", "です", "だ", "でした", "な", "に", "で", "じゃ", "だし", "だと", "なの", "だった", "でしょう", "なら", "なので", "なのに", "らしい", "みたい"]
SURU = ["する", "します", "しました", "しません", "しませんでした", "しましょう", "して", "した", "しない", "しなかった", "したい",
        "したら", "すれば", "しよう", "させ", "させる", "させます", "させました", "させて", "される", "されます", "されました",
        "しながら", "しにくい", "しやすい", "したり", "しなければ", "しなくても", "しないで", "できる", "できます", "できました", "できない"]
ROW = {"う": "わいうえお", "く": "かきくけこ", "ぐ": "がぎぐげご", "す": "さしすせそ", "つ": "たちつてと", "ぬ": "なにぬねの",
       "ぶ": "ばびぶべぼ", "む": "まみむめも", "る": "らりるれろ"}
TE = {"う": ("って", "った"), "つ": ("って", "った"), "る": ("って", "った"), "む": ("んで", "んだ"), "ぶ": ("んで", "んだ"),
      "ぬ": ("んで", "んだ"), "く": ("いて", "いた"), "ぐ": ("いで", "いだ"), "す": ("して", "した")}
MASU = ["ます", "ました", "ません", "ませんでした", "ましょう", "たい", "たく", "たかった", "ながら", "に", "はじめ", "はじめる", "はじめました",
        "おわ", "おわったら", "おわる", "だし", "だしました", "すぎ", "すぎました", "すぎて", "やすい", "やすいです", "にくい", "にくいです",
        "かた", "なさい", "そう", "つづけ", "つづける", "たがって", "たがる"]
def verb_forms(kana, kanji):
    if kana.endswith("する"): return {kana[:-2] + s for s in SURU}
    if kana == "くる" or kanji == "来る":
        return {"くる", "きます", "きました", "きません", "きて", "きた", "こない", "こなかった", "きたい", "こよう", "これる", "こられる", "こさせる", "くれば", "きたら", "こい"}
    last = kana[-1]
    ichidan = last == "る" and len(kana) >= 2 and kana[-2] in "いきぎしじちぢにひびぴみりえけげせぜてでねへべぺめれ" and kanji not in GODAN_RU
    if ichidan:
        st = kana[:-1]
        sfx = ["る", "ない", "なかった", "て", "た", "たら", "たり", "よう", "られる", "られます", "られました", "られて", "られない", "させる",
               "させます", "させました", "させて", "させられました", "れば", "ろ", "な"] + MASU
        return {st + s for s in sfx}
    if last not in ROW: return {kana}
    st, row = kana[:-1], ROW[last]
    a = "わ" if last == "う" else row[0]
    te, ta = TE[last]
    if kana == "いく": te, ta = "って", "った"
    forms = {kana, st + te, st + ta, st + ta + "ら", st + ta + "り", st + a + "ない", st + a + "なかった", st + a + "ないで", st + a + "なければ",
             st + a + "なくても", st + a + "れる", st + a + "れます", st + a + "れました", st + a + "れて", st + a + "せる", st + a + "せます",
             st + a + "せました", st + a + "せて", st + a + "されました", st + a + "ずに", st + row[3] + "る", st + row[3] + "ます", st + row[3] + "ません",
             st + row[3] + "ない", st + row[3] + "ば", st + row[3], st + row[4] + "う", st + row[2] + "な"}
    forms |= {st + row[1] + s for s in MASU}
    if te.startswith("っ"): pass
    return forms
def adj_forms(kana):
    st = kana[:-1]
    if kana == "いい": st = "よ"
    sfx = ["い", "いです", "く", "くない", "くないです", "くなかった", "くなかったです", "かった", "かったです", "くて", "ければ", "さ", "そう",
           "すぎ", "すぎる", "すぎて", "くなる", "くなりました", "いでしょう", "いし", "いのに", "いので", "いと", "いなら"]
    return {st + s for s in sfx}

def align(spelling, kana):
    """Split a kanji spelling into (text, reading) pieces that spell the kana."""
    parts = re.findall(r"[一-鿿々]+|[^一-鿿々]+", spelling)
    pattern = "".join("(.+?)" if KANJI.match(p) else re.escape(p) for p in parts)
    m = re.fullmatch(pattern, kana)
    if not m: return None
    out, g = [], iter(m.groups())
    for p in parts: out.append((p, next(g)) if KANJI.match(p) else (p, None))
    return out

def mark(pieces):
    return "".join(f"{t}《{r}》" if r else t for t, r in pieces)

def main():
    words, kana_only = [], set()
    for f in sorted((DATA / "vocabulary").glob("*.json")):
        for w in json.loads(f.read_text())["items"]:
            k = w.get("kanji")
            if not k or w.get("affix") or "～" in k or w["kana"] in KANA_PREFERRED:
                kana_only.add(w["kana"])  # a word written in kana with the same sound makes the token ambiguous
                if w.get("affix"): continue
                k, pieces = None, ()
            else:
                pieces = align(k, w["kana"])
                if not pieces: continue
            pos = w["partOfSpeech"]
            if pos == "verb": forms = verb_forms(w["kana"], k or "")
            elif pos == "adjective" and w["kana"].endswith("い") and not KANJI.search((k or "あ")[-1]): forms = adj_forms(w["kana"]) | {w["kana"] + s for s in NA_SUFFIX if s in ("", "です")}
            elif pos in ("adjective", "noun"):
                forms = {w["kana"] + s for s in NA_SUFFIX}
                if pos == "noun" and len(KANJI.findall(k or "")) >= 2 and len(w["kana"]) >= 3:  # 予約する, 勉強する
                    forms |= {w["kana"] + s for s in SURU}
            else: forms = {w["kana"]}
            words.append((w["kana"], k, pieces, forms))
    index = {}
    for kana, k, pieces, forms in words:
        for form in forms: index.setdefault(form, set()).add((kana, k, tuple(pieces)))
    taught, allowed = set(), {}
    for course in ("n5-core", "n4-core"):
        c = json.loads((DATA / f"curriculum/courses/{course}.json").read_text())
        for lesson in c["lessons"]:
            taught |= {i[6:] for i in lesson["items"] if i.startswith("kanji:")}
            allowed[lesson["slug"]] = set(taught)
    def convert(token, ok, after_te=False):
        if len(token) < 2 or token in PARTICLES or token in KANA_TOKENS or KANJI.search(token) or "《" in token: return token
        if after_te: return token  # 〜て いる / みる / あげる…: auxiliary verbs stay in kana
        cands = index.get(token, set())
        if len({k for _, k, _ in cands}) != 1 or token in kana_only: return token  # unknown or ambiguous
        kana, k, pieces = next(iter(cands))
        if k is None: return token
        if not set(KANJI.findall(k)) <= ok: return token
        # the token keeps the word's own kana before and after the kanji; only the inflection changes
        stem_len = sum(len(r if r else t) for t, r in pieces[:-1]) + (len(pieces[-1][1] or pieces[-1][0]) if pieces[-1][1] else 0)
        if pieces[-1][1] is None:  # ends in okurigana: mark the kanji pieces, keep the token's own ending
            head_len = sum(len(r if r else t) for t, r in pieces[:-1])
            if len(pieces) == 2:  # one kanji + okurigana: its reading is the token's own head (来る: き/こ/く)
                return mark([(pieces[0][0], token[:head_len])]) + token[head_len:]
            return mark(pieces[:-1]) + token[head_len:]
        return mark(pieces) + token[len(kana):]
    changed = 0
    lessons = {}
    for course in ("n5-core", "n4-core"):
        for lesson in json.loads((DATA / f"curriculum/courses/{course}.json").read_text())["lessons"]:
            for i in lesson["items"]:
                if i.startswith("sentence:"): lessons[i[9:]] = lesson["slug"]
    texts = {}
    for f in sorted((DATA / "sentences").glob("*.json")):
        d = json.loads(f.read_text())
        for s in d["items"]:
            ok = allowed.get(lessons.get(s["slug"], ""), set())
            if not ok: continue
            new_tokens = [convert(t, ok, i > 0 and s["tokens"][i - 1][-1:] in ("て", "で")) for i, t in enumerate(s["tokens"])]
            if new_tokens == s["tokens"]: continue
            # rebuild the text: same spacing and punctuation, tokens replaced in order
            text, out, pos = s["text"], "", 0
            for old, new in zip(s["tokens"], new_tokens):
                j = text.index(old, pos)
                out += text[pos:j] + new; pos = j + len(old)
            out += text[pos:]
            texts[s["text"]] = out
            s["text"], s["tokens"] = out, new_tokens
            changed += 1
        f.write_text(json.dumps(d, ensure_ascii=False, indent=2) + "\n")
    for f in sorted((DATA / "grammar").glob("*.json")):
        d = json.loads(f.read_text())
        for g in d["items"]:
            for ex in g["examples"]:
                ex["ja"] = texts.get(ex["ja"], ex["ja"])
        f.write_text(json.dumps(d, ensure_ascii=False, indent=2) + "\n")
    print(f"{changed} sentences now carry kanji with furigana")

main()
