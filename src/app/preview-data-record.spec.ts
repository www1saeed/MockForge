import { createField, Field, Locale, text } from './project.model';
import {
  createDataRecord,
  DEFAULT_REFERENCE_DATE,
  isReferenceDate,
  normalizeDataSeed,
  resolveDataMeaning,
} from './preview-data-record';
import { testDataCandidate } from './preview-test-data';

function labeled(label: string): Field {
  return { ...createField('text', 'sample'), label: text(label, label, label) };
}

describe('Coherent preview records', (): void => {
  it.each(['de', 'en', 'fa'] as const)(
    'keeps identity and address components coherent in %s',
    (locale: Locale): void => {
      const record = createDataRecord(locale, 17);
      expect(testDataCandidate(labeled('First name'), locale, 0, record)).toBe(record.firstName);
      expect(testDataCandidate(labeled('Last name'), locale, 8, record)).toBe(record.lastName);
      expect(testDataCandidate(labeled('Full name'), locale, 99, record)).toBe(
        `${record.firstName} ${record.lastName}`,
      );
      expect(record.email).toMatch(/^[a-z]+\.[a-z]+\.18@example\.org$/);
      expect(record.address).toContain(record.street);
      expect(record.address).toContain(record.houseNumber);
      for (const [label, key] of [
        ['Company name', 'company'],
        ['Street', 'street'],
        ['House number', 'houseNumber'],
        ['Postal code', 'postalCode'],
        ['City', 'city'],
        ['Country', 'country'],
      ] as const)
        expect(testDataCandidate(labeled(label), locale, 0, record)).toBe(record[key]);
      if (locale === 'fa') {
        expect(record.fullName).toMatch(/[\u0600-\u06ff]/);
        expect(record.email).toMatch(/^[\x00-\x7f]+$/);
      }
    },
  );

  it('uses conservative DE/EN/FA phrases and reports weak or contradictory hints', (): void => {
    for (const label of ['Vorname', 'firstName', 'نام کوچک'])
      expect(resolveDataMeaning(labeled(label))).toEqual({ meaning: 'firstName', source: 'label' });
    for (const label of ['Nachname', 'family name', 'نام‌خانوادگی'])
      expect(resolveDataMeaning(labeled(label))).toEqual({ meaning: 'lastName', source: 'label' });
    for (const label of ['Company size', 'Filename', 'Project name', 'Username'])
      expect(resolveDataMeaning(labeled(label)).meaning).toBe('generic');
    const field = {
      ...labeled('Contact'),
      placeholder: text('', 'First name', ''),
      help: text('', 'Last name', ''),
    };
    expect(resolveDataMeaning(field)).toEqual({ meaning: 'firstName', source: 'placeholder' });
    field.placeholder = text('', '', '');
    expect(resolveDataMeaning(field)).toEqual({ meaning: 'lastName', source: 'help' });
    field.label = text('Vorname', 'Last name', '');
    expect(resolveDataMeaning(field)).toEqual({ meaning: 'generic', source: 'ambiguous' });
    expect(resolveDataMeaning({ ...field, type: 'email' })).toEqual({
      meaning: 'email',
      source: 'type',
    });
    expect(resolveDataMeaning({ ...field, pattern: '[A-Z]{3}' })).toEqual({
      meaning: 'pattern',
      source: 'pattern',
    });
    expect(resolveDataMeaning(labeled('كشور')).meaning).toBe('country');
    // Import validation allows extension properties; only the three contract locales are hints.
    field.label = Object.assign(text('Vorname', 'First name', ''), {
      extension: 42,
      other: 'Last name',
    });
    expect(resolveDataMeaning(field)).toEqual({ meaning: 'firstName', source: 'label' });
  });

  it('makes scope, seed and calendar date explicit without relying on local time or wall clocks', (): void => {
    expect(normalizeDataSeed(-1000003.9)).toBe(3);
    expect(normalizeDataSeed(Infinity)).toBe(0);
    expect(normalizeDataSeed(NaN)).toBe(0);
    const root = createDataRecord('en', 9, 'root', '2028-02-29');
    expect(root.date).toBe('2028-02-29');
    expect(createDataRecord('en', 9, 'root', '2028-02-29')).toEqual(root);
    expect(createDataRecord('en', 10).email).not.toBe(root.email);
    expect(createDataRecord('en', 9, 'preview-team:1').email).not.toBe(
      createDataRecord('en', 9, 'preview-team:2').email,
    );
    for (const value of [
      '',
      '2026-02-29',
      '2026-04-31',
      '0000-01-01',
      '10000-01-01',
      '2026-01-01T00:00:00Z',
    ]) {
      expect(isReferenceDate(value)).toBe(false);
      expect(createDataRecord('de', 1, 'root', value).date).toBe(DEFAULT_REFERENCE_DATE);
    }
    expect(isReferenceDate('1000-01-01')).toBe(true);
    expect(isReferenceDate('9999-12-31')).toBe(true);
  });
});
