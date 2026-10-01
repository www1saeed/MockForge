import { ButtonAction, ButtonVariant, FieldType, Theme } from './project.model';
import { CopyKey } from './translations';

/** Shell navigation is independent of the form specification and its review record. */
export type StudioView = 'overview' | 'workspace' | 'examples' | 'guide';

/** Named workflow positions keep visibility defaults understandable at their call sites. */
export const WORKFLOW = { brief: 0, copy: 1, design: 2, fields: 3, review: 4 } as const;
/** Outline marks are project-authored; accessible names and Bootstrap tooltips carry details. */
export const FIELD_ICONS: Record<FieldType, string> = {
  text: 'M4 5h16 M12 5v14 M8 19h8',
  email: 'M3 5h18v14H3z M3 5l9 7 9-7',
  number: 'M9 3L7 21 M17 3l-2 18 M3 9h18 M3 15h18',
  url: 'M10 13l4-4 M8 16l-2 2a3 3 0 0 1-4-4l5-5a3 3 0 0 1 4 0 M16 8l2-2a3 3 0 0 1 4 4l-5 5a3 3 0 0 1-4 0',
  date: 'M4 5h16v16H4z M8 3v4 M16 3v4 M4 10h16 M8 14h2 M14 14h2',
  textarea: 'M3 4h18v16H3z M6 8h12 M6 12h12 M6 16h7',
  select: 'M3 4h18v16H3z M7 9h5 M15 10l2 2 2-2',
  radio: 'M5 5h2v2H5z M11 6h9 M5 11h2v2H5z M11 12h9 M5 17h2v2H5z M11 18h9',
  checkbox: 'M4 4h16v16H4z M7 12l3 3 7-7',
  group: 'M3 3h8v8H3z M15 3h6v6h-6z M3 15h6v6H3z M13 13h8v8h-8z',
};
export const STEP_COPY: readonly CopyKey[] = ['step1', 'step2', 'step3', 'step4', 'step5'];
export const CHECK_COPY: readonly CopyKey[] = ['check1', 'check2', 'check3', 'check4', 'check5'];

/** Project-authored outline icons need no external icon font, package or network request. */
export const NAVIGATION = [
  { view: 'overview', path: 'M3 11l9-8 9 8 M5 10v11h5v-7h4v7h5V10' },
  { view: 'workspace', path: 'M3 4h18v16H3z M3 9h18 M9 9v11 M12 13h6 M12 17h4' },
  { view: 'examples', path: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z' },
  { view: 'guide', path: 'M5 3h14v18H5z M8 7h8 M8 11h8 M8 15h5' },
] as const satisfies readonly { view: StudioView; path: string }[];

export const THEMES_COPY: readonly { id: Theme; name: string; description: CopyKey }[] = [
  { id: 'bootstrap', name: 'Bootstrap', description: 'bootstrapDesc' },
  { id: 'material', name: 'Material', description: 'materialDesc' },
  { id: 'carbon', name: 'Carbon', description: 'carbonDesc' },
  { id: 'fluent', name: 'Fluent', description: 'fluentDesc' },
];

export const SAMPLES = [
  { id: 'saas', title: 'saasTitle', body: 'saasText', tag: 'B2B SOFTWARE', number: '01' },
  { id: 'commerce', title: 'commerceTitle', body: 'commerceText', tag: 'E-COMMERCE', number: '02' },
  {
    id: 'agency',
    title: 'agencyTitle',
    body: 'agencyText',
    tag: 'PROFESSIONAL SERVICES',
    number: '03',
  },
  {
    id: 'complex',
    title: 'complexTitle',
    body: 'complexText',
    tag: 'COMPLEX WORKFLOW',
    number: '04',
  },
] as const;

/** Explicit maps let TypeScript verify every supported button label at compile time. */
export const VARIANT_COPY: Record<ButtonVariant, CopyKey> = {
  primary: 'variant_primary',
  secondary: 'variant_secondary',
  ghost: 'variant_ghost',
  danger: 'variant_danger',
};
export const ACTION_COPY: Record<ButtonAction, CopyKey> = {
  submit: 'action_submit',
  validate: 'action_validate',
  save: 'action_save',
  reset: 'action_reset',
  cancel: 'action_cancel',
  delete: 'action_delete',
  next: 'action_next',
  back: 'action_back',
  none: 'action_none',
};
