import {
  BUTTON_ACTIONS,
  BUTTON_VARIANTS,
  ButtonAction,
  ButtonVariant,
  createButton,
  FIELD_TYPES,
  FieldType,
  Project,
  Text,
  THEMES,
  Theme,
  text,
  validPattern,
  allFields,
  Field,
} from './project.model';

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function isText(value: unknown): value is Text {
  return record(value) && typeof value['de'] === 'string' && typeof value['en'] === 'string';
}

/**
 * Validate unknown JSON before granting it access to rendering and working state.
 * Structural validation deliberately allows incomplete briefs: drafts can be saved
 * before they satisfy review readiness. Safe unique identifiers protect DOM targets;
 * class tokens select existing styles and cannot inject arbitrary CSS declarations.
 */
export function validateProject(value: unknown): value is Project {
  if (!record(value) || value['schemaVersion'] !== '1.2.0') return false;
  if (
    !['name', 'owner', 'audience', 'goal', 'scope', 'decisions', 'questions'].every(
      (key: string): boolean => typeof value[key] === 'string',
    )
  )
    return false;
  if (![value['title'], value['description'], value['submit']].every(isText)) return false;
  if (!THEMES.includes(value['theme'] as Theme) || ![1, 2].includes(value['columns'] as number))
    return false;
  const languages = value['languages'];
  if (
    !Array.isArray(languages) ||
    languages.length < 1 ||
    languages.length > 2 ||
    new Set(languages).size !== languages.length ||
    !languages.every((lang: unknown): boolean => lang === 'de' || lang === 'en')
  )
    return false;
  const buttons = value['buttons'];
  if (!Array.isArray(buttons) || buttons.length > 20) return false;
  const buttonIds = new Set<string>();
  for (const button of buttons as unknown[]) {
    if (
      !record(button) ||
      typeof button['id'] !== 'string' ||
      !/^[a-z][a-z0-9_-]{0,63}$/.test(button['id']) ||
      buttonIds.has(button['id'])
    )
      return false;
    buttonIds.add(button['id']);
    if (
      !isText(button['label']) ||
      !BUTTON_VARIANTS.includes(button['variant'] as ButtonVariant) ||
      !BUTTON_ACTIONS.includes(button['action'] as ButtonAction) ||
      typeof button['note'] !== 'string' ||
      typeof button['cssClass'] !== 'string' ||
      !/^[a-zA-Z0-9_\s-]{0,200}$/.test(button['cssClass'])
    )
      return false;
  }
  const fields = value['fields'];
  if (!Array.isArray(fields) || fields.length > 100) return false;
  // Check bounded group structure before flattening; never recurse into untrusted JSON.
  for (const field of fields as unknown[]) {
    if (!record(field)) return false;
    if (field['type'] !== 'group') {
      if (field['group'] !== undefined) return false;
      continue;
    }
    const group = field['group'];
    if (
      !record(group) ||
      !['cards', 'table'].includes(group['layout'] as string) ||
      !Array.isArray(group['fields']) ||
      group['fields'].length < 1 ||
      group['fields'].length > 20
    )
      return false;
    const min = group['minItems'];
    if (group['gapless'] !== undefined && typeof group['gapless'] !== 'boolean') return false;
    const max = group['maxItems'];
    if (
      typeof min !== 'number' ||
      typeof max !== 'number' ||
      !Number.isInteger(min) ||
      !Number.isInteger(max) ||
      min < 0 ||
      max < 1 ||
      min > max ||
      max > 20
    )
      return false;
    if (
      !group['fields'].every(
        (child: unknown): boolean =>
          record(child) && child['type'] !== 'group' && child['group'] === undefined,
      )
    )
      return false;
  }
  const definitions = allFields(fields as Field[]);
  if (definitions.length > 100) return false;
  const ids = new Set<string>();
  for (const item of definitions as unknown[]) {
    if (
      !record(item) ||
      typeof item['id'] !== 'string' ||
      !/^[a-z][a-z0-9_-]{0,63}$/.test(item['id']) ||
      ids.has(item['id'])
    )
      return false;
    ids.add(item['id']);
    if (
      !FIELD_TYPES.includes(item['type'] as FieldType) ||
      ![item['label'], item['placeholder'], item['help']].every(isText)
    )
      return false;
    if (typeof item['required'] !== 'boolean' || typeof item['note'] !== 'string') return false;
    if (
      !isText(item['tooltip']) ||
      (item['tooltipPlacement'] !== undefined &&
        !['title', 'icon', 'info'].includes(item['tooltipPlacement'] as string)) ||
      !isText(item['patternMessage']) ||
      typeof item['pattern'] !== 'string' ||
      !validPattern(item['pattern'])
    )
      return false;
    if (
      !Array.isArray(item['options']) ||
      item['options'].length > 100 ||
      !item['options'].every(isText)
    )
      return false;
    if (['select', 'radio'].includes(item['type'] as string) && item['options'].length === 0)
      return false;
    const min = item['minLength'];
    const max = item['maxLength'];
    if (
      typeof min !== 'number' ||
      typeof max !== 'number' ||
      !Number.isInteger(min) ||
      !Number.isInteger(max) ||
      min < 0 ||
      max < 0 ||
      min > 10000 ||
      max > 10000 ||
      (max !== 0 && min > max)
    )
      return false;
  }
  const review = value['review'];
  return (
    record(review) &&
    Array.isArray(review['checks']) &&
    review['checks'].length === 5 &&
    review['checks'].every((check: unknown): boolean => typeof check === 'boolean') &&
    typeof review['reviewer'] === 'string' &&
    (review['approvedAt'] === null ||
      (typeof review['approvedAt'] === 'string' &&
        Number.isFinite(Date.parse(review['approvedAt']))))
  );
}

/** Upgrade this Studio's previous contract while keeping foreign editions incompatible. */
export function parseProject(value: unknown): Project | null {
  if (validateProject(value)) return value;
  if (
    !record(value) ||
    !['1.0.0', '1.1.0'].includes(value['schemaVersion'] as string) ||
    !Array.isArray(value['fields']) ||
    !isText(value['submit'])
  )
    return null;
  if (value['fields'].some((field: unknown): boolean => record(field) && field['type'] === 'group'))
    return null;
  // Version 1.1 already required localized pattern/tooltip/button properties.
  // Do not silently repair malformed 1.1 files with defaults intended for 1.0.
  const next: unknown =
    value['schemaVersion'] === '1.1.0'
      ? { ...value, schemaVersion: '1.2.0' }
      : {
          ...value,
          schemaVersion: '1.2.0',
          languages: value['languages'] ?? ['de', 'en'],
          buttons: value['buttons'] ?? [createButton('submit', value['submit'])],
          fields: value['fields'].map((field: unknown): unknown =>
            record(field)
              ? { tooltip: text('', ''), pattern: '', patternMessage: text('', ''), ...field }
              : field,
          ),
        };
  if (!validateProject(next)) return null;
  return {
    ...next,
    review: { ...next.review, checks: [false, false, false, false, false], approvedAt: null },
  };
}
