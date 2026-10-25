import { Field, Locale } from './project.model';
import { responseLengthViolation } from './response-constraints';
import { boundedPatternCandidate } from './preview-pattern';
import type { PatternResult } from './pattern-check.service';
import {
  createDataRecord,
  DataMeaningMatch,
  DEFAULT_REFERENCE_DATE,
  normalizeDataSeed,
  PreviewDataRecord,
  resolveDataMeaning,
} from './preview-data-record';

export type DataScenario = 'valid' | 'empty' | 'invalid' | 'boundary';
export type DataBoundary =
  'minimum' | 'maximum' | 'belowMinimum' | 'aboveMaximum' | 'requiredEmpty';
export type DataRule = 'none' | 'required' | 'type' | 'minimum' | 'maximum' | 'pattern' | 'group';
export type DataReason =
  | 'applied'
  | 'preserved'
  | 'unsupported'
  | 'unavailable'
  | 'mismatch'
  | 'protected'
  | 'timeout'
  | 'budget'
  | 'workerUnavailable'
  | 'workerError'
  | 'representation';
export interface DataDiagnostic {
  fieldId: string;
  response: string;
  instance: number;
  outcome: 'filled' | 'preserved' | 'skipped';
  reason: DataReason;
  rule: DataRule;
  expectedValid: boolean | null;
  actualValid: boolean | null;
  semantic?: DataMeaningMatch;
  adjusted?: boolean;
}
export type ResponseControl = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

/** No arbitrary-pattern evaluation: the caller reports unsupported constraints explicitly. */
export function testDataCandidate(
  field: Field,
  locale: Locale,
  ordinal: number,
  record = createDataRecord(locale, ordinal),
): string | null {
  const meaning = resolveDataMeaning(field).meaning;
  if (meaning === 'pattern') {
    return boundedPatternCandidate(field.pattern, ordinal, field.minLength);
  }
  let value = record[meaning];
  // Technical types retain their representation; incompatible lengths are reported by validation.
  if (!['text', 'textarea'].includes(field.type)) return value;
  if (field.maxLength) value = value.slice(0, field.maxLength);
  if (value.length < field.minLength) value = value.padEnd(field.minLength, 'x');
  return value;
}

export interface FillReport {
  filled: number;
  preserved: number;
  skipped: number;
  diagnostics: DataDiagnostic[];
}

export interface Candidate {
  value: string;
  rule: DataRule;
  expected: boolean | null;
}
export interface PreparedPattern {
  candidate: Candidate | null;
  result: PatternResult;
}
export interface PatternData {
  entries: ReadonlyMap<string, PreparedPattern>;
  apply: (control: ResponseControl, field: Field, result: PatternResult) => void;
}
export function patternDataKey(id: string, scope: string): string {
  return `${id}|${scope}`;
}

/** Bound construction before allocation, including imported 10,000-unit length limits. */
const MAX_GENERATED_LENGTH = 10001;

export function scenarioCandidate(
  field: Field,
  locale: Locale,
  ordinal: number,
  scenario: DataScenario,
  boundary: DataBoundary,
  record: PreviewDataRecord,
  fallback?: string,
): Candidate | null {
  if (scenario === 'empty') return { value: '', rule: 'required', expected: !field.required };
  if (scenario === 'invalid') {
    if (field.required) return { value: '', rule: 'required', expected: false };
    if (field.type === 'email' || field.type === 'url')
      return { value: 'invalid', rule: 'type', expected: false };
    if (field.minLength > 1) boundary = 'belowMinimum';
    else if (field.maxLength) boundary = 'aboveMaximum';
    else return null;
  }
  if (scenario === 'boundary' || scenario === 'invalid') {
    if (boundary === 'requiredEmpty')
      return field.required ? { value: '', rule: 'required', expected: false } : null;
    if (!['text', 'textarea', 'email', 'url'].includes(field.type)) return null;
    const minimum = boundary === 'minimum' || boundary === 'belowMinimum';
    const limit = minimum ? field.minLength : field.maxLength;
    if (!limit) return null;
    const length = limit + (boundary === 'belowMinimum' ? -1 : boundary === 'aboveMaximum' ? 1 : 0);
    // Empty optional values are valid despite minlength; they are not an underflow failure.
    if (!length && !field.required) return null;
    if (length > MAX_GENERATED_LENGTH) return null;
    const base =
      (field.pattern && (boundary === 'minimum' || boundary === 'maximum')
        ? boundedPatternCandidate(field.pattern, ordinal, length)
        : null) ??
      testDataCandidate(field, locale, ordinal, record) ??
      fallback ??
      null;
    if (base === null) return null;
    return {
      value: base.slice(0, length).padEnd(length, 'x'),
      rule: minimum ? 'minimum' : 'maximum',
      expected: boundary === 'minimum' || boundary === 'maximum',
    };
  }
  const value = testDataCandidate(field, locale, ordinal, record) ?? fallback ?? null;
  return value === null ? null : { value, rule: 'none', expected: true };
}

