import { expect, Page, test } from '@playwright/test';
import { buildSync } from 'esbuild';
import type { generateTestDataBatch } from '../src/app/preview-data-batch';
import type { createField, LEAF_FIELD_TYPES } from '../src/app/project.model';
import type { example } from '../src/app/project.examples';

type Harness = {
  generateTestDataBatch: typeof generateTestDataBatch;
  createField: typeof createField;
  LEAF_FIELD_TYPES: typeof LEAF_FIELD_TYPES;
  example: typeof example;
};
declare global {
  interface Window {
    batch: Harness;
  }
}

const bundle = buildSync({
  stdin: {
    contents: `export { generateTestDataBatch } from './src/app/preview-data-batch';
export { createField, LEAF_FIELD_TYPES } from './src/app/project.model';
export { example } from './src/app/project.examples';`,
    resolveDir: process.cwd(),
    loader: 'ts',
  },
  bundle: true,
  write: false,
  format: 'iife',
  globalName: 'batch',
  platform: 'browser',
  target: 'es2022',
}).outputFiles[0].text;

async function open(page: Page): Promise<void> {
  await page.goto('/#workspace');
  await page.addScriptTag({ content: bundle });
}

test('explicit undefined defaults and unselected one-option radios match real browser state', async ({
  page,
}): Promise<void> => {
  await open(page);
  const result = await page.evaluate(async () => {
    const { generateTestDataBatch, createField, example } = window.batch;
    const radio = createField('radio', 'single');
    radio.options = radio.options.slice(0, 1);
    const source = { ...example('saas'), fields: [radio] };
    const defaults = { count: 1, locale: 'en' as const, seed: 7 };
    const baseline = await generateTestDataBatch(source, defaults);
    const explicit = await generateTestDataBatch(source, {
      ...defaults,
      referenceDate: undefined,
      scenario: undefined,
      boundary: undefined,
      rows: undefined,
      chunkSize: undefined,
    });
    const empty = await generateTestDataBatch(source, { ...defaults, count: 2, scenario: 'empty' });
    const required = await generateTestDataBatch(
      { ...source, fields: [{ ...radio, required: true }] },
      { ...defaults, scenario: 'invalid' },
    );
    return { same: JSON.stringify(baseline) === JSON.stringify(explicit), empty, required };
  });
  expect(result.same).toBe(true);
  expect(result.empty.records.map((record) => record.values['single'])).toEqual(['', '']);
  expect(result.empty.statistics.responses['preview-single']).toEqual({ observed: 2, distinct: 1 });
  expect(result.required.records[0].values['single']).toBe('');
  expect(result.required.records[0].diagnostics[0]).toMatchObject({
    outcome: 'filled',
    actualValid: false,
  });
});

test('batch records pass real native type/group/pattern checks without changing the workspace', async ({
  page,
}): Promise<void> => {
  await open(page);
  const result = await page.evaluate(async () => {
    const { generateTestDataBatch, createField, example, LEAF_FIELD_TYPES } = window.batch;
    const fields = LEAF_FIELD_TYPES.map((type) => ({ ...createField(type, type), required: true }));
    const group = createField('group', 'people');
    group.group!.maxItems = 2;
    group.group!.fields = [{ ...createField('email', 'person'), required: true }];
    fields.push(
      { ...createField('textarea', 'code'), required: true, pattern: 'ID-\\d{3}' },
      group,
    );
    const before = localStorage.getItem('mockforge-studio-v1');
    const visible = document.querySelector('app-root')!.innerHTML;
    const batch = await generateTestDataBatch(
      { ...example('saas'), fields },
      { count: 3, locale: 'fa', seed: 9, rows: 'maximum' },
    );
    return {
      batch,
      unchanged: before === localStorage.getItem('mockforge-studio-v1'),
      sameUI: visible === document.querySelector('app-root')!.innerHTML,
    };
  });
  expect(result.batch.status).toBe('complete');
  expect(result.batch.records).toHaveLength(3);
  expect(
    result.batch.records.every((item) =>
      item.diagnostics.every((entry) => entry.outcome === 'filled' && entry.actualValid),
    ),
  ).toBe(true);
  expect(result.batch.records[0].values['code']).toMatch(/^ID-\d{3}$/);
  expect(result.batch.records[0].values['people']).toHaveLength(2);
  expect(result.unchanged).toBe(true);
  expect(result.sameUI).toBe(true);
});

test('500 records yield to browser events and report finite diversity with monotonic chunks', async ({
  page,
}, info): Promise<void> => {
  await open(page);
  const result = await page.evaluate(async () => {
    const { generateTestDataBatch, createField, example } = window.batch;
    let ticks = 0;
    const timer = setInterval(() => ticks++, 1);
    const progress: number[] = [];
    const started = performance.now();
    try {
      const batch = await generateTestDataBatch(
        { ...example('saas'), fields: [createField('checkbox', 'ok')] },
        { count: 500, locale: 'en', seed: 999999, chunkSize: 25 },
        { onProgress: (event) => progress.push(event.completed) },
      );
      return {
        status: batch.status,
        count: batch.records.length,
        statistics: batch.statistics,
        progress,
        ticks,
        elapsed: performance.now() - started,
      };
    } finally {
      clearInterval(timer);
    }
  });
  expect(result.status).toBe('complete');
  expect(result.count).toBe(500);
  expect(result.statistics).toMatchObject({ distinctRecords: 1, duplicateRecords: 499 });
  expect(result.progress).toEqual(Array.from({ length: 21 }, (_, i) => i * 25));
  expect(result.ticks).toBeGreaterThan(1);
  await info.attach('local Chromium batch timing', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
});

test('cancellation and output caps return complete records and explicit partial status', async ({
  page,
}): Promise<void> => {
  await open(page);
  const result = await page.evaluate(async () => {
    const { generateTestDataBatch, createField, example } = window.batch;
    const controller = new AbortController();
    const source = { ...example('saas'), fields: [createField('email', 'email')] };
    const cancelled = await generateTestDataBatch(
      source,
      { count: 500, locale: 'en', seed: 0, chunkSize: 2 },
      {
        signal: controller.signal,
        onProgress: (event) => {
          if (event.completed === 2) controller.abort();
        },
      },
    );
    const fields = Array.from({ length: 20 }, (_, i) => ({
      ...createField('text', `f${i}`),
      minLength: 10000,
    }));
    const capped = await generateTestDataBatch(
      { ...source, fields },
      { count: 30, locale: 'de', seed: 0 },
    );
    return {
      cancelled,
      status: capped.status,
      reason: capped.reason,
      count: capped.records.length,
      complete: capped.records.every((item) => Object.keys(item.values).length === 20),
    };
  });
  expect(result.cancelled.status).toBe('cancelled');
  expect(result.cancelled.records).toHaveLength(2);
  expect(result).toMatchObject({ status: 'budget', reason: 'output', complete: true });
  expect(result.count).toBeGreaterThan(0);
  expect(result.count).toBeLessThan(30);
});
