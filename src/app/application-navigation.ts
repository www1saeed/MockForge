import { ApplicationProject } from './application-project';

export type ApplicationTarget =
  { kind: 'form'; formId: string } | { kind: 'list'; formId: string; listId: string };
export type ApplicationRoute = ApplicationTarget | { kind: 'home' } | { kind: 'missing' };
const ID = /^[a-z][a-z0-9_-]{0,63}$/;

/** Hash-only links retain any static-host deployment prefix and never contain answer data. */
export function applicationHref(target: ApplicationTarget): string {
  return `#application/${target.kind}/${encodeURIComponent(target.formId)}${target.kind === 'list' ? `/${encodeURIComponent(target.listId)}` : ''}`;
}
export function parseApplicationRoute(hash: string): ApplicationRoute | null {
  if (hash === '#application') return { kind: 'home' };
  if (!hash.startsWith('#application/')) return null;
  const parts = hash.split('/');
  try {
    const kind = parts[1],
      formId = decodeURIComponent(parts[2] ?? '');
    if (!ID.test(formId)) return { kind: 'missing' };
    if (kind === 'form' && parts.length === 3) return { kind, formId };
    const listId = decodeURIComponent(parts[3] ?? '');
    if (kind === 'list' && parts.length === 4 && ID.test(listId)) return { kind, formId, listId };
  } catch {
    /* Malformed URL escapes are an invalid local route. */
  }
  return { kind: 'missing' };
}
export function applicationMenu(project: ApplicationProject): ApplicationTarget[] {
  return project.forms.flatMap((form) => [
    ...(form.menu === false ? [] : [{ kind: 'form' as const, formId: form.id }]),
    ...(form.lists ?? []).map((list) => ({
      kind: 'list' as const,
      formId: form.id,
      listId: list.id,
    })),
  ]);
}
export function resolveApplicationTarget(
  project: ApplicationProject,
  route: ApplicationRoute,
): ApplicationTarget | null {
  if (route.kind === 'home') return applicationMenu(project)[0] ?? null;
  if (route.kind === 'missing') return null;
  const form = project.forms.find((form) => form.id === route.formId);
  if (!form || (route.kind === 'list' && !form.lists?.some((list) => list.id === route.listId)))
    return null;
  return route;
}
