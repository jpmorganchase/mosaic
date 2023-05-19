import { PlaywrightTestConfig, devices } from '@playwright/test';
import path from 'path';

// Use process.env.PORT by default and fallback to port 3000
const PORT = process.env.PORT || 3000;

// Set webServer.url and use.baseURL with the location of the WebServer respecting the correct set port
const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || `http://localhost:${PORT}`;

// Reference: https://playwright.dev/docs/test-configuration
const config: PlaywrightTestConfig = {
  workers: process.env.CI ? 2 : undefined,
  // Timeout per test
  timeout: 120 * 1000,
  // Test directory
  testDir: path.posix.join(__dirname, 'e2e'),
  // If a test fails, retry it additional 2 times
  retries: process.env.CI ? 2 : 0,
  // Artifacts folder where screenshots, videos, and traces are stored.
  outputDir: path.join(__dirname, 'e2e', 'test-results'),
  expect: {
    toHaveScreenshot: { threshold: 0.3, maxDiffPixelRatio: 0.3 }
  },

  use: {
    // Use baseURL so to make navigations relative.
    // More information: https://playwright.dev/docs/api/class-testoptions#test-options-base-url
    baseURL,
    headless: true,
    viewport: { width: 2048, height: 720 },

    // Retry a test if its failing with enabled tracing. This allows you to analyse the DOM, console logs, network traffic etc.
    // More information: https://playwright.dev/docs/trace-viewer
    trace: 'retry-with-trace'

    // All available context options: https://playwright.dev/docs/api/class-browser#browser-new-context
    // contextOptions: {
    //   ignoreHTTPSErrors: true,
    // },
  },

  projects: [
    {
      name: 'Desktop Chrome',
      use: {
        ...devices['Desktop Chrome'],
        bypassCSP: true,
        launchOptions: {
          args: ['--disable-web-security']
        }
      }
    }
  ]
};
export default config;
