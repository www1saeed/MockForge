import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  workers: 2,
  forbidOnly: !!process.env['CI'],
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['junit', { outputFile: 'reports/e2e/results.xml' }],
    ['json', { outputFile: 'reports/e2e/results.json' }],
  ],
  use: {
    baseURL: 'http://localhost:4300',
    browserName: 'chromium',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm start -- --host 127.0.0.1',
    url: 'http://localhost:4300',
    reuseExistingServer: !process.env['CI'],
    timeout: 120000,
  },
});
