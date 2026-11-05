import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import {
  inventory,
  parseOptions,
  root,
  selectCases,
  selectionGrep,
  validateInventory,
} from './e2e-selection.mjs';

const cli = createRequire(import.meta.url).resolve('@playwright/test/cli');
try {
  const options = parseOptions(process.argv.slice(2));
  const discovery = spawnSync(process.execPath, [cli, 'test', '--list', '--reporter=json'], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
    env: {
      ...process.env,
      PLAYWRIGHT_JSON_OUTPUT_FILE: '',
      PLAYWRIGHT_JSON_OUTPUT_NAME: '',
      PLAYWRIGHT_JSON_OUTPUT_DIR: '',
    },
  });
  if (discovery.error) throw discovery.error;
  if (discovery.status !== 0)
    throw new Error(discovery.stderr || discovery.stdout || 'Playwright discovery failed.');
  const cases = inventory(JSON.parse(discovery.stdout));
  validateInventory(cases);
  if (options.checkOnly) {
    console.log(`Validated ${cases.length} E2E cases and their suite/area/check/smoke metadata.`);
  } else {
    const selected = selectCases(cases, options);
    console.log(
      `Selected ${selected.length}/${cases.length} Chromium journeys (${options.smoke ? 'smoke' : options.areas.length || options.checks.length ? 'requested areas/checks plus smoke' : 'full regression'}).`,
    );
    if (options.plan || options.list) {
      for (const entry of selected)
        console.log(`${entry.file}: ${entry.title}\n  ${entry.tags.join(' ')}`);
    } else {
      const result = spawnSync(process.execPath, [cli, 'test', '--grep', selectionGrep(selected)], {
        cwd: root,
        stdio: 'inherit',
      });
      if (result.error) throw result.error;
      process.exitCode = result.status ?? 1;
    }
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
