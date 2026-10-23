# Curriculum and proficiency path

Path: Foundation (hiragana, katakana) → N5 → N4 → N3 → N2 → N1, defined in
`data/japanese/curriculum/levels.json` (courses and lessons) and
`data/japanese/proficiency/framework.json` (the proficiency map).

Implemented: Foundation (basic, voiced, semi-voiced and combination kana), and N5
lessons 1-6 (Introductions, Numbers and shopping, Time and daily life, Places and
directions, Food and ordering, Family and people), each with vocabulary,
grammar, sentences, and activities for word recognition, word recall, sentence
building, sentence reading and sentence listening (the listening audio is the
shipped clip set, see `docs/development/audio.md`). Reading and listening are
measured on single sentences, not passages or conversations. Not implemented,
by design: the rest of N5 (kanji, counters, adjectives and verb forms beyond
the polite present), writing production, and all of N4-N1.
