import { allFields, FormContent, Project } from './project.model';
import { parseProject, validateProject } from './project.validation';

/** Staged Studio application contract; the live editor still writes Studio 1.3.0. */
export const APPLICATION_SCHEMA_VERSION = '2.0.0';
export const APPLICATION_LIMITS = { forms: 20, definitions: 500, buttons: 100 } as const;

/** Field and button IDs are unique within this form, including its group children. */
export interface ApplicationForm extends FormContent {
  id: string;
  /** Omission keeps the form in the future application menu. */
  menu?: boolean;
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
  decisions: string;
  questions: string;
  review: Project['review'];
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
 * Future lists, roles and flows are rejected until their own validation is implemented.
 */
export function validateApplicationProject(value: unknown): value is ApplicationProject {
  if (
    !record(value) ||
    value['format'] !== 'mockforge-studio' ||
    value['schemaVersion'] !== APPLICATION_SCHEMA_VERSION ||
    value['roles'] !== undefined ||
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
  for (const form of value['forms'] as unknown[]) {
    if (
      !record(form) ||
      typeof form['id'] !== 'string' ||
      !/^[a-z][a-z0-9_-]{0,63}$/.test(form['id']) ||
      ids.has(form['id']) ||
      (form['menu'] !== undefined && typeof form['menu'] !== 'boolean') ||
      form['lists'] !== undefined ||
      form['flow'] !== undefined ||
      form['access'] !== undefined
    )
      return false;
    const projected = formProject(value, form);
    if (!validateProject(projected)) return false;
    ids.add(form['id']);
    definitions += allFields(projected.fields).length;
    buttons += projected.buttons.length;
    if (definitions > APPLICATION_LIMITS.definitions || buttons > APPLICATION_LIMITS.buttons)
      return false;
  }
  return true;
}

/** Create an owned JSON snapshot of an already validated specification. */
function snapshot<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * Read only Studio formats. Migrate all supported 1.x files through the established
 * legacy parser, then wrap their complete form and invalidate the old review baseline.
 * No storage writes occur; callers decide when a validated migration may be persisted.
 */
export function parseApplicationProject(value: unknown): ApplicationProject | null {
  if (validateApplicationProject(value)) return snapshot(value);
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
