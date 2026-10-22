import starter from '../assets/guides/studio-starter.form.json';
import groups from '../assets/guides/studio-groups.form.json';
import rules from '../assets/guides/studio-authoring-rules.json';
import { BUTTON_ACTIONS, BUTTON_VARIANTS, FIELD_TYPES, THEMES } from './project.model';
import { CopyKey } from './translations';

/** The displayed/downloadable examples and authoring kit share the same asset sources. */
export const AUTHORING_EXAMPLES = [
  { id: 'starter', title: 'starterExample', file: 'studio-starter.form.json', value: starter },
  { id: 'groups', title: 'groupsExample', file: 'studio-groups.form.json', value: groups },
] as const;
export const AUTHORING_RULES = rules.rules
  .map((rule, index): string => `${index + 1}. ${rule}`)
  .join('\n');
export const AUTHORING_KIT = 'assets/guides/studio-ai-authoring-kit.txt';

export const AUTHORING_PROMPTS = [
  { id: 'create', title: 'createPrompt', brief: 'createPromptText' },
  { id: 'change', title: 'changePrompt', brief: 'changePromptText' },
  { id: 'repair', title: 'repairPrompt', brief: 'repairPromptText' },
] as const satisfies readonly { id: string; title: CopyKey; brief: CopyKey }[];

export interface ReferenceSection {
  title: CopyKey;
  rows: readonly { names: string; type: string; description: CopyKey }[];
}

/** Property names and enum values remain English because they are the import contract. */
export const AUTHORING_REFERENCE: readonly ReferenceSection[] = [
  {
    title: 'rootContract',
    rows: [
      { names: 'schemaVersion', type: '"1.3.0"', description: 'versionRule' },
      {
        names: 'name, owner, audience, goal, scope, decisions, questions',
        type: 'string',
        description: 'briefRule',
      },
      {
        names: 'title, description, submit',
        type: 'Text = { de: string, en: string, fa: string }',
        description: 'textRule',
      },
      { names: 'languages', type: '("de" | "en" | "fa")[]', description: 'languageRule' },
      { names: 'theme, columns', type: `${THEMES.join(' / ')}; 1 | 2`, description: 'layoutRule' },
      { names: 'fields, buttons', type: 'Field[], FormButton[]', description: 'arrayRule' },
      {
        names: 'review',
        type: '{ checks: boolean[5], reviewer: string, approvedAt: string | null }',
        description: 'reviewRule',
      },
    ],
  },
  {
    title: 'fieldContract',
    rows: [
      { names: 'id', type: '^[a-z][a-z0-9_-]{0,63}$', description: 'idRule' },
      { names: 'type', type: FIELD_TYPES.join(' / '), description: 'typeRule' },
      {
        names: 'label, placeholder, help, tooltip, patternMessage',
        type: 'Text',
        description: 'textRule',
      },
      { names: 'required, note', type: 'boolean, string', description: 'fieldNoteRule' },
      { names: 'options', type: 'Text[]', description: 'optionsRule' },
      { names: 'minLength, maxLength', type: 'integer 0..10000', description: 'lengthRule' },
      { names: 'pattern', type: 'string (0..500 characters)', description: 'patternRule' },
      { names: 'tooltipPlacement?', type: 'title / icon / info', description: 'tooltipRule' },
      { names: 'group?', type: 'RepeatGroup', description: 'groupRule' },
    ],
  },
  {
    title: 'groupContract',
    rows: [
      { names: 'layout, gapless?', type: 'cards / table, boolean', description: 'groupLayoutRule' },
      {
        names: 'minItems, maxItems',
        type: 'integer 0..20, integer 1..20',
        description: 'groupBoundsRule',
      },
      { names: 'fields', type: 'Field[1..20] (leaf types only)', description: 'groupChildrenRule' },
    ],
  },
  {
    title: 'buttonContract',
    rows: [
      { names: 'id, label', type: 'safe ID, Text', description: 'buttonIdRule' },
      { names: 'variant', type: BUTTON_VARIANTS.join(' / '), description: 'buttonVariantRule' },
      { names: 'action', type: BUTTON_ACTIONS.join(' / '), description: 'buttonActionRule' },
      { names: 'cssClass, note', type: 'string, string', description: 'buttonNoteRule' },
    ],
  },
];
