import { Field, Locale } from './project.model';
import { ApplicationForm } from './application-project';
import { CollectionList, collectionFields, validCollectionValue } from './collection.model';
import { ownResponse, ResponseValues } from './response-values';
import { responseLengthViolation } from './response-constraints';
import { translate } from './translations';

export interface CollectionRecord {
  id: string;
  values: ResponseValues;
}
export interface CollectionQuery {
  search: string;
  filters: ReadonlyMap<string, string | boolean>;
  sort?: { fieldId: string; direction: 'asc' | 'desc' } | null;
}

export function collectionValue(values: ResponseValues, id: string): unknown {
  const [parent, child] = id.split('/');
  const value = ownResponse(values, parent);
  return child && Array.isArray(value) ? value.map((row) => ownResponse(row, child)) : value;
}
export function formatRecordValue(
  field: Field,
  value: unknown,
  locale: Locale,
  groupFields?: readonly string[],
): string {
  if (value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return translate(value ? 'recordTrue' : 'recordFalse', locale);
  if (Array.isArray(value))
    return field.group
      ? value
          .map((row) =>
            field
              .group!.fields.filter((child) => !groupFields || groupFields.includes(child.id))
              .map((child) => formatRecordValue(child, ownResponse(row, child.id), locale))
              .join(' · '),
          )
          .join(' | ') || '—'
      : value.map((item) => formatRecordValue(field, item, locale)).join(' · ') || '—';
  if (typeof value !== 'string') return '—';
  if (field.type === 'radio' || field.type === 'select')
    return field.options[Number(value)]?.[locale] ?? '—';
  return value;
}

/** Presets always precede reader filters; matching-all selection uses this same result. */
export function queryCollection(
  form: ApplicationForm,
  list: CollectionList,
  records: readonly CollectionRecord[],
  query: CollectionQuery,
  locale: Locale,
): CollectionRecord[] {
  const fields = new Map(collectionFields(form.fields).map((field) => [field.id, field]));
  const matches = (record: CollectionRecord, id: string, value: string | boolean): boolean =>
    ownResponse(record.values, id) === value;
  const shownChildren = (id: string): readonly string[] | undefined =>
    list.columns.includes(id)
      ? list.columnSettings?.find((column) => column.fieldId === id)?.groupFields
      : undefined;
  const search = query.search.trim().toLocaleLowerCase(locale);
  const result = records.filter(
    (record) =>
      list.presets.every((preset): boolean => matches(record, preset.fieldId, preset.value)) &&
      list.filters.every(
        (id): boolean => !query.filters.has(id) || matches(record, id, query.filters.get(id)!),
      ) &&
      (!search ||
        list.searchFields.some(
          (id): boolean =>
            fields.has(id) &&
            formatRecordValue(
              fields.get(id)!,
              collectionValue(record.values, id),
              locale,
              shownChildren(id),
            )
              .toLocaleLowerCase(locale)
              .includes(search),
        )),
  );
  const sort = query.sort === undefined ? list.sort : query.sort;
  if (
    sort &&
    list.columns.includes(sort.fieldId) &&
    fields.has(sort.fieldId) &&
    list.columnSettings?.find((column) => column.fieldId === sort.fieldId)?.sortable !== false
  ) {
    const collator = new Intl.Collator(locale, { numeric: true, sensitivity: 'base' });
    const field = fields.get(sort.fieldId)!;
    result.sort((left, right): number => {
      const a = collectionValue(left.values, field.id),
        b = collectionValue(right.values, field.id);
      const order =
        field.type === 'number' &&
        typeof a === 'string' &&
        a !== '' &&
        typeof b === 'string' &&
        b !== '' &&
        Number.isFinite(Number(a)) &&
        Number.isFinite(Number(b))
          ? Number(a) - Number(b)
          : collator.compare(
              formatRecordValue(field, a, locale, shownChildren(field.id)),
              formatRecordValue(field, b, locale, shownChildren(field.id)),
            );
      return order
        ? sort.direction === 'desc'
          ? -order
          : order
        : collator.compare(left.id, right.id);
    });
  }
  return result;
}

/** Fingerprint answer-affecting definitions, not field order, copy, notes, theme or list views. */
export function collectionSignature(form: ApplicationForm, locale: Locale): string {
  const shape = (field: Field): unknown => ({
    id: field.id,
    type: field.type,
    required: field.required,
    minLength: field.minLength,
    maxLength: field.maxLength,
    pattern: field.pattern,
    options: field.options,
    ...(field.group
      ? {
          group: {
            minItems: field.group.minItems,
            maxItems: field.group.maxItems,
            fields: [...field.group.fields].sort((a, b) => a.id.localeCompare(b.id)).map(shape),
          },
        }
      : {}),
  });
  return JSON.stringify({
    fields: [...form.fields].sort((a, b) => a.id.localeCompare(b.id)).map(shape),
    entries: form.entries ?? { count: 25, seed: 1 },
    locale,
  });
}

/** Shape/representation guard; interactive constraints and isolated patterns are checked by the renderer. */
export function validRecordValues(
  fields: readonly Field[],
  values: unknown,
  allowMissing = false,
): values is ResponseValues {
  const record = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);
  if (
    !record(values) ||
    Object.keys(values).some((id): boolean => !fields.some((field): boolean => field.id === id))
  )
    return false;
  return fields.every((field): boolean => {
    if (!Object.hasOwn(values, field.id)) return allowMissing;
    const value = values[field.id];
    if (field.group)
      return (
        Array.isArray(value) &&
        value.length >= field.group.minItems &&
        value.length <= field.group.maxItems &&
        value.every((row: unknown): boolean =>
          validRecordValues(field.group!.fields, row, allowMissing),
        )
      );
    if (field.type === 'checkbox')
      return typeof value === 'boolean' && (allowMissing || !field.required || value);
    if (
      typeof value !== 'string' ||
      (!allowMissing && field.required && !value) ||
      responseLengthViolation(field, value)
    )
      return false;
    if (
      (field.type === 'select' || field.type === 'radio') &&
      value &&
      !validCollectionValue(field, value)
    )
      return false;
    return true;
  });
}
