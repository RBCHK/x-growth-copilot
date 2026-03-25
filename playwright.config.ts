import { defineConfig, devices } from "@playwright/test";
import path from "path";

const PORT = process.env.PORT || 3000;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: path.join(__dirname, "tests"),
  outputDir: "test-results/",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "html" : "list",

  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  webServer: {
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },

  projects: [
    {
      name: "setup",
      testMatch: /global-setup\.ts/,
    },
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        storageState: path.join(__dirname, "tests/.auth/user.json"),
      },
      dependencies: ["setup"],
    },
    {
      name: "mobile-safari",
      use: {
        ...devices["iPhone 15 Pro"],
        browserName: "webkit",
        storageState: path.join(__dirname, "tests/.auth/user.json"),
      },
      dependencies: ["setup"],
    },
  ],
});
