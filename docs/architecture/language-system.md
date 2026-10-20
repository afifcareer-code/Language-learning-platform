# Language system

## Japanese-first, language-agnostic

We are building **one language well** instead of many languages poorly. Japanese is the first module, and it is a demanding one: two phonetic scripts, kanji, handwriting and a well-known proficiency framework (JLPT). If the core engine can support Japanese without knowing anything about it, it is very likely to support other languages too.

We therefore:

- **do** keep the core free of Japanese concepts (kana, kanji, JLPT, romaji),
- **do** let Japanese declare what it supports through capabilities and skills,
- **do not** build language switching, placeholder modules or content for other languages yet.

## The module contract

```ts
interface LanguageModule {
  code: string; // BCP 47, e.g. "ja"
  name: string; // "Japanese"
  nativeName: string; // "日本語"
  capabilities: Capability[]; // what it supports
  skills: SkillDefinition[]; // what it can measure
  evaluateResponse(item, skill, response): ResponseEvaluation | null;
}
```

Modules are registered in [`src/languages/registry.ts`](../../src/languages/registry.ts). Server code resolves a module through the item's `languageCode` and never by importing Japanese directly.

### Capabilities

Not every language has every feature. Japanese declares `character-recognition` and `character-writing`, while a language written in the Latin alphabet might declare neither. Features check capabilities, not language names. The Japanese module declares only the capabilities that are implemented today; vocabulary, grammar and listening will be added as they land.

### Skills

Skills are namespaced strings owned by the module:

| Skill             | Stage      | Capability            |
| ----------------- | ---------- | --------------------- |
| `ja.kana.reading` | recall     | character-recognition |
| `ja.kana.writing` | production | character-writing     |

Mastery and review are tracked per item × skill, so adding a skill requires no schema change.

## Japanese module layout

```
src/languages/japanese/
├── index.ts               Module definition (capabilities, skills, grading)
├── skills.ts              Skill ids and definitions
├── scripts/kana.ts        Kana content schema, ids, romaji normalisation and checking
├── curriculum/schema.ts   Course file schema
└── content/validate.ts    Content consistency checks

data/japanese/
├── characters/hiragana.json
├── characters/katakana.json
└── curriculum/kana-foundations.json
```

Future Japanese areas (`vocabulary/`, `kanji/`, `grammar/`, `sentences/`, `pronunciation/`, `proficiency/` for JLPT) will be added next to `scripts/` when implemented.

## Content as data

Content never lives in UI components. Each kana entry in `data/japanese/characters/*.json` looks like this:

```json
{ "kana": "し", "romaji": "shi", "alternateRomaji": ["si"], "row": "sa", "strokeCount": 1 }
```

The seeder validates files with Zod, stores each character as a `content_items` row (`type: "ja.kana"`, `data`: the payload above plus `script`), and builds lessons from `curriculum/*.json`, which reference items by key (`hiragana:し`).

## Adding a language (future)

1. Create `src/languages/<code>/` implementing `LanguageModule`.
2. Add content schemas and `data/<code>/` files.
3. Add a seeder in `database/seeders/`.
4. Register the module in `src/languages/registry.ts`.
5. Add language-specific UI under `src/features/` only where the generic UI is not enough.

Please open a discussion before starting. See [CONTRIBUTING.md](../../CONTRIBUTING.md).
