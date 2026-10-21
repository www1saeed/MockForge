import { Field, Locale } from './project.model';

export type DataScenario = 'valid' | 'empty';
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
): FillReport {
  const report: FillReport = { filled: 0, preserved: 0, skipped: 0 };
  let ordinal = Math.abs(Math.trunc(Number.isFinite(seed) ? seed : 0)) % 1000000;
  for (const field of fields) {
    const controls = Array.from(
      form.querySelectorAll<ResponseControl>(`[data-field-id="${field.id}"]`),
    );
    const groups = new Map<string, ResponseControl[]>();
    for (const control of controls)
      groups.set(control.name, [...(groups.get(control.name) ?? []), control]);
    for (const group of groups.values()) {
      const control = group[0];
      const checks = field.type === 'radio' || field.type === 'checkbox';
      const occupied = checks
        ? group.some((item): boolean => (item as HTMLInputElement).checked || answered.has(item))
        : !!control.value;
      if (!replace && occupied) {
        report.preserved++;
        continue;
      }
      // Avoid evaluating imported arbitrary patterns, even through native checkValidity.
      if (
        field.pattern &&
        testDataCandidate(field, locale, ordinal) === null &&
        scenario !== 'empty'
      ) {
        report.skipped++;
        continue;
      }
      const previous = group.map((item): { value: string; checked: boolean } => ({
        value: item.value,
        checked: (item as HTMLInputElement).checked,
      }));
      if (checks) {
        group.forEach((item, index): void => {
          (item as HTMLInputElement).checked =
            scenario !== 'empty' && (field.type === 'checkbox' || index === ordinal % group.length);
        });
      } else {
        control.value =
          scenario === 'empty'
            ? ''
            : field.type === 'select'
              ? String(ordinal % field.options.length)
              : (testDataCandidate(field, locale, ordinal) ?? '');
      }
      control.setCustomValidity('');
      const lengthApplies = ['text', 'textarea', 'email', 'url'].includes(field.type);
      const validLength =
        !lengthApplies ||
        ((!field.minLength || control.value.length >= field.minLength) &&
          (!field.maxLength || control.value.length <= field.maxLength));
      const valid =
        scenario !== 'valid' ||
        (validLength && group.every((item): boolean => item.checkValidity()));
      if (!valid) {
        group.forEach((item, index): void => {
          if (checks) (item as HTMLInputElement).checked = previous[index].checked;
          else item.value = previous[index].value;
        });
        report.skipped++;
      } else report.filled++;
      // Recheck custom pattern validity through the existing renderer boundary.
      group.forEach((item): void => {
        item.dispatchEvent(new Event('input', { bubbles: true }));
        item.dispatchEvent(new Event('change', { bubbles: true }));
      });
      ordinal++;
    }
  }
  return report;
}
