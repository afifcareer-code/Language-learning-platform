import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
// Optional: use a system Chromium instead of Playwright's managed download.
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined;

/** Test-only admin for the accounts server (created from ADMIN_EMAIL / ADMIN_PASSWORD on start). */
export const E2E_ADMIN = { email: "admin@example.test", password: "e2e-admin-password" };

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  // Tests share one database (and the learner's language setting), so run them one at a time.
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    launchOptions: { executablePath },
  },
  projects: [
    // Tablet is the primary target for handwriting, so it is tested first.
    {
      name: "tablet",
      use: { ...devices["iPad Pro 11 landscape"], browserName: "chromium" },
      testIgnore: /auth\.spec/,
    },
    // Onboarding runs once, on the fresh database, before the tablet smoke tests.
    {
      name: "mobile",
      use: { ...devices["Pixel 7"], browserName: "chromium" },
      testIgnore: /onboarding|auth\.spec/,
    },
    // Accounts mode runs on a second server with its own database.
    {
      name: "accounts",
      testMatch: /auth\.spec/,
      use: { ...devices["Pixel 7"], browserName: "chromium", baseURL: `http://localhost:${PORT + 1}` },
    },
  ],
  webServer: [
    {
      command: `npm run db:setup && npm run build && npx next start -p ${PORT}`,
      url: `http://localhost:${PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 240_000,
      env: { DATABASE_URL: "file:./.data/e2e.db" },
    },
    {
      // Accounts mode: the same build, its own database. Waits for the first server (and so the build).
      command:
        `until curl -sf http://localhost:${PORT} >/dev/null; do sleep 1; done; ` +
        `npm run db:setup && npx next start -p ${PORT + 1}`,
      url: `http://localhost:${PORT + 1}/login`,
      reuseExistingServer: !process.env.CI,
      timeout: 300_000,
      env: {
        DATABASE_URL: "file:./.data/e2e-auth.db",
        AUTH_MODE: "accounts",
        // Throwaway test values, not real credentials.
        ADMIN_EMAIL: E2E_ADMIN.email,
        ADMIN_PASSWORD: E2E_ADMIN.password,
        APP_SECRET: "e2e-only-secret-not-used-anywhere-else",
      },
    },
  ],
});
