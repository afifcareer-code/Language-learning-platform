import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1).default("file:./.data/app.db"),
  DATABASE_AUTH_TOKEN: z
    .string()
    .optional()
    .transform((v) => v || undefined),
  DEFAULT_LEARNER_NAME: z.string().min(1).default("Learner"),
});

export type Env = z.infer<typeof envSchema>;

export function readEnv(source: NodeJS.ProcessEnv = process.env): Env {
  return envSchema.parse(source);
}
