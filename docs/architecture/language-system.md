# Language system

## Japanese is the first language, not the boundary

The platform is a language-learning engine; Japanese is its first implementation. Japanese is a demanding first module: two phonetic scripts, kanji, handwriting and a well-known proficiency framework (JLPT). If the core engine can support Japanese without knowing anything about it, it is very likely to support other languages too.

We therefore:

- **do** keep the core free of Japanese concepts (kana, kanji, JLPT, romaji),
- **do** let Japanese declare what it supports through capabilities and skills,
- **do** show the platform's language catalog from the first screen, with planned languages marked "coming soon",
- **do not** build placeholder modules, empty folders or fake curriculum for planned languages.

## Three separate concepts

| Concept                         | Stored in                                                                                         | Example                  |
| ------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------ |
| UI language                     | `learners.ui_locale`, `locales/`                                                                  | `id`, `en`               |
| Learning language               | `learners.target_language` (active), `learner_languages` (all started)                            | `ja`                     |
| Proficiency framework and level | `languages.proficiency_framework`, `levels.framework_level`, `learner_languages.current_level_id` | `jlpt`, `N5`, Foundation |

## Language catalog

[`data/languages.json`](../../data/languages.json) lists every language the platform offers or plans, with its native name, writing system and proficiency framework. It is seeded into the `languages` table on startup. A language is stored as **available** only if its module is installed in [`src/languages/registry.ts`](../../src/languages/registry.ts); otherwise it is **coming soon**. Planned languages have catalog metadata only. `npm run content:validate` checks that the catalog and the installed modules agree.

## Proficiency frameworks and levels

Levels belong to a language and are ordered. `levels.framework_level` holds the official code (`N5`, later `A1`, `HSK 1`, …) or `null` for platform stages that precede the framework, such as Japanese **Foundation**. The core never assumes a framework. A level without curriculum is shown as "in development" and cannot be chosen as a starting point.

## Choosing what to learn

`/` asks "What do you want to learn?" (language selection), then `/languages/<code>` asks "Where are you starting?" (level selection). The choice is stored in `learner_languages` and `learners.target_language`, and learning pages (`/dashboard`, `/learn`, …) require it. Learners who already had progress before language selection existed are placed at the first level with content automatically, so their progress is never reset and they never see onboarding again. The learning language can be changed at any time from the learning path (`/learn` → "Change learning language" → `/languages`); each language remembers its own level.

## Where am I? Navigation

The app shell always shows the three concepts separately:

- **Learning context**, e.g. `日本語 Japanese · N5` with `Lesson 1 · Introductions` underneath (sidebar; `Japanese · N5` in the mobile header). It opens the learning path.
- **Interface language**, a menu (`🌐 Bahasa Indonesia ▾`, `🌐 ID ▾` on phones) with one radio option per platform locale. It closes on Escape or an outside click and never changes the learning language.

The **learning path** (`/learn`) shows where the learner is (language · level · course · lesson, with Continue), then every level of the framework with a status — _Current level_, _Completed_, _In progress_, _Recommended next_ (the next level once the current one is completed), _Available_, or _In development_ (no curriculum; it cannot be opened) — and the lessons of the selected level (`/learn?level=n5`). Any level with curriculum can be viewed; "Study this level" makes it the current one. Statuses are computed in [`src/server/services/learning-path.ts`](../../src/server/services/learning-path.ts) from activity statuses. Only languages with a module are selectable; coming-soon languages are listed but never selectable.

## The module contract

```ts
interface LanguageModule {
  code: string; // BCP 47, e.g. "ja"
  nativeName: string; // "日本語"
  capabilities: Capability[]; // what it supports
  skills: SkillDefinition[]; // what it can measure
  messages: Record<Locale, object>; // its own UI text: name, skill labels, script names
  evaluateResponse(item, skill, response): ResponseEvaluation | null; // incl. confusedWithItemId
  knownConfusables?(itemId): string[]; // curated similar items, used as distractors
  isComparable?(a, b): boolean; // which items make sensible answer options
}
```

Modules are registered in [`src/languages/registry.ts`](../../src/languages/registry.ts). Server code resolves a module through the item's `languageCode` and never by importing Japanese directly.

### Capabilities

Not every language has every feature. Japanese declares `character-recognition` and `character-writing`, while a language written in the Latin alphabet might declare neither. Features check capabilities, not language names. The Japanese module declares only the capabilities that are implemented today (character recognition and writing, vocabulary, grammar); listening and speaking will be added as they land.

### Skills

Skills are namespaced strings owned by the module:

