import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const root = fileURLToPath(new URL('..', import.meta.url));
export const catalogue = JSON.parse(
  readFileSync(new URL('../e2e/test-catalogue.json', import.meta.url), 'utf8'),
);

/** Flatten Playwright's discovery report; no browsers or dev server are started. */
export function inventory(report) {
  if (report.errors?.length)
    throw new Error(report.errors.map((error) => error.message).join('\n'));
  const cases = [];
  function visit(suite) {
    for (const spec of suite.specs ?? [])
      cases.push({
        title: spec.title,
        file: spec.file.replaceAll('\\', '/'),
        tags: (spec.tags ?? []).map((tag) => (tag.startsWith('@') ? tag : `@${tag}`)),
      });
    for (const child of suite.suites ?? []) visit(child);
  }
  for (const suite of report.suites ?? []) visit(suite);
  return cases;
}

/** Fail closed for unregistered suites, missing IDs, invalid tags or accidentally widened smoke. */
export function validateInventory(
  cases,
  files = readdirSync(new URL('../e2e/', import.meta.url)).filter((file) =>
    file.endsWith('.spec.ts'),
  ),
) {
  const registered = Object.keys(catalogue.suites)
    .map((suite) => `${suite}.spec.ts`)
    .sort();
  if (JSON.stringify([...files].sort()) !== JSON.stringify(registered))
    throw new Error('Every E2E spec must be registered in e2e/test-catalogue.json.');
  const ids = new Set();
  const seen = new Set();
  const allowed = new Set([
    '@smoke',
    ...catalogue.areas.map((area) => `@area-${area}`),
    ...catalogue.checks.map((check) => `@${check}`),
  ]);
  for (const entry of cases) {
    const file = entry.file.split('/').at(-1);
    const suite = file?.replace(/\.spec\.ts$/, '');
    const tags = entry.tags ?? [];
    const caseIds = tags.filter((tag) => tag.startsWith('@case-'));
    if (
      !Object.hasOwn(catalogue.suites, suite) ||
      tags.filter((tag) => tag.startsWith('@suite-')).length !== 1 ||
      !tags.includes(`@suite-${suite}`)
    )
      throw new Error(`Invalid suite metadata: ${entry.title}`);
    if (caseIds.length !== 1 || !/^@case-[a-z][a-z0-9-]*$/.test(caseIds[0]) || ids.has(caseIds[0]))
      throw new Error(`Missing or duplicate case identity: ${entry.title}`);
    if (
      !tags.some((tag) => tag.startsWith('@area-')) ||
      new Set(tags).size !== tags.length ||
      tags.some((tag) => !allowed.has(tag) && tag !== caseIds[0] && tag !== `@suite-${suite}`)
    )
      throw new Error(`Unknown, duplicate or missing area/check tags: ${entry.title}`);
    ids.add(caseIds[0]);
    seen.add(file);
  }
  if (seen.size !== registered.length)
    throw new Error('Every registered suite must discover tests.');
  const smoke = cases.filter((entry) => entry.tags.includes('@smoke'));
  if (smoke.length < 3 || smoke.length > 8 || !smoke.some((entry) => entry.tags.includes('@i18n')))
    throw new Error('Smoke must contain 3–8 journeys, including an i18n journey.');
}

export function parseOptions(args) {
  const options = {
    areas: [],
    checks: [],
    smoke: false,
    plan: false,
    list: false,
    checkOnly: false,
  };
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === '--area' || arg === '--check') {
      const values = args[++index]?.split(',');
      const allowed = arg === '--area' ? catalogue.areas : catalogue.checks;
      if (!values?.length || values.some((value) => !allowed.includes(value)))
        throw new Error(`Invalid ${arg}; choose ${allowed.join(', ')}.`);
      options[arg === '--area' ? 'areas' : 'checks'].push(...values);
    } else if (arg === '--smoke') options.smoke = true;
    else if (arg === '--plan') options.plan = true;
    else if (arg === '--list') options.list = true;
    else if (arg === '--check-catalogue') options.checkOnly = true;
    else
      throw new Error(
        `Unsupported selection option ${arg}. Use e2e:full for raw Playwright options.`,
      );
  }
  if (options.smoke && (options.areas.length || options.checks.length))
    throw new Error('Choose smoke or area/check selection.');
  return options;
}

/** Areas form a union; checks form a union; together they intersect. Smoke is added afterwards. */
export function selectCases(cases, options) {
  if (options.smoke) return cases.filter((entry) => entry.tags.includes('@smoke'));
  const targeted = cases.filter(
    (entry) =>
      (!options.areas.length ||
        options.areas.some((area) => entry.tags.includes(`@area-${area}`))) &&
      (!options.checks.length || options.checks.some((check) => entry.tags.includes(`@${check}`))),
  );
  if (!targeted.length)
    throw new Error('Requested selection has no tests; smoke alone cannot satisfy it.');
  return cases.filter((entry) => targeted.includes(entry) || entry.tags.includes('@smoke'));
}

export function selectionGrep(cases) {
  const ids = cases.map((entry) => entry.tags.find((tag) => tag.startsWith('@case-')).slice(6));
  if (!ids.length) throw new Error('Empty E2E selection.');
  return `@case-(?:${ids.join('|')})(?:\\s|$)`;
}
