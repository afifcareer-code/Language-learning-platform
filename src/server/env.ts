import { z } from "zod";

const flag = (fallback: boolean) =>
  z
    .string()
    .optional()
    .transform((v) =>
      v === undefined || v === "" ? fallback : !["0", "false", "no", "off"].includes(v.toLowerCase()),
    );

/**
 * Application settings. Database connection settings are resolved separately
 * by ./db/config.ts, which understands many hosting-panel conventions.
 */
const envSchema = z.object({
  DEFAULT_LEARNER_NAME: z.string().min(1).default("Learner"),
  /** Apply pending migrations when the server starts. */
  AUTO_MIGRATE: flag(true),
  /** Load or refresh bundled content when the server starts. */
  AUTO_SEED: flag(true),
});

export type Env = z.infer<typeof envSchema>;

export function readEnv(source: NodeJS.ProcessEnv = process.env): Env {
  return envSchema.parse(source);
}