| Skill                  | Stage       | Capability            |
| ---------------------- | ----------- | --------------------- |
| `ja.kana.recognition`  | recognition | character-recognition |
| `ja.kana.reading`      | recall      | character-recognition |
| `ja.kana.writing`      | production  | character-writing     |
| `ja.vocab.recognition` | recognition | vocabulary            |
| `ja.vocab.recall`      | recall      | vocabulary            |
| `ja.grammar.sentence`  | production  | grammar               |

Skill labels are localized in the module's `locales/<locale>.json`.

Mastery and review are tracked per item × skill, so adding a skill requires no schema change.

## Japanese module layout

```
src/languages/japanese/
├── index.ts                 Module definition (capabilities, skills, grading, confusables)
├── skills.ts                Skill ids and definitions
├── locales/{en,id}.json     The module's own UI text
├── scripts/kana.ts          Kana content schema, ids, romaji normalisation and checking
├── scripts/catalog.ts       Lookups over bundled kana data (reading → item, confusables)
├── vocabulary/schema.ts     Words: kana, kanji, romaji scaffold, part of speech, localized meaning
├── vocabulary/answers.ts    Accepts a typed word in kana, kanji or romaji
├── grammar/schema.ts        Grammar points: pattern, meaning, explanation, examples, common errors
├── sentences/schema.ts      Sentences: text, pieces for sentence building, grammar point, translation
├── kanji/schema.ts          Kanji: meanings, on/kun readings, stroke count (model only, not populated)
├── curriculum/schema.ts     Level, course and activity-template file schemas
├── curriculum/activities.ts Expands activity templates per lesson
└── content/validate.ts      Content consistency and translation checks

data/japanese/
├── characters/hiragana.json
├── characters/katakana.json
├── curriculum/levels.json             (JLPT: Foundation, N5…N1, and each level's courses)
├── curriculum/courses/hiragana.json   (localized titles)
├── curriculum/courses/katakana.json
├── curriculum/courses/n5-core.json    (N5 lessons: situation, objective, items)
├── vocabulary/n5-introductions.json
├── grammar/n5-introductions.json
├── sentences/n5-introductions.json
├── activities/kana.json               (activity templates with localized objectives)
├── activities/n5-lesson.json          (word recognition, word recall, sentence building)
└── confusion/kana.json                (commonly confused kana)
```

Future Japanese areas (`pronunciation/`, kanji content, listening) will be added next to these when implemented.

### Japanese content and JLPT

All content is original. Commercial textbooks (for example Minna no Nihongo) may inspire the order of topics, but no text, example or exercise is copied.

| Content type    | Item id / key                                  | Learning-language data (`content_items.data`) | Localized data (`content_item_translations`)                   |
| --------------- | ---------------------------------------------- | --------------------------------------------- | -------------------------------------------------------------- |
| `ja.kana`       | `ja.hiragana.a` / `hiragana:あ`                | script, kana, romaji, row, stroke count       | —                                                              |
| `ja.vocabulary` | `ja.vocab.sensei` / `vocabulary:せんせい`      | kana, kanji?, romaji, affix?, part of speech  | `meaning`                                                      |
| `ja.grammar`    | `ja.grammar.n5-wa-desu` / `grammar:n5-wa-desu` | pattern, examples (Japanese, romaji), related | `meaning`, `explanation`, example translations, `commonErrors` |
| `ja.sentence`   | `ja.sentence.watashi-gakusei`                  | text, pieces, romaji?, grammar point          | `translation`                                                  |
| `ja.kanji`      | (model only)                                   | character, readings, stroke count             | meanings                                                       |

The JLPT relationship is data, not code: each content file names the level it is introduced at, stored as `content_items.level_id`, and levels carry their official code in `levels.framework_level`. **Romaji is a temporary scaffold**: it is shown next to words in the early levels and accepted as a typed answer, but the canonical form is kana (and kanji where usual). Representative content only: N5 currently has one lesson (Introductions: 12 words, 4 grammar points, 6 sentences).

## Content as data

Content never lives in UI components. Each kana entry in `data/japanese/characters/*.json` looks like this:

```json
{ "kana": "し", "romaji": "shi", "alternateRomaji": ["si"], "row": "sa", "strokeCount": 1 }
```

The seeder validates files with Zod, stores each character as a `content_items` row (`type: "ja.kana"`, `data`: the payload above plus `script`), and builds lessons from `curriculum/*.json`, which reference items by key (`hiragana:し`).

## Adding a language (future)

1. Set its entry in `data/languages.json` to `"available"`.
2. Create `src/languages/<code>/` implementing `LanguageModule`.
3. Add content schemas and `data/<code>/` files, including its levels.
4. Add a seeder in `src/server/seed/` and call it from `src/server/db/bootstrap.ts`.
5. Register the module in `src/languages/registry.ts`.
6. Add language-specific UI under `src/features/` only where the generic UI is not enough.

Please open a discussion before starting. See [CONTRIBUTING.md](../../CONTRIBUTING.md).
