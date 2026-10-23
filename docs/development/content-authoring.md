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
