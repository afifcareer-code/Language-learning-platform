import { z } from "zod";

/** A course file under data/japanese/curriculum. Lessons reference content by item key. */
export const courseFileSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  description: z.string(),
  lessons: z
    .array(
      z.object({
        slug: z.string().regex(/^[a-z0-9-]+$/),
        title: z.string().min(1),
        items: z.array(z.string().min(1)).min(1),
      }),
    )
    .min(1),
});

export type CourseFile = z.infer<typeof courseFileSchema>;
