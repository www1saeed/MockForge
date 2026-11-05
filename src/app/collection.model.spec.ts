import {
  createField,
  example,
  parseApplicationProject,
  serializeApplicationProject,
  validateApplicationProject,
  CollectionList,
  createCollectionList,
  pruneCollections,
  text,
} from './project';

describe('Collection configuration contract', (): void => {
  it('migrates 2.0 without carrying approvals and round-trips list preferences without answers', (): void => {
    const project = parseApplicationProject(example('saas'))!;
    const old = {
      ...project,
      schemaVersion: '2.0.0',
      review: { ...project.review, approvedAt: '2026-11-05T12:00:00Z' },
    };
    expect(parseApplicationProject(old)?.review.approvedAt).toBeNull();
    project.forms[0].lists = [createCollectionList(project.forms[0].fields, [])];
    project.forms[0].entries = { count: 25, seed: 1 };
    expect(parseApplicationProject(JSON.parse(serializeApplicationProject(project)))).toEqual(
      project,
    );
    expect(parseApplicationProject({ ...old, forms: project.forms })).toBeNull();
    expect('records' in project.forms[0]).toBe(false);
  });
  it('checks references, duplicate IDs, choice presets and bounded settings', (): void => {
    const project = parseApplicationProject(example('saas'))!;
    const form = project.forms[0];
    const list = createCollectionList(form.fields, []);
    form.lists = [list];
    expect(validateApplicationProject(project)).toBe(true);
    for (const change of [
      { id: '../x' },
      { columns: ['missing'] },
      { columns: ['name', 'name'] },
      { filters: ['name'] },
      { pageSize: 0 },
      { pageSize: 101 },
      { selectable: 'true' },
      { title: { de: 'Only German' } },
      { actions: { create: true } },
      { sort: { fieldId: 'missing', direction: 'asc' } },
      { presets: [{ fieldId: 'team', value: '999' }] },
      { presets: [{ fieldId: 'privacy', value: 'true' }] },
      {
        presets: [
          { fieldId: 'privacy', value: true },
          { fieldId: 'privacy', value: false },
        ],
      },
      { extra: true },
    ])
      expect(
        validateApplicationProject({
          ...project,
          forms: [{ ...form, lists: [{ ...list, ...change }] }],
        }),
      ).toBe(false);
    expect(
      validateApplicationProject({ ...project, forms: [{ ...form, lists: [list, list] }] }),
    ).toBe(false);
    for (const entries of [
      { count: 501, seed: 1 },
      { count: 1, seed: -1 },
      { count: 1, seed: 1, values: [] },
      null,
    ])
      expect(validateApplicationProject({ ...project, forms: [{ ...form, entries }] })).toBe(false);
    list.presets = [{ fieldId: 'privacy', value: false }];
    expect(validateApplicationProject(project)).toBe(true);
    form.fields.push(createField('group', 'people'));
    list.columns.push('people');
    expect(validateApplicationProject(project)).toBe(false);
  });
  it('prunes changed/deleted references while preserving surviving order and source ownership', (): void => {
    const select = createField('select', 'choice');
    const fields = [createField('text', 'name'), select];
    const list: CollectionList = {
      ...createCollectionList(fields, []),
      filters: ['choice'],
      presets: [{ fieldId: 'choice', value: '1' }],
      sort: { fieldId: 'name', direction: 'asc' },
    };
    const pruned = pruneCollections([{ ...select, options: [text('Eine', 'One')] }], [list])!;
    expect(pruned[0].columns).toEqual(['choice']);
    expect(pruned[0].searchFields).toEqual(['choice']);
    expect(pruned[0].presets).toEqual([]);
    expect(pruned[0].sort).toBeUndefined();
    expect(list.columns).toEqual(['name', 'choice']);
    expect(pruneCollections(fields, undefined)).toBeUndefined();
  });
});
