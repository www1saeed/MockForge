import {
  ApplicationProject,
  parseApplicationProject,
  validateApplicationProject,
  serializeApplicationProject,
} from './application-project';
import { example } from './project.examples';
import { createField, text } from './project.model';
import { createCollectionList, pruneCollections } from './collection.model';
import { queryCollection } from './collection-query';
import { handoff } from './project.handoff';
function fixture(): ApplicationProject {
  const project = parseApplicationProject(example('saas'))!;
  project.forms[0].fields = [createField('text', 'name'), createField('text', 'email')];
  project.forms[0].lists = [createCollectionList(project.forms[0].fields, [])];
  return project;
}
describe('List presentation contract', () => {
  it('migrates 2.1 lists without changing their definitions or retaining approval', () => {
    const project = fixture();
    const legacy = {
      ...project,
      schemaVersion: '2.1.0',
      review: {
        checks: [true, true, true, true, true],
        reviewer: 'Owner',
        approvedAt: '2026-11-05T00:00:00Z',
      },
    };
    const before = JSON.stringify(legacy),
      migrated = parseApplicationProject(legacy)!;
    expect(migrated.schemaVersion).toBe('2.3.0');
    expect(migrated.forms).toEqual(project.forms);
    expect(migrated.review.approvedAt).toBeNull();
    expect(migrated.review.checks).toEqual([false, false, false, false, false]);
    expect(JSON.stringify(legacy)).toBe(before);
  });
  it('round-trips bounded design, column and button choices and prunes removed columns', () => {
    const project = fixture(),
      form = project.forms[0],
      list = form.lists![0];
    list.appearance = { design: 'striped', density: 'compact', hover: false, stickyHeader: true };
    list.columnSettings = [
      {
        fieldId: 'name',
        label: text('Person', 'Person', 'شخص'),
        align: 'end',
        width: 180,
        sortable: false,
      },
    ];
    list.actionSettings = {
      edit: {
        label: text('Ändern', 'Change', 'تغییر'),
        variant: 'primary',
        display: 'icon',
        icon: 'edit',
      },
    };
    list.actionOrder = ['delete', 'edit', 'view', 'create'];
    expect(parseApplicationProject(JSON.parse(serializeApplicationProject(project)))).toEqual(
      project,
    );
    expect(handoff(project)).toContain('striped');
    expect(handoff(project)).toContain('Ändern');
    expect(pruneCollections([createField('text', 'email')], form.lists)![0].columnSettings).toEqual(
      [],
    );
    const records = [
      { id: '1', values: { name: 'Zed' } },
      { id: '2', values: { name: 'Ada' } },
    ];
    expect(
      queryCollection(
        form,
        list,
        records,
        { search: '', filters: new Map(), sort: { fieldId: 'name', direction: 'asc' } },
        'de',
      ),
    ).toEqual(records);
  });
  it('rejects unsupported CSS, unbounded dimensions, malformed labels and action settings', () => {
    for (const change of [
      { appearance: { design: 'cards', density: 'compact', hover: true, stickyHeader: false } },
      {
        appearance: {
          design: 'plain',
          density: 'compact',
          hover: true,
          stickyHeader: false,
          css: 'body{display:none}',
        },
      },
      { appearance: { design: 'plain', density: 'dense', hover: true, stickyHeader: false } },
      {
        columnSettings: [
          { fieldId: 'missing', label: text('', '', ''), align: 'start', sortable: true },
        ],
      },
      {
        columnSettings: [
          { fieldId: 'name', label: text('', '', ''), align: 'start', sortable: true, width: 700 },
        ],
      },
      {
        columnSettings: [
          { fieldId: 'name', label: text('', '', ''), align: 'start', sortable: true, width: 80.5 },
        ],
      },
      {
        columnSettings: [
          { fieldId: 'name', label: text('x'.repeat(257), '', ''), align: 'start', sortable: true },
        ],
      },
      {
        columnSettings: [
          { fieldId: 'name', label: text('', '', ''), align: 'unsafe', sortable: true },
        ],
      },
      {
        actionSettings: {
          edit: { label: text('', '', ''), variant: 'primary', display: 'icon', icon: 'url(evil)' },
        },
      },
      {
        actionSettings: {
          extra: { label: text('', '', ''), variant: 'primary', display: 'text', icon: 'edit' },
        },
      },
      { actionOrder: ['create', 'create', 'edit', 'delete'] },
    ]) {
      const project = fixture();
      Object.assign(project.forms[0].lists![0], change);
      expect(validateApplicationProject(project)).toBe(false);
    }
  });
});
