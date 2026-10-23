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
