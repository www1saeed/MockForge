import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  use: { baseURL: 'http://localhost:4300', browserName: 'chromium' },
  webServer: {
    command: 'npm start -- --host 127.0.0.1',
    url: 'http://localhost:4300',
    reuseExistingServer: !process.env['CI'],
    timeout: 120000,
  },
});
