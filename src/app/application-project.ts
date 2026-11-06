import { FieldPolicy, FieldAccess, validFieldAccess } from './field-access';
import {
  ApplicationRole,
  ApplicationUser,
  AccessPolicy,
  validRoles,
  validUsers,
  validAccessPolicy,
} from './application-access';
import { allFields, FormContent, Project } from './project.model';
import { parseProject, validateProject } from './project.validation';
import {
  CollectionEntries,
  CollectionList,
  COLLECTION_LIMITS,
  validCollections,
} from './collection.model';

/** Studio application contract; legacy forms remain valid import and renderer inputs. */
export const APPLICATION_SCHEMA_VERSION = '2.5.0';
export const APPLICATION_LIMITS = { forms: 20, definitions: 500, buttons: 100 } as const;
const PROJECT_KEYS = new Set([
  'format',
  'schemaVersion',
  'name',
  'owner',
  'audience',
  'goal',
  'scope',
  'theme',
  'languages',
  'forms',
  'roles',
  'users',
  'decisions',
  'questions',
  'review',
]);
const FORM_KEYS = new Set([
  'id',
  'menu',
  'title',
  'description',
  'submit',
  'columns',
  'fields',
  'buttons',
  'lists',
  'entries',
  'access',
  'fieldDefaults',
  'fieldAccess',
]);

/** Field and button IDs are unique within this form, including its group children. */
export interface ApplicationForm extends FormContent {
  id: string;
  /** Omission includes the form in the application menu; direct links still reach hidden forms. */
  menu?: boolean;
  access?: AccessPolicy;
  fieldDefaults?: FieldPolicy;
  fieldAccess?: FieldAccess;
  lists?: CollectionList[];
  entries?: CollectionEntries;
}

/** Project-level configuration and review; preview answers never belong here. */
export interface ApplicationProject {
  /** Distinguishes Studio 2.x from the incompatible original edition's 2.x files. */
  format: 'mockforge-studio';
  schemaVersion: typeof APPLICATION_SCHEMA_VERSION;
  name: string;
  owner: string;
  audience: string;
  goal: string;
  scope: string;
  theme: Project['theme'];
  languages: Project['languages'];
  forms: ApplicationForm[];
  roles?: ApplicationRole[];
  users?: ApplicationUser[];
  decisions: string;
  questions: string;
  review: Project['review'];
}

