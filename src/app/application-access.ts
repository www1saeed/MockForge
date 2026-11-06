import type { ApplicationProject } from './application-project';
import type { Text } from './project.model';

export const ACCESS_RIGHTS = ['open', 'create', 'view', 'edit', 'delete'] as const;
export type AccessRight = (typeof ACCESS_RIGHTS)[number];
export type AccessRights = Record<AccessRight, boolean>;
/** Missing entries inherit; an explicit false overrides the parent. */
export type AccessPolicy = Record<string, Partial<AccessRights>>;
export interface ApplicationRole {
  id: string;
  label: Text;
  rights: AccessRights;
}
export const ROLE_LIMIT = 10;
export const ALLOW_RIGHTS: Readonly<AccessRights> = Object.freeze({
  open: true,
  create: true,
  view: true,
  edit: true,
  delete: true,
});
export const DENY_RIGHTS: Readonly<AccessRights> = Object.freeze({
  open: false,
  create: false,
  view: false,
  edit: false,
  delete: false,
});
function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function rights(value: unknown, complete: boolean): boolean {
  return (
    object(value) &&
    Object.keys(value).every(
      (key) => ACCESS_RIGHTS.includes(key as AccessRight) && typeof value[key] === 'boolean',
    ) &&
    (!complete || ACCESS_RIGHTS.every((key) => typeof value[key] === 'boolean'))
  );
}
function roleLabel(value: unknown, languages: readonly string[]): boolean {
  return (
    object(value) &&
    Object.keys(value).every((key) => ['de', 'en', 'fa'].includes(key)) &&
    ['de', 'en', 'fa'].every((key) => typeof value[key] === 'string' && value[key].length <= 256) &&
    languages.every((key) => typeof value[key] === 'string' && value[key].trim().length > 0)
  );
}
export function validRoles(
  value: unknown,
  languages: readonly string[],
): value is ApplicationRole[] | undefined {
  if (value === undefined) return true;
  return (
    Array.isArray(value) &&
    value.length <= ROLE_LIMIT &&
    new Set(value.map((role) => (object(role) ? role['id'] : null))).size === value.length &&
    value.every(
      (role) =>
        object(role) &&
        Object.keys(role).every((key) => ['id', 'label', 'rights'].includes(key)) &&
        typeof role['id'] === 'string' &&
        /^[a-z][a-z0-9_-]{0,63}$/.test(role['id']) &&
        roleLabel(role['label'], languages) &&
        rights(role['rights'], true),
    )
  );
}
export function validAccessPolicy(
  value: unknown,
  roles: readonly ApplicationRole[],
): value is AccessPolicy | undefined {
  return (
    value === undefined ||
    (object(value) &&
      Object.keys(value).length <= ROLE_LIMIT &&
      Object.entries(value).every(
        ([id, rule]) => roles.some((role) => role.id === id) && rights(rule, false),
      ))
  );
}
/** Simulation only. Parent screen denial is a gate; child overrides cannot reopen it. */
export function resolveAccess(
  project: ApplicationProject,
  roleId: string | null,
  formId: string,
  listId?: string,
): AccessRights {
  const form = project.forms.find((form) => form.id === formId);
  const list = listId === undefined ? undefined : form?.lists?.find((list) => list.id === listId);
  if (!form || (listId !== undefined && !list)) return { ...DENY_RIGHTS };
  const roles = project.roles ?? [];
  const role = roles.find((role) => role.id === roleId);
  if (roles.length && !role) return { ...DENY_RIGHTS };
  const base = role ? { ...role.rights, ...form.access?.[role.id] } : { ...ALLOW_RIGHTS };
  const resolved = role && list ? { ...base, ...list.access?.[role.id] } : base;
  const open = base.open && resolved.open;
  return Object.fromEntries(
    ACCESS_RIGHTS.map((key) => [
      key,
      open && resolved[key] && (key === 'open' || !list || list.actions[key]),
    ]),
  ) as AccessRights;
}
