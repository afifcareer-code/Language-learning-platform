# Proficiency engine

```
data/<language>/proficiency/*.json   level specs (competencies, thresholds, assessment sections)
src/core/proficiency                 pure engine: competencyProgress, prerequisiteMet,
                                     scoreMockAssessment, assessReadiness
src/languages/<language>/proficiency loads + validates the data, exposes LanguageModule.proficiencyLevel()
src/server/services/proficiency.ts   derives evidence from mastery + attempts (no new table)
src/features/proficiency             generic UI: ProficiencyOverview, CompetencyProgress,
                                     ReadinessCard, AssessmentEvidence
```

Rules:

- `src/core/proficiency` is language-agnostic and obeys the architecture test
  (no language, persistence or UI imports; no Japanese terms).
- Nothing is stored for proficiency. Status is recomputed from `mastery`,
  `review_schedule` and `learning_attempts`, so it follows what the learner did.
- A competency with `availability: "planned"` is never measured and keeps
  readiness below Certification Ready.
- Another language adds its own `proficiencyLevel()` and data files; no core
  or component change is needed.
- Session kind `assessment` (`/practice/session?kind=assessment&level=…&section=…`)
  builds a mock-assessment section; attempts use the normal single write path
  (`recordAttempt`) with mode `assessment`.
