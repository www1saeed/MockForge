import {
  ApplicationForm,
  ApplicationProject,
  parseApplicationProject,
  validateApplicationProject,
} from './application-project';
import { createButton, FormContent, Text } from './project.model';

/** Reserve form identity independently of localized titles and preview response IDs. */
export function allocateFormId(project: ApplicationProject): string {
  const ids = new Set(project.forms.map((form): string => form.id));
  let suffix = 1;
  while (ids.has(`form-${suffix}`)) suffix++;
  return `form-${suffix}`;
}

/** Build an empty, editable form; callers choose its title before adding it. */
export function createApplicationForm(id: string, title: Text): ApplicationForm {
  const button = createButton('submit');
  return {
    id,
    title: { ...title },
    description: { de: '', en: '', fa: '' },
    submit: { ...button.label },
    columns: 1,
    fields: [],
    buttons: [button],
  };
}

/** Validate all budgets before committing once, with detached inputs and invalidated review. */
function commitForms(
  project: ApplicationProject,
  forms: ApplicationForm[],
): ApplicationProject | null {
  const candidate: ApplicationProject = { ...project, forms };
  if (!validateApplicationProject(candidate)) return null;
  if (JSON.stringify(forms) === JSON.stringify(project.forms)) return project;
  return parseApplicationProject({
    ...candidate,
    review: { ...project.review, checks: [false, false, false, false, false], approvedAt: null },
  });
}

/** Append one definition. Invalid IDs, duplicate identities and exhausted budgets reject atomically. */
export function addApplicationForm(
  project: ApplicationProject,
  form: ApplicationForm,
): ApplicationProject | null {
  return commitForms(project, [...project.forms, form]);
}

/** Duplicate configuration only; form-local field/button IDs remain valid in the new scope. */
export function duplicateApplicationForm(
  project: ApplicationProject,
  sourceId: string,
  title: Text,
): ApplicationProject | null {
  const source = project.forms.find((form): boolean => form.id === sourceId);
  return source
    ? addApplicationForm(project, { ...source, id: allocateFormId(project), title })
    : null;
}

/** Edit by stable identity; selection and response state are the future session store's concern. */
export function updateApplicationForm(
  project: ApplicationProject,
  id: string,
  change: Partial<FormContent & Pick<ApplicationForm, 'menu'>>,
): ApplicationProject | null {
  if (!project.forms.some((form): boolean => form.id === id)) return null;
  return commitForms(
    project,
    project.forms.map((form): ApplicationForm =>
      form.id === id ? { ...form, ...change, id } : form,
    ),
  );
}

/** Removing the final form is forbidden; confirmation belongs to the UI boundary. */
export function removeApplicationForm(
  project: ApplicationProject,
  id: string,
): ApplicationProject | null {
  if (project.forms.length === 1 || !project.forms.some((form): boolean => form.id === id))
    return null;
  return commitForms(
    project,
    project.forms.filter((form): boolean => form.id !== id),
  );
}

/** Reorder by identity without wrapping at either end or changing any form's contents. */
export function moveApplicationForm(
  project: ApplicationProject,
  id: string,
  direction: -1 | 1,
): ApplicationProject | null {
  const index = project.forms.findIndex((form): boolean => form.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= project.forms.length) return null;
  const forms = [...project.forms];
  [forms[index], forms[target]] = [forms[target], forms[index]];
  return commitForms(project, forms);
}
