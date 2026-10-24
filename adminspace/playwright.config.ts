/**
 * End-to-end tests (Playwright, Chromium) against the production build.
 *
 *   npm run test:e2e          # build, then run every spec
 *   npm run test:e2e:report   # open the last HTML report
 *
 * tests/e2e/global-setup.ts creates a throwaway database, seeds it and starts the servers; the base URL
 * is only known then, so specs import `test` from tests/e2e/support/test.ts, which provides it.
 */
import { defineConfig, devices } from "@playwright/test";

// Generated files stay out of git, ESLint and Prettier (see tests/e2e/support/state.ts).
const OUTPUT = "node_modules/.cache/adminspace-e2e";

export default defineConfig({
    testDir: "tests/e2e",
    testMatch: /.*\.spec\.ts$/,
    outputDir: `${OUTPUT}/results`,
    globalSetup: "./tests/e2e/global-setup.ts",
    globalTeardown: "./tests/e2e/global-teardown.ts",
    fullyParallel: true,
    forbidOnly: Boolean(process.env.CI),
    retries: 0,
    workers: process.env.CI ? 2 : 4,
    timeout: 60_000,
    expect: { timeout: 10_000 },
    reporter: [
        ["list"],
        ["html", { outputFolder: `${OUTPUT}/report`, open: "never" }],
        ["json", { outputFile: `${OUTPUT}/results.json` }],
    ],
    use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
        locale: "en-US",
        timezoneId: "Europe/Paris",
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
    },
    projects: [{ name: "chromium" }],
});
