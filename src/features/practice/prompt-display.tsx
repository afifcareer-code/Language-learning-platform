import type { PracticeItem } from "@/features/japanese/practice-items";
import { cn } from "@/shared/cn";

/** The prompt of an exercise, sized for what it is: one character, a word, or a sentence. */
export function PromptDisplay({ item }: { item: PracticeItem }) {
  return (
    <p
      lang={item.displayLang}
      className={cn(
        "break-words",
        item.displayStyle === "glyph" && "font-jp text-[7rem] leading-none md:text-[9rem]",
        item.displayStyle === "word" && "font-jp text-5xl leading-tight font-medium md:text-6xl",
        item.displayStyle === "text" && "text-2xl leading-snug font-semibold md:text-3xl",
      )}
    >
      {item.display}
    </p>
  );
}
