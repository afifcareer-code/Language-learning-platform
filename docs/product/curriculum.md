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

N5 coverage: lessons 7-34 add the rest of the JLPT N5 word list (J. Waller's
list, tanos.co.uk, CC BY, as compiled in open-anki-jlpt-decks, MIT; a few dated
words such as tape recorder were left out), the remaining N5 grammar
(past forms, adjectives, counters, て-form requests and permission, 〜ている,
〜たい, invitations, comparisons, conditions of time, reasons and more) and all
79 N5 kanji. N5 now has 668 words, 75 grammar points and 149 sentences in 34
lessons. Words that share their kana (あつい 暑い / 熱い / 厚い) are kept apart
with a `homonym` number. Meanings, explanations and sentences are original.

N4 coverage: lessons 11-39 add the rest of the JLPT N4 word list (same source as
N5; dated words such as word processor and telegram were left out, and 看護婦 is
taught as 看護師), and 71 more grammar points (〜てしまう, 〜ておく, 〜てある,
〜てみる, 〜はず, 〜かもしれない, 〜なら, 〜ても, plain speech, 〜んです, quoting,
embedded questions, causative passive, keigo verbs and more). N4 now has 732 words,
101 grammar points and 202 sentences in 39 lessons.

Sentences carry kanji with furigana (漢字《かな》) once the learner has been taught
those kanji: `scripts/content/add-furigana.py` writes a token in kanji only when it is
a known word (or a conjugated form of one), its kanji are taught in that lesson or
earlier, and no other word reads the same. About 170 N5/N4 sentences now use kanji;
the rest stay in kana. Speech and audio use the reading, so they are unchanged.

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
