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
measured on single sentences, not passages or conversations.

N4 Core: ten lessons (Making plans, Experiences, Abilities, Giving and receiving,
Advice and rules, If and when, What people say and how things look, Reasons and
purposes, Passive and causative, Polite language) with 140 words, 30 grammar
points, 60 sentences and all 166 N4 kanji (about 17 per lesson, with kanji
meaning and kanji reading activities), plus an N4 mock assessment with a kanji
section. It is a core course, not the full N4 range (about 1,500 words);
sentences are written in kana with spaces, as at N5, because sentences do not
carry furigana yet. Content is original, written for this project.

Not implemented yet: the rest of N5 and N4 (counters, more verb forms and the
full word lists), writing production as a course activity, and N3-N1.
