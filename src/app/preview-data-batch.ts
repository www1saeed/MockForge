import { allFields, Field, Locale, LOCALES, Project, supportsPattern } from './project.model';
import { validateProject } from './project.validation';
import { DEFAULT_REFERENCE_DATE, isReferenceDate, normalizeDataSeed } from './preview-data-record';
import { isBoundedPattern } from './preview-pattern';
import { preparePatternData } from './preview-pattern-data';
import type { PatternCheckService } from './pattern-check.service';
import {
  DataBoundary,
  DataDiagnostic,
  DataScenario,
  fillTestData,
  ResponseControl,
} from './preview-test-data';
import { responseLengthViolation } from './response-constraints';

export const BATCH_LIMITS = Object.freeze({
  records: 500,
  chunk: 25,
  milliseconds: 10000,
  projectUnits: 1000000,
  outputUnits: 2000000,
  controls: 4000,
  options: 10000,
});
export interface BatchRequest {
  count: number;
  locale: Locale;
  seed: number;
  referenceDate?: string;
  scenario?: DataScenario;
  boundary?: DataBoundary;
  rows?: 'minimum' | 'maximum';
  chunkSize?: number;
}
export type BatchValues = Record<string, string | boolean | Record<string, string | boolean>[]>;
export interface BatchRecord {
  index: number;
  seed: number;
  values: BatchValues;
  diagnostics: DataDiagnostic[];
}
export interface BatchProgress {
  completed: number;
  requested: number;
}
export interface BatchOptions {
  signal?: AbortSignal;
  checker?: Pick<PatternCheckService, 'check'>;
  onProgress?: (progress: BatchProgress) => void;
}
export interface BatchResult {
  status: 'complete' | 'cancelled' | 'budget';
  reason: 'time' | 'output' | null;
  records: BatchRecord[];
  statistics: {
    distinctRecords: number;
    duplicateRecords: number;
    responses: Record<string, { observed: number; distinct: number }>;
  };
}

/** Browser-only, session-only batch adapter. Detached native controls share preview validation. */
export async function generateTestDataBatch(
  project: Project,
  request: BatchRequest,
  options: BatchOptions = {},
): Promise<BatchResult> {
  // Capture before the first yield: callers may continue editing their live project/settings.
  const serialized = JSON.stringify(project);
  if (serialized.length > BATCH_LIMITS.projectUnits)
    throw new RangeError('Batch project is too large');
  const snapshot: Project = JSON.parse(serialized);
  const settings = {
    referenceDate: DEFAULT_REFERENCE_DATE,
    scenario: 'valid' as DataScenario,
    boundary: 'minimum' as DataBoundary,
    rows: 'minimum' as const,
    chunkSize: 10,
    ...request,
  };
  if (
    !validateProject(snapshot) ||
    !LOCALES.includes(settings.locale) ||
    !Number.isInteger(settings.count) ||
    settings.count < 1 ||
    settings.count > BATCH_LIMITS.records ||
    !Number.isInteger(settings.chunkSize) ||
    settings.chunkSize < 1 ||
    settings.chunkSize > BATCH_LIMITS.chunk ||
    !Number.isFinite(settings.seed) ||
    !isReferenceDate(settings.referenceDate) ||
    !['valid', 'empty', 'invalid', 'boundary'].includes(settings.scenario) ||
    !['minimum', 'maximum', 'belowMinimum', 'aboveMaximum', 'requiredEmpty'].includes(
      settings.boundary,
    ) ||
    !['minimum', 'maximum'].includes(settings.rows)
  )
    throw new RangeError('Invalid batch request');
  const rows = new Map(
    snapshot.fields
      .filter((field) => field.group)
      .map((field) => [
        field.id,
        settings.rows === 'maximum' ? field.group!.maxItems : field.group!.minItems,
      ]),
  );
  const form = batchForm(snapshot.fields, rows);
  const fields = allFields(snapshot.fields).filter((field) => field.type !== 'group');
  const records: BatchRecord[] = [];
  const distinct = new Set<string>();
  const responses = new Map<string, { observed: number; values: Set<string> }>();
  let units = 0;
  let reason: BatchResult['reason'] = null;
  const controller = new AbortController();
  const cancel = (): void => controller.abort();
  const deadline = performance.now() + BATCH_LIMITS.milliseconds;
  const timer = setTimeout(() => {
    reason = 'time';
    cancel();
  }, BATCH_LIMITS.milliseconds);
  options.signal?.addEventListener('abort', cancel, { once: true });
  if (options.signal?.aborted) cancel();
  const progress = (): void =>
    options.onProgress?.({ completed: records.length, requested: settings.count });
  try {
    progress();
    for (let index = 0; index < settings.count; index++) {
      // Yield every record, independently of reporting chunks, to let abort/UI events run.
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      if (performance.now() >= deadline) {
        reason = 'time';
        cancel();
      }
      if (controller.signal.aborted) break;
      form.reset();
      form
        .querySelectorAll<ResponseControl>('input,select,textarea')
        .forEach((control) => control.setCustomValidity(''));
      const seed = normalizeDataSeed(normalizeDataSeed(settings.seed) + index);
      const entries = options.checker
        ? await untilAborted(
            preparePatternData(
              snapshot.fields,
              rows,
              new Set(),
              { ...settings, seed },
              options.checker,
              controller.signal,
            ),
            controller.signal,
          )
        : undefined;
      if (controller.signal.aborted) break;
      const report = fillTestData(
        form,
        fields,
        settings.locale,
        seed,
        true,
        settings.scenario,
        new WeakSet(),
        settings.boundary,
        settings.referenceDate,
        entries ? { entries, apply: (): void => undefined } : undefined,
      );
      const record: BatchRecord = {
        index,
        seed,
        values: batchValues(form, snapshot.fields, rows, report.diagnostics),
        diagnostics: report.diagnostics,
      };
      const encoded = JSON.stringify(record);
      if (performance.now() >= deadline) {
        reason = 'time';
        break;
      }
      if (units + encoded.length > BATCH_LIMITS.outputUnits) {
        reason = 'output';
        break;
      }
      units += encoded.length;
      records.push(record);
      distinct.add(JSON.stringify(record.values));
      for (const diagnostic of report.diagnostics.filter((item) => item.outcome === 'filled')) {
        const control = form.elements.namedItem(diagnostic.response);
        const value = JSON.stringify(readResponse(control));
        const entry = responses.get(diagnostic.response) ?? {
          observed: 0,
          values: new Set<string>(),
        };
        entry.observed++;
        entry.values.add(value);
        responses.set(diagnostic.response, entry);
      }
      if (records.length % settings.chunkSize === 0) progress();
    }
    if (records.length % settings.chunkSize !== 0) progress();
    return {
      status: reason ? 'budget' : controller.signal.aborted ? 'cancelled' : 'complete',
      reason,
      records,
      statistics: {
        distinctRecords: distinct.size,
        duplicateRecords: records.length - distinct.size,
        responses: Object.fromEntries(
          [...responses].map(([key, entry]) => [
            key,
            { observed: entry.observed, distinct: entry.values.size },
          ]),
        ),
      },
    };
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', cancel);
  }
}

