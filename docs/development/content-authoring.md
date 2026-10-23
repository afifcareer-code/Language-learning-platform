# Authoring proficiency content

1. Add the level to `data/<language>/proficiency/framework.json`.
2. Add `<level>.json`: domains, competencies (`skills`, `availability`,
   `examAligned`, localized `title`), thresholds, and assessment sections.
   Every `skills` entry must be a skill the language module declares.
3. Keep a competency `planned` until activities exist for its skills.
4. Write original content only. Cite official sources; never copy exam items or
   textbook text.
5. Run `npm run content:validate` (checks schema, skill ids and locales) and
   `npm test`.

## Practice content: situations, texts and conversations

Practice stages draw on two content folders next to `sentences/`. Both are validated by `npm run content:validate` and seeded with the rest.

- `data/japanese/situations/*.json`: `{ slug, kind: "context" | "free", model, romaji?, prompt: { en, id } }`. `context` situations expect one appropriate reply; `free` ones are written in the learner's own words and the model is only an example.
- `data/japanese/passages/*.json`: `{ slug, form: "text" | "dialogue", lines: [{ speaker?, text }], answer, comprehension: { en: { question, options[4] }, id: { … } } }`. `answer` is the index of the correct option and is the same in every locale; options must differ from each other.

After adding or changing Japanese text, rebuild the audio (`python3 scripts/audio/build-audio.py`). A conversation is one clip: its lines joined with a space.
