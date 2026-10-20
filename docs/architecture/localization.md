# Localization

Three concerns are kept separate (and distinct from the learner's **proficiency level**, see [Language system](language-system.md#three-separate-concepts)):

| Concern                           | Example                                                      | Where                                        |
| --------------------------------- | ------------------------------------------------------------ | -------------------------------------------- |
| **Platform (UI) language**        | Menus, buttons, feedback: "Latihan" / "Practice"             | `locales/<locale>/*.json`                    |
| **Learning content localization** | Activity objectives, lesson titles in the learner's language | `*_translations` tables, authored in `data/` |
| **Learning language**             | Japanese: the language being learned                         | Language modules (`src/languages/japanese`)  |

A learner can study Japanese with an Indonesian or English interface. Switching the interface language never changes the Japanese content.

Supported platform locales: **`id`** (Bahasa Indonesia) and **`en`** (English), defined in [`src/localization/config.ts`](../../src/localization/config.ts).

## Choosing the locale

For each request ([`src/localization/server.ts`](../../src/localization/server.ts)):

1. The learner's saved preference (`learners.ui_locale`), set with the **ID / EN switcher in the app shell** (sidebar on tablet and desktop, header on mobile, and on the language-selection screens) or on the Settings page.
2. Otherwise the browser's `Accept-Language` header.
3. Otherwise `DEFAULT_LOCALE` from the environment, falling back to `en`.

## UI messages

- One JSON file per namespace: `common`, `dashboard`, `learning`, `practice`, `review`, `progress`, `settings`.
- Language modules ship their own messages (language name, skill labels, script names) in `src/languages/<code>/locales/`, merged under the module code (`ja.skills…`). Module-specific text stays inside the module.
- `{name}` placeholders are interpolated. Plurals are objects chosen with `Intl.PluralRules`:
  ```json
  "items": { "one": "{count} item", "other": "{count} items" }
  ```
  Indonesian has no grammatical plural, so it only needs `"other"`.
- Numbers, percentages, dates and relative times ("besok", "tomorrow") use `Intl` for the active locale.
- Server components use `getI18n()`; client components use `useT()`. Keys are type-checked against the English files.
- Missing messages fall back to English.

Tests (`tests/unit/localization.test.ts`) require every locale to define exactly the same keys as English, with the same placeholders.

## Content translations

The database never has columns per language (no `title_id` / `title_en`). Each translatable entity has a translation table keyed by `(entity_id, locale)`:

```
activities ──< activity_translations (activity_id, locale, title, objective, instruction, explanation)
lessons    ──< lesson_translations   (lesson_id, locale, title, description)
courses    ──< course_translations   (course_id, locale, title, description)
levels     ──< level_translations    (level_id, locale, title, description)
```

Adding a locale requires no schema change. Lookups fall back to the content source locale (`en`) and then to any available translation.

In data files, translatable fields are authored as locale maps:

```json
"title": { "en": "Hiragana: K row", "id": "Hiragana: Baris K" }
```

`npm run content:validate` reports any field missing a platform locale.

## Adding a platform locale

1. Add the code to `LOCALES`, `LOCALE_NAMES` and `INTL_LOCALE` in `src/localization/config.ts`.
2. Copy `locales/en/` to `locales/<code>/` and translate; import the files in `src/localization/messages.ts`.
3. Add `<code>.json` to each language module's `locales/` folder.
4. Add `<code>` translations to the content files in `data/`.
5. Run `npm test` and `npm run content:validate`; both list anything missing.
