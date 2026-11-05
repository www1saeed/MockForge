import {
  CollectionAppearance,
  CollectionColumnSetting,
  CollectionActionSetting,
  CollectionActionKind,
  validCollectionPresentation,
} from './collection-presentation';
import { Field, Text } from './project.model';

export const COLLECTION_LIMITS = {
  listsPerForm: 10,
  listsPerProject: 50,
  columns: 20,
  recordsPerForm: 500,
  recordsPerProject: 1000,
  retainedUnits: 2000000,
} as const;
export interface CollectionEntries {
  count: number;
  seed: number;
}
export interface CollectionPreset {
  fieldId: string;
  value: string | boolean;
}
/** A view over the session records of its own form; no response data is serialized here. */
export interface CollectionList {
  appearance?: CollectionAppearance;
  columnSettings?: CollectionColumnSetting[];
  actionSettings?: Partial<Record<CollectionActionKind, CollectionActionSetting>>;
  actionOrder?: CollectionActionKind[];
  id: string;
  title: Text;
  columns: string[];
  searchFields: string[];
  filters: string[];
  presets: CollectionPreset[];
  pageSize: number;
  selectable: boolean;
  actions: { create: boolean; view: boolean; edit: boolean; delete: boolean };
  sort?: { fieldId: string; direction: 'asc' | 'desc' };
}

export function collectionLeaves(fields: readonly Field[]): Field[] {
  return fields.filter((field): boolean => field.type !== 'group');
}
export function collectionChoice(field: Field): boolean {
  return ['select', 'radio', 'checkbox'].includes(field.type);
}
export function validCollectionValue(field: Field, value: unknown): boolean {
  return field.type === 'checkbox'
    ? typeof value === 'boolean'
    : (field.type === 'select' || field.type === 'radio') &&
        typeof value === 'string' &&
        /^\d+$/.test(value) &&
        String(Number(value)) === value &&
        Number(value) < field.options.length;
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).every((key): boolean => keys.includes(key));
}

/** Validate references after the owning form has passed its existing field contract. */
export function validCollections(
  fields: readonly Field[],
  lists: unknown,
  entries: unknown,
): boolean {
  if (
    entries !== undefined &&
    (!record(entries) ||
      !exactKeys(entries, ['count', 'seed']) ||
      !Number.isInteger(entries['count']) ||
      Number(entries['count']) < 1 ||
      Number(entries['count']) > COLLECTION_LIMITS.recordsPerForm ||
      !Number.isInteger(entries['seed']) ||
      Number(entries['seed']) < 0 ||
      Number(entries['seed']) > 999999)
  )
    return false;
  if (lists === undefined) return true;
  if (!Array.isArray(lists) || lists.length > COLLECTION_LIMITS.listsPerForm) return false;
  const leaves = new Map(collectionLeaves(fields).map((field) => [field.id, field]));
  const ids = new Set<string>();
  const references = (value: unknown, filter = false): value is string[] =>
    Array.isArray(value) &&
    value.length <= COLLECTION_LIMITS.columns &&
    new Set(value).size === value.length &&
    value.every(
      (id: unknown): boolean =>
        typeof id === 'string' && leaves.has(id) && (!filter || collectionChoice(leaves.get(id)!)),
    );
  for (const list of lists as unknown[]) {
    if (!record(list)) return false;
    const title = list['title'];
    if (
      !exactKeys(list, [
        'id',
        'title',
        'columns',
        'searchFields',
        'filters',
        'presets',
        'pageSize',
        'selectable',
        'actions',
        'sort',
        'appearance',
        'columnSettings',
        'actionSettings',
        'actionOrder',
      ]) ||
      typeof list['id'] !== 'string' ||
      !/^[a-z][a-z0-9_-]{0,63}$/.test(list['id']) ||
      ids.has(list['id']) ||
      !record(title) ||
      !['de', 'en', 'fa'].every((lang): boolean => typeof title[lang] === 'string') ||
      !references(list['columns']) ||
      !references(list['searchFields']) ||
      !references(list['filters'], true) ||
      !Number.isInteger(list['pageSize']) ||
      Number(list['pageSize']) < 1 ||
      Number(list['pageSize']) > 100 ||
      typeof list['selectable'] !== 'boolean'
    )
      return false;
    if (!validCollectionPresentation(list)) return false;
    ids.add(list['id']);
    const actions = list['actions'];
    if (
      !record(actions) ||
      !exactKeys(actions, ['create', 'view', 'edit', 'delete']) ||
      !['create', 'view', 'edit', 'delete'].every(
        (key): boolean => typeof actions[key] === 'boolean',
      )
    )
      return false;
    const sort = list['sort'];
    if (
      sort !== undefined &&
      (!record(sort) ||
        !exactKeys(sort, ['fieldId', 'direction']) ||
        !list['columns'].includes(sort['fieldId'] as string) ||
        !['asc', 'desc'].includes(sort['direction'] as string))
    )
      return false;
    const presets = list['presets'];
    if (!Array.isArray(presets) || presets.length > COLLECTION_LIMITS.columns) return false;
    const presetFields = new Set<string>();
    for (const preset of presets as unknown[]) {
      if (
        !record(preset) ||
        !exactKeys(preset, ['fieldId', 'value']) ||
        typeof preset['fieldId'] !== 'string' ||
        presetFields.has(preset['fieldId']) ||
        !leaves.has(preset['fieldId']) ||
        !validCollectionValue(leaves.get(preset['fieldId'])!, preset['value'])
      )
        return false;
      presetFields.add(preset['fieldId']);
    }
  }
  return true;
}

export function createCollectionList(
  fields: readonly Field[],
  existing: readonly CollectionList[],
): CollectionList {
  let suffix = 1;
  while (existing.some((list): boolean => list.id === `list-${suffix}`)) suffix++;
  const columns = collectionLeaves(fields)
    .slice(0, COLLECTION_LIMITS.columns)
    .map((field): string => field.id);
  return {
    id: `list-${suffix}`,
    title: {
      de: `Alle Einträge ${suffix}`,
      en: `All entries ${suffix}`,
      fa: `همهٔ رکوردها ${suffix}`,
    },
    columns,
    searchFields: [...columns],
    filters: [],
    presets: [],
    pageSize: 10,
    selectable: true,
    actions: { create: true, view: true, edit: true, delete: true },
  };
}

/** Definition edits remove obsolete references without preventing ordinary field editing. */
export function pruneCollections(
  fields: readonly Field[],
  lists: readonly CollectionList[] | undefined,
): CollectionList[] | undefined {
  if (!lists) return undefined;
  const leaves = new Map(collectionLeaves(fields).map((field) => [field.id, field]));
  return lists.map((list) => {
    const columns = list.columns.filter((id): boolean => leaves.has(id));
    const next = {
      ...list,
      columns,
      ...(list.columnSettings
        ? {
            columnSettings: list.columnSettings.filter((column) =>
              columns.includes(column.fieldId),
            ),
          }
        : {}),
      searchFields: list.searchFields.filter((id): boolean => leaves.has(id)),
      filters: list.filters.filter(
        (id): boolean => leaves.has(id) && collectionChoice(leaves.get(id)!),
      ),
      presets: list.presets.filter(
        (preset): boolean =>
          leaves.has(preset.fieldId) &&
          validCollectionValue(leaves.get(preset.fieldId)!, preset.value),
      ),
    };
    if (next.sort && !columns.includes(next.sort.fieldId)) delete next.sort;
    return next;
  });
}
