# Assessment

Practice teaches; assessment checks. They are separate on purpose.

- **Mode**: attempts made in a mock assessment are stored with `mode =
"assessment"` (practice is `practice`, due reviews are `review`).
- **Items**: each section draws the items of the level on that section's skill
  that the learner has attempted least, up to `questionCount`. Content is
  limited, so a question can be on an item the learner has seen; the result
  reports how many questions were on items never practiced before.
- **Reduced assistance**: no introduction step, no hints, and the multiple
  choice options are built the same way as in practice. Per-question feedback
  is still shown (this is a learning product). Reading and listening sections
  will join when that content exists.
- **Sitting**: the latest `questionCount` assessment attempts per section.
  Unanswered questions count as wrong, so a partial sitting cannot pass.
- **Scoring**: each section and the overall score must meet the platform
  thresholds. This mirrors the exam's "total _and_ every section" structure
  but with our own scale. It is shown as **Platform Mock Assessment Result**
  and is not an official JLPT score.
- **Readiness**: a passed mock is one input to Certification Ready; see
  [proficiency-framework.md](proficiency-framework.md).
