/** URLs for practice sessions. */

export function activityHref(activityId: string): string {
  return `/activities/${encodeURIComponent(activityId)}`;
}

export function reviewHref(skill: string): string {
  return `/practice/session?${new URLSearchParams({ kind: "review", skill })}`;
}

export function weakItemsHref(skill: string): string {
  return `/practice/session?${new URLSearchParams({ kind: "weak", skill })}`;
}

export function confusionHref(itemA: string, itemB: string): string {
  return `/practice/session?${new URLSearchParams({ kind: "confusion", a: itemA, b: itemB })}`;
}

export function assessmentHref(level: string, section: string): string {
  return `/practice/session?${new URLSearchParams({ kind: "assessment", level, section })}`;
}

/** A Practice stage: continuous skill training outside the curriculum. */
export function stageHref(skillId: string, stageId: string): string {
  return `/practice/session?${new URLSearchParams({ kind: "stage", practiceSkill: skillId, stage: stageId })}`;
}
