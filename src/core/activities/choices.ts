/**
 * Build the options for a choice-based activity. Distractors the learner is
 * known to confuse with the target come first, because practising the
 * discrimination is the point; the rest are drawn from the pool.
 */
export function buildChoices(
  targetId: string,
  pool: readonly string[],
  preferredDistractors: readonly string[],
  optionCount: number,
  random: () => number = Math.random,
): string[] {
  const distractors: string[] = [];
  const add = (id: string) => {
    if (id !== targetId && pool.includes(id) && !distractors.includes(id)) distractors.push(id);
  };
  preferredDistractors.forEach(add);
  const rest = pool.filter((id) => id !== targetId && !distractors.includes(id));
  while (rest.length && distractors.length < optionCount - 1) {
    add(rest.splice(Math.floor(random() * rest.length), 1)[0]!);
  }
  const options = [targetId, ...distractors.slice(0, Math.max(0, optionCount - 1))];
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [options[i], options[j]] = [options[j]!, options[i]!];
  }
  return options;
}
