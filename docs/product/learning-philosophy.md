# Learning philosophy

## The progression

```
Recognition → Understanding → Recall → Production → Automaticity → Retention
```

| Stage         | Question it answers                       | Example (Japanese kana)                |
| ------------- | ----------------------------------------- | -------------------------------------- |
| Recognition   | Have I seen this before?                  | Spot あ among other characters         |
| Understanding | Do I know what it means or how it sounds? | あ is "a"                              |
| Recall        | Can I retrieve it without options?        | See あ, type "a"                       |
| Production    | Can I create it myself?                   | Hear or see "a", write あ by hand      |
| Automaticity  | Is it fast and effortless?                | Read あ instantly in a word            |
| Retention     | Do I still know it weeks later?           | Recall あ correctly after a 14-day gap |

Each skill a language module declares is tagged with the stage it measures. In v0.1, _kana reading_ measures **recall** and _kana writing_ measures **production**.

## What we measure

The unit of mastery is **one content item × one skill**: for example, "あ, kana writing". Each attempt records whether the answer was correct, a score, the response and how long it took.

From that evidence the mastery engine derives a state:

| State        | Meaning (default policy)                                                    |
| ------------ | --------------------------------------------------------------------------- |
| Not started  | No attempts yet                                                             |
| Learning     | Recent errors, or only one correct answer in a row                          |
| Practicing   | At least 2 correct in a row, but not yet proven over time                   |
| Proficient   | At least 3 correct in a row **and** recalled after a gap of 3 or more days  |
| Mastered     | At least 5 correct in a row **and** recalled after a gap of 14 or more days |
| Needs review | Was proficient or mastered, then was missed or became long overdue          |

The **time gap is the key**. The review scheduler only lengthens an item's interval when the item is answered correctly _on or after its due date_. Answering the same item ten times in one sitting therefore cannot make it proficient. This is how the engine separates short-term performance from retention.

## What we deliberately do not measure

- Lessons completed or pages viewed
- Time spent in the app
- Streaks as a goal in themselves

These may appear as context later, but they never drive mastery.

## Handwriting

Writing is practised with progressively less support:

1. **Trace**: a full model character behind the canvas.
2. **Faded guide**: a faint model.
3. **Hint only**: no model unless the learner asks for a hint.
4. **From memory**: only the prompt.

The stage follows the learner's writing mastery of that character. After writing, the learner compares their attempt with the model and grades themselves. Automatic checks (v0.1: stroke count) can lower that grade but never raise it.

## Recommendations

"What should I do next?" is answered by transparent rules, in this order:

1. **Due reviews**, to protect what has already been learned.
2. **Weak items** (the last attempt was wrong), to fix errors while they are fresh.
3. **The next lesson**, to add new material.
