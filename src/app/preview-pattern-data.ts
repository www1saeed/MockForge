import { Field, Locale, supportsPattern } from './project.model';
import { createDataRecord } from './preview-data-record';
import { isBoundedPattern } from './preview-pattern';
import { PatternCheckService } from './pattern-check.service';
import {
  DataBoundary,
  DataScenario,
  patternDataKey,
  PreparedPattern,
  scenarioCandidate,
  testDataCandidate,
} from './preview-test-data';

export interface PatternFillRequest {
  locale: Locale;
  seed: number;
  referenceDate: string;
  scenario: DataScenario;
  boundary: DataBoundary;
}

/** Stage only known fixture candidates, without touching DOM responses. No arbitrary synthesis. */
export async function preparePatternData(
  fields: readonly Field[],
  rows: ReadonlyMap<string, number>,
  skipped: ReadonlySet<string>,
  request: PatternFillRequest,
  checker: Pick<PatternCheckService, 'check'>,
  signal: AbortSignal,
): Promise<Map<string, PreparedPattern>> {
  const result = new Map<string, PreparedPattern>();
  let checked = 0;
  const started = performance.now();
  for (const root of fields) {
    const definitions = root.group?.fields ?? [root];
    const count = root.group ? (rows.get(root.id) ?? 0) : 1;
    for (const field of definitions) {
      if (!supportsPattern(field) || !field.pattern || isBoundedPattern(field.pattern)) continue;
      for (let index = 0; index < count; index++) {
        if (signal.aborted) return result;
        const scope = root.group ? `preview-${root.id}:${index + 1}` : 'root';
        const key = patternDataKey(field.id, scope);
        if (skipped.has(key)) continue;
        const record = createDataRecord(request.locale, request.seed, scope, request.referenceDate);
        const fallback = testDataCandidate(
          { ...field, pattern: '' },
          request.locale,
          request.seed,
          record,
        )!;
        const candidate = scenarioCandidate(
          field,
          request.locale,
          request.seed,
          request.scenario,
          request.boundary,
          record,
          fallback,
        );
        if (!candidate) {
          result.set(key, { candidate, result: { status: 'checked', matches: false } });
          continue;
        }
        const verdict = !candidate.value
          ? { status: 'checked' as const, matches: true }
          : checked++ >= 16 || performance.now() - started >= 2500
            ? { status: 'budget' as const }
            : await checkWithinBudget(
                checker,
                field.pattern,
                candidate.value,
                signal,
                2500 - (performance.now() - started),
              );
        result.set(key, { candidate, result: verdict });
      }
    }
  }
  return result;
}

async function checkWithinBudget(
  checker: Pick<PatternCheckService, 'check'>,
  pattern: string,
  value: string,
  signal: AbortSignal,
  remaining: number,
): Promise<import('./pattern-check.service').PatternResult> {
  const controller = new AbortController();
  const cancel = (): void => controller.abort();
  signal.addEventListener('abort', cancel, { once: true });
  if (signal.aborted) controller.abort();
  const timer = setTimeout(cancel, Math.max(0, remaining));
  try {
    const result = await checker.check(pattern, value, controller.signal);
    return result.status === 'cancelled' && !signal.aborted ? { status: 'budget' } : result;
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', cancel);
  }
}
