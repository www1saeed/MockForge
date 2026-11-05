import { Text } from './project.model';

export const TABLE_DESIGNS = ['plain', 'striped', 'bordered', 'minimal'] as const;
export const COLLECTION_ACTIONS = ['create', 'view', 'edit', 'delete'] as const;
export const ACTION_ICONS = ['plus', 'eye', 'edit', 'trash', 'arrow'] as const;
export type CollectionActionKind = (typeof COLLECTION_ACTIONS)[number];
export interface CollectionAppearance {
  design: (typeof TABLE_DESIGNS)[number];
  density: 'comfortable' | 'compact';
  hover: boolean;
  stickyHeader: boolean;
}
export interface CollectionColumnSetting {
  fieldId: string;
  label: Text;
  align: 'start' | 'center' | 'end';
  sortable: boolean;
  width?: number;
}
export interface CollectionActionSetting {
  label: Text;
  variant: 'primary' | 'secondary' | 'ghost' | 'danger';
  display: 'text' | 'icon' | 'both';
  icon: (typeof ACTION_ICONS)[number];
}
export const DEFAULT_APPEARANCE: CollectionAppearance = {
  design: 'plain',
  density: 'comfortable',
  hover: true,
  stickyHeader: false,
};
export const DEFAULT_ACTION_ICONS: Record<CollectionActionKind, CollectionActionSetting['icon']> = {
  create: 'plus',
  view: 'eye',
  edit: 'edit',
  delete: 'trash',
};
export const DEFAULT_ACTION_VARIANTS: Record<
  CollectionActionKind,
  CollectionActionSetting['variant']
> = {
  create: 'primary',
  view: 'ghost',
  edit: 'secondary',
  delete: 'danger',
};
function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function keys(value: Record<string, unknown>, allowed: string[]): boolean {
  return Object.keys(value).every((key) => allowed.includes(key));
}
function label(value: unknown): boolean {
  return (
    object(value) &&
    keys(value, ['de', 'en', 'fa']) &&
    ['de', 'en', 'fa'].every((key) => typeof value[key] === 'string' && value[key].length <= 256)
  );
}
/** Imported presentation uses finite tokens and bounded numbers, never arbitrary CSS/HTML. */
export function validCollectionPresentation(list: Record<string, unknown>): boolean {
  const appearance = list['appearance'];
  if (
    appearance !== undefined &&
    (!object(appearance) ||
      !keys(appearance, ['design', 'density', 'hover', 'stickyHeader']) ||
      !TABLE_DESIGNS.includes(appearance['design'] as CollectionAppearance['design']) ||
      !['comfortable', 'compact'].includes(String(appearance['density'])) ||
      typeof appearance['hover'] !== 'boolean' ||
      typeof appearance['stickyHeader'] !== 'boolean')
  )
    return false;
  const columns = list['columnSettings'];
  if (columns !== undefined) {
    if (!Array.isArray(columns) || columns.length > 20) return false;
    const ids = new Set();
    for (const column of columns) {
      if (
        !object(column) ||
        !keys(column, ['fieldId', 'label', 'align', 'sortable', 'width']) ||
        !(list['columns'] as unknown[]).includes(column['fieldId']) ||
        ids.has(column['fieldId']) ||
        !label(column['label']) ||
        !['start', 'center', 'end'].includes(String(column['align'])) ||
        typeof column['sortable'] !== 'boolean' ||
        (column['width'] !== undefined &&
          (!Number.isInteger(column['width']) ||
            Number(column['width']) < 80 ||
            Number(column['width']) > 600))
      )
        return false;
      if (
        column['sortable'] === false &&
        object(list['sort']) &&
        list['sort']['fieldId'] === column['fieldId']
      )
        return false;
      ids.add(column['fieldId']);
    }
  }
  const actions = list['actionSettings'];
  if (actions !== undefined) {
    if (!object(actions) || !keys(actions, [...COLLECTION_ACTIONS])) return false;
    for (const value of Object.values(actions)) {
      if (
        !object(value) ||
        !keys(value, ['label', 'variant', 'display', 'icon']) ||
        !label(value['label']) ||
        !['primary', 'secondary', 'ghost', 'danger'].includes(String(value['variant'])) ||
        !['text', 'icon', 'both'].includes(String(value['display'])) ||
        !ACTION_ICONS.includes(value['icon'] as CollectionActionSetting['icon'])
      )
        return false;
    }
  }
  const order = list['actionOrder'];
  return (
    order === undefined ||
    (Array.isArray(order) &&
      order.length === 4 &&
      new Set(order).size === 4 &&
      order.every((key) => COLLECTION_ACTIONS.includes(key as CollectionActionKind)))
  );
}