/** Read-only renderer/editor projection. Never persist or export this selected-form view. */
export function projectForForm(project: ApplicationProject, id: string): Project | null {
  const form = project.forms.find((item): boolean => item.id === id);
  if (!form) return null;
  return {
    schemaVersion: '1.3.0',
    name: project.name,
    owner: project.owner,
    audience: project.audience,
    goal: project.goal,
    scope: project.scope,
    theme: project.theme,
    languages: project.languages,
    decisions: project.decisions,
    questions: project.questions,
    review: project.review,
    title: form.title,
    description: form.description,
    submit: form.submit,
    columns: form.columns,
    fields: form.fields,
    buttons: form.buttons,
  };
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Validate the common form rules using the established Studio 1.3 boundary. */
function formProject(
  project: Record<string, unknown>,
  form: Record<string, unknown>,
): Record<string, unknown> {
  return {
    schemaVersion: '1.3.0',
    name: project['name'],
    owner: project['owner'],
    audience: project['audience'],
    goal: project['goal'],
    scope: project['scope'],
    theme: project['theme'],
    languages: project['languages'],
    decisions: project['decisions'],
    questions: project['questions'],
    review: project['review'],
    title: form['title'],
    description: form['description'],
    submit: form['submit'],
    columns: form['columns'],
    buttons: form['buttons'],
    fields: form['fields'],
  };
}

/**
 * Validate bounded multi-form configuration before flattening any group definitions.
 * Simulated role policies are validated separately; flows remain rejected.
 */
export function validateApplicationProject(value: unknown): value is ApplicationProject {
  if (
    !record(value) ||
    Object.keys(value).some((key): boolean => !PROJECT_KEYS.has(key)) ||
    value['format'] !== 'mockforge-studio' ||
    value['schemaVersion'] !== APPLICATION_SCHEMA_VERSION ||
    !validRoles(value['roles']) ||
    !validUsers(value['users'], (value['roles'] ?? []) as ApplicationRole[]) ||
    value['fields'] !== undefined ||
    value['buttons'] !== undefined ||
    !Array.isArray(value['forms']) ||
    value['forms'].length < 1 ||
    value['forms'].length > APPLICATION_LIMITS.forms
  )
    return false;
  const ids = new Set<string>();
  let definitions = 0;
  let buttons = 0;
  let listCount = 0;
  for (const form of value['forms'] as unknown[]) {
    if (
      !record(form) ||
      Object.keys(form).some((key): boolean => !FORM_KEYS.has(key)) ||
      typeof form['id'] !== 'string' ||
      !/^[a-z][a-z0-9_-]{0,63}$/.test(form['id']) ||
      ids.has(form['id']) ||
      (form['menu'] !== undefined && typeof form['menu'] !== 'boolean') ||
      form['flow'] !== undefined ||
      !validAccessPolicy(form['access'], (value['roles'] ?? []) as ApplicationRole[])
    )
      return false;
    const projected = formProject(value, form);
    if (!validateProject(projected)) return false;
    if (!validCollections(projected.fields, form['lists'], form['entries'])) return false;
    if (
      ((form['lists'] ?? []) as CollectionList[]).some(
        (list) => !validAccessPolicy(list.access, (value['roles'] ?? []) as ApplicationRole[]),
      )
    )
      return false;
    if (
      !validFieldAccess(
        form as unknown as ApplicationForm,
        ((value['roles'] ?? []) as ApplicationRole[]).map((role) => role.id),
      )
    )
      return false;
    ids.add(form['id']);
    definitions += allFields(projected.fields).length;
    buttons += projected.buttons.length;
    listCount += (form['lists'] as CollectionList[] | undefined)?.length ?? 0;
    if (listCount > COLLECTION_LIMITS.listsPerProject) return false;
    if (definitions > APPLICATION_LIMITS.definitions || buttons > APPLICATION_LIMITS.buttons)
      return false;
  }
  return true;
}

/** Create an owned JSON snapshot of an already validated specification. */
function snapshot<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** Older declarations admit only the features released in that version. */
function supportsApplicationVersion(project: ApplicationProject, version: string): boolean {
  if (
    project.users !== undefined ||
    (project.roles ?? []).some(
      (role) => role.preset !== undefined || role.fieldMode !== undefined,
    ) ||
    project.forms.some((form) => form.fieldDefaults !== undefined || form.fieldAccess !== undefined)
  )
    return false;
  if (version === '2.4.0') return true;
  if (project.roles !== undefined) return false;
  return project.forms.every((form) => {
    if (
      form.access !== undefined ||
      (form.lists ?? []).some(
        (list) =>
          list.access !== undefined ||
          (list.columnSettings ?? []).some((column) => column.badgeColor !== undefined),
      )
    )
      return false;
    if (version === '2.3.0') return true;
    if (version === '2.0.0') return form.lists === undefined && form.entries === undefined;
    const roots = new Set(
      form.fields.filter((field) => field.type !== 'group').map((field) => field.id),
    );
    return (form.lists ?? []).every((list) => {
      if (![...list.columns, ...list.searchFields].every((id) => roots.has(id))) return false;
      if (version === '2.1.0')
        return (
          list.appearance === undefined &&
          list.columnSettings === undefined &&
          list.actionSettings === undefined &&
          list.actionOrder === undefined
        );
      return (
        list.appearance?.layout === undefined &&
        (list.columnSettings ?? []).every(
          (column) => column.display === undefined && column.groupFields === undefined,
        )
      );
    });
  });
}

/**
 * Read only Studio formats. Migrate all supported 1.x files through the established
 * legacy parser, then wrap their complete form and invalidate the old review baseline.
 * No storage writes occur; callers decide when a validated migration may be persisted.
 */
export function parseApplicationProject(value: unknown): ApplicationProject | null {
  if (validateApplicationProject(value)) return snapshot(value);
  if (
    record(value) &&
    value['format'] === 'mockforge-studio' &&
    (value['schemaVersion'] === '2.0.0' ||
      value['schemaVersion'] === '2.1.0' ||
      value['schemaVersion'] === '2.2.0' ||
      value['schemaVersion'] === '2.3.0' ||
      value['schemaVersion'] === '2.4.0')
  ) {
    const next = { ...value, schemaVersion: APPLICATION_SCHEMA_VERSION };
    if (
      !validateApplicationProject(next) ||
      !supportsApplicationVersion(next, value['schemaVersion'])
    )
      return null;
    return snapshot({
      ...next,
      review: { ...next.review, checks: [false, false, false, false, false], approvedAt: null },
    });
  }
  const legacy = parseProject(value);
  if (!legacy) return null;
  const {
    title,
    description,
    submit,
    columns,
    fields,
    buttons,
    name,
    owner,
    audience,
    goal,
    scope,
    theme,
    languages,
    decisions,
    questions,
    review,
  } = legacy;
  return snapshot({
    format: 'mockforge-studio',
    schemaVersion: APPLICATION_SCHEMA_VERSION,
    name,
    owner,
    audience,
    goal,
    scope,
    theme,
    languages,
    decisions,
    questions,
    review: { ...review, checks: [false, false, false, false, false], approvedAt: null },
    forms: [{ id: 'form-1', title, description, submit, columns, fields, buttons }],
  });
}

/** Serialize the whole application, never a selected-form projection. */
export function serializeApplicationProject(project: ApplicationProject): string {
  if (!validateApplicationProject(project)) throw new Error('Invalid Studio application project.');
  return JSON.stringify(project, null, 2);
}
