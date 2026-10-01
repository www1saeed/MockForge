/** Framework independent contract for a single form and its review baseline. */
export type Locale = 'de' | 'en' | 'fa';
export const LOCALES: readonly Locale[] = ['de', 'en', 'fa'];
export type Theme = 'bootstrap' | 'material' | 'carbon' | 'fluent';
export type FieldType =
  | 'text'
  | 'email'
  | 'number'
  | 'url'
  | 'date'
  | 'textarea'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'group';
export type LeafFieldType = Exclude<FieldType, 'group'>;
export interface RepeatGroup {
  layout: 'cards' | 'table';
  /** Optional for backward-compatible 1.2 imports; omitted means the original spaced layout. */
  gapless?: boolean;
  minItems: number;
  maxItems: number;
  /** One repeatable level only; child fields cannot themselves contain groups. */
  fields: Field[];
}
export interface Text {
  /** All translations remain stored even when a language is inactive. */
  de: string;
  en: string;
  fa: string;
}
export interface Field {
  /** Stable, validated identifiers also connect preview labels and native controls. */
  id: string;
  type: FieldType;
  label: Text;
  placeholder: Text;
  help: Text;
  required: boolean;
  options: Text[];
  note: string;
  minLength: number;
  maxLength: number;
  tooltip: Text;
  /** Missing placement preserves the question-mark trigger for existing Studio files. */
  tooltipPlacement?: 'title' | 'icon' | 'info';
  pattern: string;
  /** Optional localized error; the preview supplies a translated fallback when empty. */
  patternMessage: Text;
  group?: RepeatGroup;
}
export const BUTTON_VARIANTS = ['primary', 'secondary', 'ghost', 'danger'] as const;
export const BUTTON_ACTIONS = [
  'submit',
  'validate',
  'save',
  'reset',
  'cancel',
  'delete',
  'next',
  'back',
  'none',
] as const;
export type ButtonVariant = (typeof BUTTON_VARIANTS)[number];
export type ButtonAction = (typeof BUTTON_ACTIONS)[number];
export interface FormButton {
  /** Actions describe local simulations, never production API implementations. */
  id: string;
  label: Text;
  variant: ButtonVariant;
  action: ButtonAction;
  cssClass: string;
  note: string;
}
export interface Project {
  schemaVersion: '1.3.0';
  name: string;
  owner: string;
  audience: string;
  goal: string;
  scope: string;
  title: Text;
  description: Text;
  submit: Text;
  theme: Theme;
  columns: 1 | 2;
  languages: Locale[];
  buttons: FormButton[];
  fields: Field[];
  decisions: string;
  questions: string;
  review: { checks: boolean[]; reviewer: string; approvedAt: string | null };
}
export const FIELD_TYPES: readonly FieldType[] = [
  'text',
  'email',
  'number',
  'url',
  'date',
  'textarea',
  'select',
  'radio',
  'checkbox',
  'group',
];
export const LEAF_FIELD_TYPES = FIELD_TYPES.filter(
  (type): type is LeafFieldType => type !== 'group',
);

/** Flatten specification definitions, never temporary preview row instances. */
export function allFields(fields: readonly Field[]): Field[] {
  return fields.flatMap((field): Field[] => [field, ...(field.group?.fields ?? [])]);
}
export const THEMES: readonly Theme[] = ['bootstrap', 'material', 'carbon', 'fluent'];
export const STORAGE_KEY = 'mockforge-studio-v1';
export const text = (de: string, en: string, fa = ''): Text => ({ de, en, fa });

/** A fresh field keeps every editable property explicit in the export. */
export function createField(type: FieldType, id: string): Field {
  return {
    id,
    type,
    label: type === 'group' ? text('Neue Gruppe', 'New group') : text('Neues Feld', 'New field'),
    placeholder: text('', ''),
    help: text('', ''),
    required: type === 'group',
    options:
      type === 'select' || type === 'radio'
        ? [text('Option 1', 'Option 1'), text('Option 2', 'Option 2')]
        : [],
    note: '',
    minLength: 0,
    maxLength: 0,
    tooltip: text('', ''),
    pattern: '',
    patternMessage: text('', ''),
    ...(type === 'group'
      ? {
          group: {
            layout: 'cards' as const,
            minItems: 1,
            maxItems: 10,
            fields: [createField('text', `${id}-item`)],
          },
        }
      : {}),
  };
}

/** Native HTML patterns use Unicode sets and match the entire value. */
export function validPattern(pattern: string): boolean {
  if (pattern.length > 500) return false;
  try {
    new RegExp(`^(?:${pattern})$`, 'v');
    return true;
  } catch {
    return false;
  }
}

/** Types that support whole-value RegEx rules in Studio's native preview. */
export function supportsPattern(field: Field): boolean {
  return ['text', 'email', 'url', 'textarea'].includes(field.type);
}

/** A new button carries only presentation and local simulation behavior. */
export function createButton(id: string, label: Text = text('Senden', 'Submit')): FormButton {
  return { id, label, variant: 'primary', action: 'submit', cssClass: '', note: '' };
}
