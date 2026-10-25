import { Field, Locale, LOCALES, Text } from './project.model';

export type DataMeaning =
  | 'firstName'
  | 'lastName'
  | 'fullName'
  | 'company'
  | 'street'
  | 'houseNumber'
  | 'address'
  | 'postalCode'
  | 'city'
  | 'country'
  | 'email'
  | 'url'
  | 'date'
  | 'number'
  | 'choice'
  | 'boolean'
  | 'generic'
  | 'pattern';
export type MeaningSource =
  'label' | 'placeholder' | 'help' | 'type' | 'fallback' | 'pattern' | 'ambiguous';
export interface DataMeaningMatch {
  meaning: DataMeaning;
  source: MeaningSource;
}
export type PreviewDataRecord = Record<Exclude<DataMeaning, 'pattern'>, string>;
export const DEFAULT_REFERENCE_DATE = '2026-01-01';

interface Profile {
  people: readonly (readonly [string, string, string])[];
  company: string;
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  country: string;
  generic: string;
}

/** Independently authored fictional fixtures, not a representative population catalogue. */
const PROFILES: Record<Locale, Profile> = {
  de: {
    people: [
      ['Mira', 'Beispiel', 'mira.beispiel'],
      ['Jonas', 'Muster', 'jonas.muster'],
      ['Lea', 'Beispiel', 'lea.beispiel'],
    ],
    company: 'Beispielwerk Demo',
    street: 'Beispielweg',
    houseNumber: '12',
    postalCode: '10115',
    city: 'Berlin',
    country: 'Deutschland',
    generic: 'Synthetischer Beispieltext',
  },
  en: {
    people: [
      ['Alex', 'Sample', 'alex.sample'],
      ['Robin', 'Example', 'robin.example'],
      ['Taylor', 'Sample', 'taylor.sample'],
    ],
    company: 'Sampleworks Demo',
    street: 'Sample Lane',
    houseNumber: '12',
    postalCode: 'BS1 1AA',
    city: 'Bristol',
    country: 'United Kingdom',
    generic: 'Synthetic sample text',
  },
  fa: {
    people: [
      ['مینا', 'نمونه', 'mina.nemune'],
      ['آرمان', 'نمونه', 'arman.nemune'],
      ['سارا', 'نمونه', 'sara.nemune'],
    ],
    company: 'شرکت نمونه آزمایشی',
    street: 'خیابان نمونه',
    houseNumber: '۱۲',
    postalCode: '1111111111',
    city: 'تهران',
    country: 'ایران',
    generic: 'متن نمونه آزمایشی',
  },
};

export function normalizeDataSeed(seed: number): number {
  return Math.abs(Math.trunc(Number.isFinite(seed) ? seed : 0)) % 1000000;
}

/** Calendar-only dates avoid local time zones, silent rollover and invalid native values. */
export function isReferenceDate(value: string): boolean {
  if (!/^[1-9]\d{3}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** Stable scopes do not depend on traversal order, preserved fields or generated events. */
export function createDataRecord(
  locale: Locale,
  seed: number,
  scope = 'root',
  referenceDate = DEFAULT_REFERENCE_DATE,
): PreviewDataRecord {
  let offset = 0;
  if (scope !== 'root') {
    for (const character of scope) offset = (Math.imul(offset, 31) + character.charCodeAt(0)) >>> 0;
  }
  const serial = (normalizeDataSeed(seed) + offset) % 1000000;
  const profile = PROFILES[locale];
  const [firstName, lastName, asciiName] = profile.people[serial % profile.people.length];
  const address =
    locale === 'en'
      ? `${profile.houseNumber} ${profile.street}`
      : `${profile.street} ${profile.houseNumber}`;
  return {
    company: profile.company,
    street: profile.street,
    houseNumber: profile.houseNumber,
    postalCode: profile.postalCode,
    city: profile.city,
    country: profile.country,
    generic: profile.generic,
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`,
    address,
    email: `${asciiName}.${serial + 1}@example.org`,
    url: `https://example.org/sample/${serial + 1}`,
    date: isReferenceDate(referenceDate) ? referenceDate : DEFAULT_REFERENCE_DATE,
    number: String((serial % 99) + 1),
    choice: '1',
    boolean: 'true',
  };
}

/** Exact, normalized phrases prevent substring guesses such as filename or company size. */
function normalizeHint(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[\u200c\u200d_-]/g, ' ')
    .trim()
    .replace(/[*:؟?]+$/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

const PHRASES: readonly (readonly [DataMeaning, RegExp])[] = [
  ['firstName', /^(first name|given name|vorname|نام کوچک|نام اول)$/],
  ['lastName', /^(last name|surname|family name|nachname|familienname|نام خانوادگی)$/],
  [
    'fullName',
    /^(name|full name|contact name|vollständiger name|vollstandiger name|kontaktname|نام|نام کامل|نام و نام خانوادگی)$/,
  ],
  [
    'company',
    /^(company|company name|organization|organisation|organization name|organisation name|firma|firmenname|unternehmen|نام شرکت|شرکت|سازمان)$/,
  ],
  ['street', /^(street|street name|straße|strasse|straßenname|strassenname|خیابان|نام خیابان)$/],
  ['houseNumber', /^(house number|street number|hausnummer|شماره پلاک|پلاک)$/],
  ['address', /^(address|street address|anschrift|adresse|نشانی|آدرس)$/],
  ['postalCode', /^(postal code|postcode|zip code|zip|postleitzahl|plz|کد پستی)$/],
  ['city', /^(city|town|stadt|ort|شهر)$/],
  ['country', /^(country|land|کشور)$/],
  ['email', /^(email|e mail|email address|e mail address|e mail adresse|ایمیل|نشانی ایمیل)$/],
  ['url', /^(url|website|webseite|webadresse|وب سایت|نشانی وب)$/],
];

function phraseMeaning(copy: Text): DataMeaning | 'ambiguous' | null {
  const matches = new Set<DataMeaning>();
  for (const locale of LOCALES) {
    const normalized = normalizeHint(copy[locale]);
    for (const [meaning, phrase] of PHRASES) if (phrase.test(normalized)) matches.add(meaning);
  }
  // Conflicting translations do not establish a reliable meaning.
  return matches.size > 1 ? 'ambiguous' : matches.size === 1 ? [...matches][0] : null;
}

/** Native technical types win; labels precede weaker placeholder/help hints. */
export function resolveDataMeaning(field: Field): DataMeaningMatch {
  if (field.pattern && ['text', 'textarea', 'email', 'url'].includes(field.type))
    return { meaning: 'pattern', source: 'pattern' };
  const native: Partial<Record<Field['type'], DataMeaning>> = {
    email: 'email',
    url: 'url',
    date: 'date',
    number: 'number',
    select: 'choice',
    radio: 'choice',
    checkbox: 'boolean',
  };
  if (native[field.type]) return { meaning: native[field.type]!, source: 'type' };
  for (const source of ['label', 'placeholder', 'help'] as const) {
    const meaning = phraseMeaning(field[source]);
    if (meaning === 'ambiguous') return { meaning: 'generic', source: 'ambiguous' };
    if (meaning) return { meaning, source };
  }
  return { meaning: 'generic', source: 'fallback' };
}
