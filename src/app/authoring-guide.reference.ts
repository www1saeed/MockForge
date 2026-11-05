import { APPLICATION_EXAMPLES } from './application-examples';
import rules from '../assets/guides/studio-authoring-rules.json';
import { BUTTON_ACTIONS, BUTTON_VARIANTS, FIELD_TYPES, THEMES } from './project.model';
import { CopyKey } from './translations';

/** The displayed/downloadable examples and authoring kit share the same asset sources. */
export const AUTHORING_EXAMPLES = APPLICATION_EXAMPLES;
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
      {
        names: 'format, schemaVersion',
        type: '"mockforge-studio", "2.2.0"',
        description: 'versionRule',
      },
      {
        names: 'name, owner, audience, goal, scope, decisions, questions',
        type: 'string',
        description: 'briefRule',
      },
      { names: 'languages', type: '("de" | "en" | "fa")[]', description: 'languageRule' },
      { names: 'theme', type: THEMES.join(' / '), description: 'layoutRule' },
      { names: 'forms', type: 'ApplicationForm[1..20]', description: 'applicationFormsRule' },
      {
        names: 'review',
        type: '{ checks: boolean[5], reviewer: string, approvedAt: string | null }',
        description: 'reviewRule',
      },
    ],
  },
  {
    title: 'formContract',
    rows: [
      { names: 'id, menu?', type: 'safe unique form ID, boolean', description: 'formIdRule' },
      {
        names: 'title, description, submit',
        type: 'Text = { de: string, en: string, fa: string }',
        description: 'textRule',
      },
      { names: 'columns', type: '1 | 2', description: 'layoutRule' },
      { names: 'fields, buttons', type: 'Field[], FormButton[]', description: 'arrayRule' },
      {
        names: 'lists?, entries?',
        type: 'CollectionList[], CollectionEntries',
        description: 'listContractRule',
      },
    ],
  },
  {
    title: 'listContract',
    rows: [
      {
        names: 'appearance?, columnSettings?, actionSettings?, actionOrder?',
        type: 'bounded table/column/button presentation',
        description: 'listAppearanceHint',
      },
      {
        names: 'id, title',
        type: 'safe form-local list ID, Text',
        description: 'listContractRule',
      },
      {
        names: 'columns, searchFields, filters',
        type: 'root leaf ID[]; at most 20 each',
        description: 'listContractRule',
      },
      {
        names: 'presets',
        type: '{ fieldId, value: string | boolean }[]',
        description: 'listContractRule',
      },
      {
        names: 'pageSize, selectable, sort?',
        type: '1..100, boolean, { fieldId, direction: asc / desc }',
        description: 'listContractRule',
      },
      {
        names: 'actions',
        type: '{ create, view, edit, delete: boolean }',
        description: 'listActionsRule',
      },
      {
        names: 'entries?',
        type: '{ count: 1..500, seed: 0..999999 }',
        description: 'listEntriesRule',
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