/** A caller-supplied checker cannot keep the batch promise pending after cancellation. */
function untilAborted<T>(pending: Promise<T>, signal: AbortSignal): Promise<T | undefined> {
  return new Promise((resolve, reject): void => {
    const abort = (): void => {
      signal.removeEventListener('abort', abort);
      resolve(undefined);
    };
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort();
    pending.then(
      (value): void => {
        signal.removeEventListener('abort', abort);
        resolve(value);
      },
      (error: unknown): void => {
        signal.removeEventListener('abort', abort);
        reject(error);
      },
    );
  });
}

function batchForm(fields: readonly Field[], rows: ReadonlyMap<string, number>): HTMLFormElement {
  let controls = 0;
  let options = 0;
  for (const root of fields)
    for (const field of root.group?.fields ?? [root]) {
      const count = root.group ? rows.get(root.id)! : 1;
      controls += count * (field.type === 'radio' ? field.options.length : 1);
      options += count * field.options.length;
    }
  if (controls > BATCH_LIMITS.controls || options > BATCH_LIMITS.options)
    throw new RangeError('Batch form exceeds control/choice budget');
  const form = document.createElement('form');
  for (const root of fields)
    for (let row = 0; row < (root.group ? rows.get(root.id)! : 1); row++) {
      for (const field of root.group?.fields ?? [root]) {
        const name = root.group
          ? `preview-${root.id}:${row + 1}:${field.id}`
          : `preview-${field.id}`;
        const count = field.type === 'radio' ? field.options.length : 1;
        for (let choice = 0; choice < count; choice++) {
          const control = document.createElement(
            field.type === 'textarea' ? 'textarea' : field.type === 'select' ? 'select' : 'input',
          );
          control.name = name;
          control.dataset['fieldId'] = field.id;
          control.required = field.required;
          if (control instanceof HTMLInputElement) {
            control.type = field.type;
            control.value = String(choice);
          }
          if (control instanceof HTMLSelectElement)
            for (let i = -1; i < field.options.length; i++) {
              const option = document.createElement('option');
              option.value = i < 0 ? '' : String(i);
              control.append(option);
            }
          control.addEventListener('input', () => {
            const length = responseLengthViolation(field, control.value);
            if (length) control.setCustomValidity(length);
            else if (supportsPattern(field) && isBoundedPattern(field.pattern))
              control.setCustomValidity(
                control.value && !new RegExp(`^(?:${field.pattern})$`, 'v').test(control.value)
                  ? 'Pattern mismatch'
                  : '',
              );
          });
          form.append(control);
        }
      }
    }
  return form;
}

function readResponse(control: Element | RadioNodeList | null): string | boolean {
  return control instanceof HTMLInputElement && control.type === 'checkbox'
    ? control.checked
    : ((control as ResponseControl | RadioNodeList | null)?.value ?? '');
}

function batchValues(
  form: HTMLFormElement,
  fields: readonly Field[],
  rows: ReadonlyMap<string, number>,
  diagnostics: readonly DataDiagnostic[],
): BatchValues {
  const applied = new Set(
    diagnostics.filter((item) => item.outcome === 'filled').map((item) => item.response),
  );
  const values: BatchValues = {};
  for (const root of fields) {
    if (root.group)
      values[root.id] = Array.from({ length: rows.get(root.id)! }, (_, index) =>
        Object.fromEntries(
          root.group!.fields.flatMap((field) => {
            const name = `preview-${root.id}:${index + 1}:${field.id}`;
            return applied.has(name)
              ? [[field.id, readResponse(form.elements.namedItem(name))]]
              : [];
          }),
        ),
      );
    else if (applied.has(`preview-${root.id}`))
      values[root.id] = readResponse(form.elements.namedItem(`preview-${root.id}`));
  }
  return values;
}
