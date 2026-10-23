# Native sentences

`tatoeba.json` holds sentences written by Japanese speakers, imported from [Tatoeba](https://tatoeba.org) by
`scripts/content/import-tatoeba.py`. They are licensed **CC BY 2.0 FR** (https://creativecommons.org/licenses/by/2.0/fr/).

- Attribution is kept with every sentence (`source`): the Tatoeba sentence id and author, and the id and author of each translation. The app shows it under the sentence after an answer, and links to the sentence on Tatoeba.
- Only the selection and the review exclusions (`EXCLUDE_IDS` in the script) are ours. The sentences and translations are not modified.
- To refresh: `python3 scripts/content/import-tatoeba.py`, review the diff, then `python3 scripts/audio/build-audio.py` and `npm run content:validate`.

The rest of the project is Apache-2.0; this data folder keeps its own licence.
