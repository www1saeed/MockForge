import {
  applicationHref,
  applicationMenu,
  parseApplicationRoute,
  resolveApplicationTarget,
} from './application-navigation';
import { example, parseApplicationProject, createCollectionList } from './project';

describe('Application navigation', () => {
  it('round-trips form/list links and rejects malformed or foreign hashes without guessing', () => {
    for (const target of [
      { kind: 'form' as const, formId: 'constructor' },
      { kind: 'list' as const, formId: 'same', listId: 'same' },
    ])
      expect(parseApplicationRoute(applicationHref(target))).toEqual(target);
    expect(parseApplicationRoute('#workspace')).toBeNull();
    expect(parseApplicationRoute('#application')).toEqual({ kind: 'home' });
    for (const hash of [
      '#application/form/%',
      '#application/form/a/extra',
      '#application/list/a',
      '#application/list/a/../b',
      '#application/form/',
      '\u0023application/form/%2F',
      '#application/role/a',
    ])
      expect(parseApplicationRoute(hash)).toEqual({ kind: 'missing' });
  });
  it('orders menu entries per form, supports direct hidden-form links and never resolves dangling references', () => {
    const project = parseApplicationProject(example('saas'))!,
      first = project.forms[0];
    first.menu = false;
    first.lists = [createCollectionList(first.fields, [])];
    project.forms.push({ ...first, id: 'second', menu: true });
    expect(applicationMenu(project)).toEqual([
      { kind: 'list', formId: first.id, listId: first.lists[0].id },
      { kind: 'form', formId: 'second' },
      { kind: 'list', formId: 'second', listId: first.lists[0].id },
    ]);
    expect(resolveApplicationTarget(project, { kind: 'home' })).toEqual(
      applicationMenu(project)[0],
    );
    expect(resolveApplicationTarget(project, { kind: 'form', formId: first.id })).toEqual({
      kind: 'form',
      formId: first.id,
    });
    expect(
      resolveApplicationTarget(project, { kind: 'list', formId: first.id, listId: 'gone' }),
    ).toBeNull();
    expect(resolveApplicationTarget(project, { kind: 'form', formId: 'gone' })).toBeNull();
    expect(resolveApplicationTarget(project, { kind: 'missing' })).toBeNull();
    project.forms = [{ ...first, lists: [] }];
    expect(resolveApplicationTarget(project, { kind: 'home' })).toBeNull();
  });
});
