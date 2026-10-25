import { Field, Locale } from './project.model';
import { responseLengthViolation } from './response-constraints';

export type DataScenario = 'valid' | 'empty' | 'invalid' | 'boundary';
export type DataBoundary =
  'minimum' | 'maximum' | 'belowMinimum' | 'aboveMaximum' | 'requiredEmpty';
export type DataRule = 'none' | 'required' | 'type' | 'minimum' | 'maximum' | 'pattern' | 'group';
export type DataReason =
  'applied' | 'preserved' | 'unsupported' | 'unavailable' | 'mismatch' | 'protected';
export interface DataDiagnostic {
  fieldId: string;
  response: string;
  instance: number;
  outcome: 'filled' | 'preserved' | 'skipped';
  reason: DataReason;
  rule: DataRule;
  expectedValid: boolean | null;
  actualValid: boolean | null;
}
export type ResponseControl = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

/** Small original synthetic catalogue. Profiles are independent of the Studio language. */
const PEOPLE: Record<Locale, readonly string[]> = {
  de: ['Mira Beispiel', 'Jonas Muster', 'Lea Beispiel'],
  en: ['Alex Sample', 'Robin Example', 'Taylor Sample'],
  fa: ['مینا نمونه', 'آرمان نمونه', 'سارا نمونه'],
};

/** Only a small, bounded character-class subset is synthesized; arbitrary RegEx is skipped. */
function patternCandidate(pattern: string, ordinal: number): string | null {
  const match = /^(?:\^)?\[([A-Za-z0-9-]+)\]\{(\d{1,3})(?:,(\d{1,3}))?\}(?:\$)?$/.exec(pattern);
  if (!match) return null;
  const count = Number(match[2]);
  if (count > 100 || (match[3] && Number(match[3]) < count)) return null;
  const alphabet = match[1]
    .replace(/A-Z/g, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ')
    .replace(/a-z/g, 'abcdefghijklmnopqrstuvwxyz')
    .replace(/0-9/g, '0123456789');
  if (alphabet.includes('-')) return null;
  return Array.from(
    { length: count },
    (_, index): string => alphabet[(ordinal + index) % alphabet.length],
  ).join('');
}

/** No arbitrary-pattern evaluation: the caller reports unsupported constraints explicitly. */
export function testDataCandidate(field: Field, locale: Locale, ordinal: number): string | null {
  if (field.pattern && ['text', 'textarea', 'email', 'url'].includes(field.type)) {
    return patternCandidate(field.pattern, ordinal);
  }
  if (field.type === 'email') return `sample${ordinal + 1}@example.org`;
  if (field.type === 'url') return `https://example.org/sample/${ordinal + 1}`;
  if (field.type === 'date') return `2026-01-${String((ordinal % 28) + 1).padStart(2, '0')}`;
  if (field.type === 'number') return String((ordinal % 99) + 1);
  const label = `${field.label.de} ${field.label.en} ${field.label.fa}`.toLowerCase();
  const name = PEOPLE[locale][ordinal % PEOPLE[locale].length];
  let value = /name|نام/.test(label)
    ? name
    : /stadt|city|شهر/.test(label)
      ? { de: 'Berlin', en: 'Bristol', fa: 'تهران' }[locale]
      : /straße|strasse|street|address|adresse|نشانی/.test(label)
        ? { de: 'Beispielweg 12', en: '12 Sample Lane', fa: 'خیابان نمونه ۱۲' }[locale]
        : {
            de: 'Synthetischer Beispieltext',
            en: 'Synthetic sample text',
            fa: 'متن نمونه آزمایشی',
          }[locale];
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

interface Candidate {
  value: string;
  rule: DataRule;
  expected: boolean | null;
}

/** Bound construction before allocation, including imported 10,000-unit length limits. */
const MAX_GENERATED_LENGTH = 10001;

function scenarioCandidate(
  field: Field,
  locale: Locale,
  ordinal: number,
  scenario: DataScenario,
  boundary: DataBoundary,
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
    const base = testDataCandidate(field, locale, ordinal);
    if (base === null) return null;
    return {
      value: base.slice(0, length).padEnd(length, 'x'),
      rule: minimum ? 'minimum' : 'maximum',
      expected: boundary === 'minimum' || boundary === 'maximum',
    };
  }
  const value = testDataCandidate(field, locale, ordinal);
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
): FillReport {
  const report: FillReport = { filled: 0, preserved: 0, skipped: 0, diagnostics: [] };
  let ordinal = Math.abs(Math.trunc(Number.isFinite(seed) ? seed : 0)) % 1000000;
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
      const diagnostic: DataDiagnostic = {
        fieldId: field.id,
        response: control.name,
        instance: ++instance,
        outcome: 'skipped',
        reason: 'unavailable',
        rule: 'none',
        expectedValid: null,
        actualValid: null,
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
        testDataCandidate(field, locale, ordinal) === null &&
        scenario !== 'empty' &&
        !(
          field.required &&
          (scenario === 'invalid' || (scenario === 'boundary' && boundary === 'requiredEmpty'))
        )
      ) {
        report.skipped++;
        diagnostic.reason = 'unsupported';
        diagnostic.rule = 'pattern';
        continue;
      }
      const candidate = scenarioCandidate(field, locale, ordinal, scenario, boundary);
      if (!candidate) {
        report.skipped++;
        continue;
      }
      diagnostic.rule = candidate.rule;
      diagnostic.expectedValid = candidate.expected;
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
      if (actual !== candidate.expected || !targetObserved) {
        group.forEach((item, index): void => {
          if (checks) (item as HTMLInputElement).checked = previous[index].checked;
          else item.value = previous[index].value;
        });
        notify();
        report.skipped++;
        diagnostic.reason = 'mismatch';
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
