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
  /**
   * `single`: one local learner, no sign-in (default, as in earlier versions).
   * `accounts`: email and password accounts, one learner per account.
   */
  AUTH_MODE: z.enum(["single", "accounts"]).default("single"),
  /** Apply pending migrations when the server starts. */
  AUTO_MIGRATE: flag(true),
  /** Load or refresh bundled content when the server starts. */
  AUTO_SEED: flag(true),
  /**
   * Public address of the app, e.g. https://belajar.example.com. Session cookies are
   * marked Secure when it starts with https. No domain is written in the code.
   */
  APP_URL: z
    .string()
    .url()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  /**
   * Long random secret (32+ characters). Session tokens are stored as HMACs keyed by it,
   * so sessions survive a new domain or database URL, but end if the secret changes.
   */
  APP_SECRET: z
    .string()
    .optional()
    .transform((v) => (v ? v : undefined)),
  /** First admin, created on start when both are set (accounts mode). Remove the password afterwards. */
  ADMIN_EMAIL: z
    .string()
    .optional()
    .transform((v) => (v ? v : undefined)),
  ADMIN_PASSWORD: z
    .string()
    .optional()
    .transform((v) => (v ? v : undefined)),
});

export type Env = z.infer<typeof envSchema>;

export function readEnv(source: NodeJS.ProcessEnv = process.env): Env {
  return envSchema.parse(source);
}
