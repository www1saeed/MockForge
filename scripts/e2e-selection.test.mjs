import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  catalogue,
  inventory,
  parseOptions,
  selectCases,
  selectionGrep,
  validateInventory,
} from './e2e-selection.mjs';

const entry = (id, tags) => ({ title: id, file: 'studio.spec.ts', tags: [`@case-${id}`, ...tags] });
const cases = [
  entry('validation', ['@area-preview', '@a11y']),
  entry('layout', ['@area-preview', '@responsive']),
  entry('guide', ['@area-guide', '@i18n', '@smoke']),
  entry('review', ['@area-review', '@smoke']),
  entry('slides', ['@area-presentation']),
];
function registered() {
  return Object.entries(catalogue.suites).map(([suite, areas], index) => ({
    title: suite,
    file: `${suite}.spec.ts`,
    tags: [
      `@suite-${suite}`,
      `@case-${suite}`,
      ...areas.map((area) => `@area-${area}`),
      ...(index < 3 ? ['@smoke'] : []),
      ...(index === 0 ? ['@i18n'] : []),
    ],
  }));
}

test('discovery normalizes reporter tags and traverses nested suites', () => {
  assert.deepEqual(
    inventory({
      suites: [
        {
          suites: [
            { specs: [{ title: 'a', file: 'e2e\\studio.spec.ts', tags: ['case-a', '@a11y'] }] },
          ],
        },
      ],
    }),
    [{ title: 'a', file: 'e2e/studio.spec.ts', tags: ['@case-a', '@a11y'] }],
  );
  assert.throws(() => inventory({ errors: [{ message: 'Discovery failed' }] }), /Discovery failed/);
});

test('full selection preserves all cases and smoke picks only its journeys', () => {
  assert.deepEqual(selectCases(cases, parseOptions([])), cases);
  assert.deepEqual(selectCases(cases, parseOptions(['--smoke'])), cases.slice(2, 4));
});

test('areas and checks each union, then intersect, before adding smoke', () => {
  assert.deepEqual(selectCases(cases, parseOptions(['--area', 'preview,presentation'])), cases);
  assert.deepEqual(
    selectCases(cases, parseOptions(['--area', 'preview', '--check', 'a11y,i18n'])),
    [cases[0], cases[2], cases[3]],
  );
  assert.deepEqual(selectCases(cases, parseOptions(['--check', 'responsive'])), [
    cases[1],
    cases[2],
    cases[3],
  ]);
});

test('an empty requested intersection fails even if smoke exists', () => {
  assert.throws(() => selectCases(cases, parseOptions(['--area', 'forms'])), /no tests/);
  assert.throws(
    () => selectCases(cases, parseOptions(['--area', 'preview', '--check', 'i18n'])),
    /no tests/,
  );
});

test('invalid options and smoke mixed with targeting fail explicitly', () => {
  for (const args of [
    ['--area', 'typo'],
    ['--area'],
    ['--check', 'unknown'],
    ['--grep', '.*'],
    ['--smoke', '--area', 'preview'],
    ['--check', 'a11y,'],
  ])
    assert.throws(() => parseOptions(args));
  assert.deepEqual(parseOptions(['--area', 'preview', '--area', 'review', '--plan']).areas, [
    'preview',
    'review',
  ]);
  assert.equal(parseOptions(['--list']).list, true);
  assert.equal(parseOptions(['--check-catalogue']).checkOnly, true);
});

test('selection grep matches whole identities and cannot broaden to a prefix case', () => {
  const grep = new RegExp(selectionGrep([entry('test', []), entry('second', [])]));
  assert.equal(grep.test('journey @case-test @area-preview'), true);
  assert.equal(grep.test('journey @case-second'), true);
  assert.equal(grep.test('journey @case-test-extra'), false);
  assert.throws(() => selectionGrep([]), /Empty/);
});

test('registered suites and complete discovered metadata validate', () => {
  assert.doesNotThrow(() => validateInventory(registered()));
  assert.throws(() => validateInventory(registered(), []), /registered/);
  assert.throws(() => validateInventory(registered().slice(1)), /discover/);
});

test('wrong suite identity, missing IDs and duplicate IDs fail validation', () => {
  for (const change of [
    (items) => {
      items[0].file = 'unknown.spec.ts';
    },
    (items) => {
      items[0].tags[0] = '@suite-studio';
    },
    (items) => {
      items[0].tags.splice(1, 1);
    },
    (items) => {
      items[0].tags[1] = items[1].tags[1];
    },
    (items) => {
      items[0].tags[1] = '@case-unsafe|regex';
    },
  ]) {
    const items = registered();
    change(items);
    assert.throws(() => validateInventory(items));
  }
});

test('unknown and duplicate tags or missing areas cannot silently exclude a case', () => {
  for (const change of [
    (items) => {
      items[0].tags.push('@area-typo');
    },
    (items) => {
      items[0].tags.push('@accessibility');
    },
    (items) => {
      items[0].tags.push(items[0].tags[0]);
    },
    (items) => {
      items[0].tags = items[0].tags.filter((tag) => !tag.startsWith('@area-'));
    },
  ]) {
    const items = registered();
    change(items);
    assert.throws(() => validateInventory(items));
  }
});

test('smoke cannot disappear, grow into the full suite or omit language coverage', () => {
  for (const change of [
    (items) => {
      items[0].tags = items[0].tags.filter((tag) => tag !== '@smoke');
    },
    (items) => {
      for (const item of items) if (!item.tags.includes('@smoke')) item.tags.push('@smoke');
    },
    (items) => {
      items[0].tags = items[0].tags.filter((tag) => tag !== '@i18n');
    },
  ]) {
    const items = registered();
    change(items);
    assert.throws(() => validateInventory(items), /Smoke/);
  }
});
