import type { ApplicationForm, ApplicationProject } from './application-project';
import type { Field } from './project.model';
import { CollectionList, collectionFields, pruneCollections } from './collection.model';
import { ResponseValues, ResponseRow, ownResponse } from './response-values';
import { validRecordValues } from './collection-query';

export const FIELD_MODES = ['hidden', 'readonly', 'editable'] as const;
export type FieldMode = (typeof FIELD_MODES)[number];
export type FieldPolicy = Record<string, FieldMode>;
export type FieldAccess = Record<string, FieldPolicy>;
export type FieldModes = Readonly<Record<string, FieldMode>>;
export function ownFieldMode(policy: FieldPolicy | undefined, id: string): FieldMode | undefined {
  return policy && Object.hasOwn(policy, id) ? policy[id] : undefined;
}
export function validFieldPolicy(
  value: unknown,
  roleIds: readonly string[],
): value is FieldPolicy | undefined {
  return (
    value === undefined ||
    (!!value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      Object.keys(value).length <= 10 &&
      Object.entries(value).every(
        ([id, mode]) => roleIds.includes(id) && FIELD_MODES.includes(mode),
      ))
  );
}
export function validFieldAccess(form: ApplicationForm, roleIds: readonly string[]): boolean {
  const value = form.fieldAccess;
  if (!validFieldPolicy(form.fieldDefaults, roleIds)) return false;
  if (value === undefined) return true;
  const refs = new Set(collectionFields(form.fields).map((field) => field.id));
  return (
    !!value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).length <= 100 &&
    Object.entries(value).every(
      ([id, policy]) => refs.has(id) && policy !== undefined && validFieldPolicy(policy, roleIds),
    )
  );
}
export function fieldPolicy(access: FieldAccess | undefined, id: string): FieldPolicy | undefined {
  return access && Object.hasOwn(access, id) ? access[id] : undefined;
}
export function resolveFieldModes(
  project: ApplicationProject,
  roleId: string | null,
  formId: string,
): Record<string, FieldMode> {
  const form = project.forms.find((form) => form.id === formId);
  if (!form) return {};
  const role = project.roles?.find((role) => role.id === roleId);
  const admin = role?.preset === 'admin';
  const base = admin
    ? 'editable'
    : project.roles?.length && !role
      ? 'hidden'
      : role
        ? (ownFieldMode(form.fieldDefaults, role.id) ?? role.fieldMode ?? 'editable')
        : 'editable';
  const cap = (parent: FieldMode, child: FieldMode): FieldMode =>
    FIELD_MODES[Math.min(FIELD_MODES.indexOf(parent), FIELD_MODES.indexOf(child))];
  const entries: [string, FieldMode][] = [];
  for (const field of form.fields) {
    const mode = admin
      ? 'editable'
      : cap(
          base,
          role ? (ownFieldMode(fieldPolicy(form.fieldAccess, field.id), role.id) ?? base) : base,
        );
    entries.push([field.id, mode]);
    for (const child of field.group?.fields ?? []) {
      const id = field.id + '/' + child.id;
      entries.push([
        id,
        admin
          ? 'editable'
          : cap(
              mode,
              role ? (ownFieldMode(fieldPolicy(form.fieldAccess, id), role.id) ?? mode) : mode,
            ),
      ]);
    }
  }
  return Object.fromEntries(entries);
}
export function fieldMode(modes: FieldModes, id: string): FieldMode {
  return Object.hasOwn(modes, id) ? modes[id] : 'editable';
}
export function lockedGroup(field: Field, modes: FieldModes): boolean {
  return (
    fieldMode(modes, field.id) !== 'editable' ||
    Object.entries(modes).some(([id, mode]) => id.startsWith(field.id + '/') && mode !== 'editable')
  );
}
/** Renderer/batch projections remain legacy Field definitions, never access metadata. */
export function projectFields(
  fields: readonly Field[],
  modes: FieldModes,
  editableOnly = false,
): Field[] {
  const relax = (field: Field): Field =>
    !field.required && !field.pattern && !field.minLength && !field.maxLength
      ? field
      : { ...field, required: false, pattern: '', minLength: 0, maxLength: 0 };
  return fields.flatMap((field) => {
    const mode = fieldMode(modes, field.id);
    if (mode === 'hidden' || (editableOnly && mode !== 'editable')) return [];
    if (!field.group) return [mode === 'readonly' ? relax(field) : field];
    const children = field.group.fields
      .filter((child) => {
        const mode = fieldMode(modes, field.id + '/' + child.id);
        return mode !== 'hidden' && (!editableOnly || mode === 'editable');
      })
      .map((child) =>
        fieldMode(modes, field.id + '/' + child.id) === 'readonly' ? relax(child) : child,
      );
    if (!children.length) return [];
    const minItems = mode === 'readonly' ? 0 : field.group.minItems;
    return children.length === field.group.fields.length &&
      children.every((child, i) => child === field.group!.fields[i]) &&
      minItems === field.group.minItems
      ? [field]
      : [{ ...field, group: { ...field.group, fields: children, minItems } }];
  });
}
export function projectList(list: CollectionList, fields: readonly Field[]): CollectionList {
  const visible = new Map(collectionFields(fields).map((field) => [field.id, field]));
  const emptyGroups = new Set(
    (list.columnSettings ?? [])
      .filter(
        (column) =>
          column.groupFields &&
          !column.groupFields.some((id) =>
            visible.get(column.fieldId)?.group?.fields.some((child) => child.id === id),
          ),
      )
      .map((column) => column.fieldId),
  );
  return pruneCollections(fields, [
    {
      ...list,
      columns: list.columns.filter((id) => !emptyGroups.has(id)),
      searchFields: list.searchFields.filter((id) => !emptyGroups.has(id)),
    },
  ])![0];
}
/** Protected values are taken only from the saved record; unknown editable input is rejected. */
export function mergeFieldValues(
  fields: readonly Field[],
  modes: FieldModes,
  submitted: unknown,
  previous?: ResponseValues,
  allowMissing = false,
): ResponseValues | null {
  const record = (value: unknown): value is ResponseValues =>
    !!value && typeof value === 'object' && !Array.isArray(value);
  if (
    !record(submitted) ||
    Object.keys(submitted).some((id) => !fields.some((field) => field.id === id))
  )
    return null;
  const output: ResponseValues = {},
    editable: ResponseValues = {};
  for (const field of fields) {
    const old = previous ? ownResponse(previous, field.id) : undefined,
      value = ownResponse(submitted, field.id);
    if (fieldMode(modes, field.id) !== 'editable') {
      if (old !== undefined)
        Object.defineProperty(output, field.id, {
          value: old,
          enumerable: true,
          writable: true,
          configurable: true,
        });
      continue;
    }
    if (!field.group) {
      if (value !== undefined) {
        Object.defineProperty(output, field.id, {
          value,
          enumerable: true,
          writable: true,
          configurable: true,
        });
        Object.defineProperty(editable, field.id, {
          value,
          enumerable: true,
          writable: true,
          configurable: true,
        });
      }
      continue;
    }
    const children = field.group.fields,
      editableChildren = children.filter(
        (child) => fieldMode(modes, field.id + '/' + child.id) === 'editable',
      );
    if (!editableChildren.length) {
      if (old !== undefined)
        Object.defineProperty(output, field.id, {
          value: old,
          enumerable: true,
          writable: true,
          configurable: true,
        });
      continue;
    }
    if (value === undefined) {
      if (previous && old !== undefined && lockedGroup(field, modes)) return null;
      continue;
    }
    if (
      !Array.isArray(value) ||
      (previous &&
        lockedGroup(field, modes) &&
        (Array.isArray(old) ? old.length : 0) !== value.length)
    )
      return null;
    const rows: ResponseRow[] = [],
      editRows: ResponseRow[] = [];
    for (let index = 0; index < value.length; index++) {
      const row = value[index];
      if (!record(row) || Object.keys(row).some((id) => !children.some((child) => child.id === id)))
        return null;
      const merged = mergeFieldValues(
        children,
        Object.fromEntries(
          children.map((child) => [child.id, fieldMode(modes, field.id + '/' + child.id)]),
        ),
        row,
        Array.isArray(old) ? old[index] : undefined,
        allowMissing,
      );
      if (!merged) return null;
      rows.push(merged as ResponseRow);
      editRows.push(
        Object.fromEntries(
          editableChildren
            .filter((child) => Object.hasOwn(row, child.id))
            .map((child) => [child.id, ownResponse(row, child.id)]),
        ) as ResponseRow,
      );
    }
    if (rows.length || old !== undefined || !previous)
      Object.defineProperty(output, field.id, {
        value: rows,
        enumerable: true,
        writable: true,
        configurable: true,
      });
    Object.defineProperty(editable, field.id, {
      value: editRows,
      enumerable: true,
      writable: true,
      configurable: true,
    });
  }
  const editableFields = projectFields(fields, modes, true).map((field) =>
    field.group &&
    previous &&
    lockedGroup(
      fields.find((item) => item.id === field.id)!,
      modes,
    )
      ? { ...field, group: { ...field.group, minItems: 0 } }
      : field,
  );
  return validRecordValues(editableFields, editable, allowMissing)
    ? (JSON.parse(JSON.stringify(output)) as ResponseValues)
    : null;
}