/** Fill mounted root/group responses only. Definitions, choices and saved review stay untouched. */
export function fillTestData(
  form: HTMLFormElement,
  fields: readonly Field[],
  locale: Locale,
  seed: number,
  replace: boolean,
  scenario: DataScenario,
  answered = new WeakSet<ResponseControl>(),
  boundary: DataBoundary = 'minimum',
  referenceDate = DEFAULT_REFERENCE_DATE,
  patternData?: PatternData,
): FillReport {
  const report: FillReport = { filled: 0, preserved: 0, skipped: 0, diagnostics: [] };
  let ordinal = normalizeDataSeed(seed);
  const records = new Map<string, PreviewDataRecord>();
  for (const field of fields) {
    const controls = Array.from(
      form.querySelectorAll<ResponseControl>(`[data-field-id="${field.id}"]`),
    );
    const groups = new Map<string, ResponseControl[]>();
    for (const control of controls)
      groups.set(control.name, [...(groups.get(control.name) ?? []), control]);
    let instance = 0;
    for (const group of groups.values()) {
      const control = group[0];
      // Physical row positions reproduce the same request after reset/reload; DOM ids stay private.
      const scope = control.name.includes(':')
        ? `${control.name.split(':')[0]}:${instance + 1}`
        : 'root';
      if (!records.has(scope))
        records.set(scope, createDataRecord(locale, seed, scope, referenceDate));
      const record = records.get(scope)!;
      const prepared = patternData?.entries.get(patternDataKey(field.id, scope));
      const diagnostic: DataDiagnostic = {
        fieldId: field.id,
        response: control.name,
        instance: ++instance,
        outcome: 'skipped',
        reason: 'unavailable',
        rule: 'none',
        expectedValid: null,
        actualValid: null,
        semantic: resolveDataMeaning(field),
      };
      report.diagnostics.push(diagnostic);
      const checks = field.type === 'radio' || field.type === 'checkbox';
      const occupied = checks
        ? group.some((item): boolean => (item as HTMLInputElement).checked || answered.has(item))
        : !!control.value;
      if (!replace && occupied) {
        report.preserved++;
        diagnostic.outcome = 'preserved';
        diagnostic.reason = 'preserved';
        continue;
      }
      // Avoid evaluating imported arbitrary patterns, even through native checkValidity.
      if (
        field.pattern &&
        testDataCandidate(field, locale, ordinal, record) === null &&
        scenario !== 'empty' &&
        !(
          field.required &&
          (scenario === 'invalid' || (scenario === 'boundary' && boundary === 'requiredEmpty'))
        )
      ) {
        if (prepared?.result.status === 'checked' && prepared.candidate) {
          // Candidate verdict is installed before renderer events; deferred patterns have no native attribute.
        } else {
          report.skipped++;
          const status = prepared?.result.status;
          diagnostic.reason =
            prepared?.candidate === null
              ? 'unavailable'
              : status === 'timeout' || status === 'budget'
                ? status
                : status === 'unavailable'
                  ? 'workerUnavailable'
                  : status === 'error'
                    ? 'workerError'
                    : 'unsupported';
          diagnostic.rule = 'pattern';
          continue;
        }
      }
      const candidate =
        prepared?.candidate ??
        scenarioCandidate(field, locale, ordinal, scenario, boundary, record);
      if (!candidate) {
        report.skipped++;
        continue;
      }
      diagnostic.rule = candidate.rule;
      diagnostic.expectedValid = candidate.expected;
      const semantic = diagnostic.semantic!.meaning;
      diagnostic.adjusted =
        semantic !== 'pattern' &&
        ['text', 'textarea', 'email', 'url'].includes(field.type) &&
        candidate.value !== record[semantic];
      const previous = group.map((item): { value: string; checked: boolean } => ({
        value: item.value,
        checked: (item as HTMLInputElement).checked,
      }));
      if (checks) {
        group.forEach((item, index): void => {
          (item as HTMLInputElement).checked =
            !!candidate.value && (field.type === 'checkbox' || index === ordinal % group.length);
        });
      } else {
        control.value = !candidate.value
          ? ''
          : field.type === 'select'
            ? String(ordinal % field.options.length)
            : candidate.value;
      }
      control.setCustomValidity('');
      if (prepared?.result.status === 'checked') {
        control.removeAttribute('pattern');
        control.setCustomValidity(
          prepared.result.matches ? '' : field.patternMessage[locale] || 'Pattern mismatch',
        );
        patternData?.apply(control, field, prepared.result);
      }
      // Renderer input handlers apply the same explicit length rules as user edits.
      const notify = (): void =>
        group.forEach((item): void => {
          item.dispatchEvent(new Event('input', { bubbles: true }));
          item.dispatchEvent(new Event('change', { bubbles: true }));
        });
      notify();
      const lengthViolation = responseLengthViolation(field, control.value);
      const actual = !lengthViolation && group.every((item): boolean => item.checkValidity());
      diagnostic.actualValid = actual;
      const targetObserved =
        candidate.expected !== false || candidate.rule === 'required'
          ? candidate.expected !== false ||
            group.some((item): boolean => item.validity.valueMissing)
          : candidate.rule === 'type'
            ? control.validity.typeMismatch
            : lengthViolation === candidate.rule || (!control.value && field.required);
      const represented = checks || field.type === 'select' || control.value === candidate.value;
      if (!represented || actual !== candidate.expected || !targetObserved) {
        group.forEach((item, index): void => {
          if (checks) (item as HTMLInputElement).checked = previous[index].checked;
          else item.value = previous[index].value;
        });
        notify();
        report.skipped++;
        diagnostic.reason = represented ? 'mismatch' : 'representation';
      } else {
        report.filled++;
        diagnostic.outcome = 'filled';
        diagnostic.reason = 'applied';
      }
      ordinal++;
    }
  }
  return report;
}
