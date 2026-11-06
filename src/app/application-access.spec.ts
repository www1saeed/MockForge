import { TestBed } from '@angular/core/testing';
import { ALLOW_RIGHTS, ACCESS_RIGHTS, ApplicationRole, resolveAccess } from './application-access';
import {
  parseApplicationProject,
  validateApplicationProject,
  serializeApplicationProject,
} from './application-project';
import { example, text, createField } from './project';
import { createCollectionList } from './collection.model';
import { ApplicationAccessSession, COLLECTION_ACCESS } from './application-access.session';
import { CollectionSessionStore, COLLECTION_GENERATOR } from './collection-session.store';
import { CollectionSessionRegistry } from './collection-session.registry';
import { ProjectStore } from './project.store';
import { PatternCheckService } from './pattern-check.service';
import { BatchResult } from './preview-data-batch';
import { handoff } from './project.handoff';

const roles: ApplicationRole[] = [
  { id: 'editor', label: text('Bearbeitung', 'Editor', 'ویرایشگر'), rights: { ...ALLOW_RIGHTS } },
  {
    id: 'reader',
    label: text('Lesend', 'Reader', 'خواننده'),
    rights: { open: true, view: true, create: false, edit: false, delete: false },
  },
];
function fixture(): ReturnType<typeof parseApplicationProject> & {} {
  const p = parseApplicationProject(example('saas'))!;
  p.forms[0].fields = [createField('text', 'name')];
  p.forms[0].lists = [createCollectionList(p.forms[0].fields, [])];
  p.roles = JSON.parse(JSON.stringify(roles)) as ApplicationRole[];
  return p;
}
describe('Simulated access contract and resolver', () => {
  it('inherits overrides and gates child access and disabled actions while preserving legacy unrestricted behavior', () => {
    const p = fixture(),
      f = p.forms[0],
      l = f.lists![0];
    expect(resolveAccess(p, 'reader', f.id, l.id)).toEqual(roles[1].rights);
    f.access = { reader: { edit: true } };
    l.access = { reader: { create: true, edit: false } };
    expect(resolveAccess(p, 'reader', f.id, l.id)).toMatchObject({
      create: true,
      edit: false,
      delete: false,
    });
    l.actions.create = false;
    expect(resolveAccess(p, 'reader', f.id, l.id).create).toBe(false);
    f.access.reader.open = false;
    l.access.reader.open = true;
    expect(ACCESS_RIGHTS.every((key) => !resolveAccess(p, 'reader', f.id, l.id)[key])).toBe(true);
    expect(resolveAccess(p, 'missing', f.id).open).toBe(false);
    expect(resolveAccess(p, 'editor', 'missing').open).toBe(false);
    delete p.roles;
    delete f.access;
    delete l.access;
    expect(resolveAccess(p, null, f.id)).toEqual(ALLOW_RIGHTS);
  });
  it('rejects malformed roles, unknown policy refs, excessive roles and future features relabelled as old versions', () => {
    const p = fixture();
    expect(validateApplicationProject(p)).toBe(true);
    for (const change of [
      { roles: [roles[0], roles[0]] },
      { roles: [{ ...roles[0], rights: { open: true } }] },
      { roles: [{ ...roles[0], id: '../role' }] },
      { roles: [{ ...roles[0], label: { de: 'Reader', en: 'Reader' } }] },
      { roles: [{ ...roles[0], secret: 'x' }] },
      { roles: Array.from({ length: 11 }, (_, i) => ({ ...roles[0], id: 'r' + i })) },
    ])
      expect(validateApplicationProject({ ...p, ...change })).toBe(false);
    p.forms[0].access = { missing: { open: false } };
    expect(validateApplicationProject(p)).toBe(false);
    delete p.forms[0].access;
    for (const schemaVersion of ['2.0.0', '2.1.0', '2.2.0', '2.3.0'])
      expect(parseApplicationProject({ ...p, schemaVersion })).toBeNull();
    delete p.roles;
    expect(parseApplicationProject({ ...p, schemaVersion: '2.3.0' })?.roles).toBeUndefined();
  });
  it('round-trips role policies and finite badge colors without answers and includes rights in handoff', () => {
    const p = fixture(),
      l = p.forms[0].lists![0];
    l.access = { reader: { open: false } };
    l.columnSettings = [
      {
        fieldId: 'name',
        label: text('', '', ''),
        align: 'start',
        sortable: true,
        display: 'badge',
        badgeColor: 'violet',
      },
    ];
    expect(parseApplicationProject(JSON.parse(serializeApplicationProject(p)))).toEqual(p);
    expect(handoff(p)).toContain('List access overrides:');
    expect(handoff(p)).toContain('reader');
    expect(parseApplicationProject({ ...p, schemaVersion: '2.3.0' })).toBeNull();
    expect(
      validateApplicationProject({
        ...p,
        forms: [
          {
            ...p.forms[0],
            lists: [{ ...l, columnSettings: [{ ...l.columnSettings[0], badgeColor: 'url(x)' }] }],
          },
        ],
      }),
    ).toBe(false);
  });
});

describe('Role scoped session writes', () => {
  function setup(): {
    store: ProjectStore;
    access: ApplicationAccessSession;
    data: CollectionSessionStore;
    generate: jest.Mock;
    complete: (value: BatchResult) => void;
  } {
    let finish!: (value: BatchResult) => void;
    const generate = jest.fn(
      () =>
        new Promise<BatchResult>((resolve) => {
          finish = resolve;
        }),
    );
    TestBed.configureTestingModule({
      providers: [
        ProjectStore,
        ApplicationAccessSession,
        CollectionSessionStore,
        CollectionSessionRegistry,
        PatternCheckService,
        { provide: COLLECTION_ACCESS, useExisting: ApplicationAccessSession },
        { provide: COLLECTION_GENERATOR, useValue: generate },
      ],
    });
    const store = TestBed.inject(ProjectStore);
    store.replace(fixture());
    const access = TestBed.inject(ApplicationAccessSession),
      data = TestBed.inject(CollectionSessionStore);
    TestBed.tick();
    return { store, access, data, generate, complete: (value) => finish(value) };
  }
  it('rejects create/edit/delete/clear/regenerate for a reader even when called directly', async () => {
    const { access, data, generate } = setup(),
      list = data.form().lists![0].id;
    expect(data.save({ name: 'Before' }, data.context(list))).toBe(true);
    const record = data.records()[0],
      old = data.context(list);
    access.select('reader');
    TestBed.tick();
    expect(data.current(old)).toBe(false);
    const context = data.context(list);
    expect(data.save({ name: 'New' }, context)).toBe(false);
    expect(data.save({ name: 'Changed' }, context, record.id)).toBe(false);
    expect(data.remove([record.id], context)).toBe(false);
    expect(data.clear(context)).toBe(false);
    await data.regenerate(context, ['de'], 1, true);
    expect(generate).not.toHaveBeenCalled();
    expect(data.records()[0]).toBe(record);
    access.select('editor');
    expect(data.current(old)).toBe(false);
    const live = data.context(list);
    access.select('editor');
    expect(data.current(live)).toBe(true);
  });
  it('retires in-flight generation on role/policy changes and keeps transient roles out of persisted configuration', async () => {
    const { store, access, data, complete } = setup(),
      list = data.form().lists![0].id;
    const original = JSON.stringify(store.application());
    const pending = data.regenerate(data.context(list), ['de'], 1);
    access.select('reader');
    TestBed.tick();
    expect(data.busy()).toBe(false);
    complete({
      status: 'complete',
      reason: null,
      records: [{ index: 0, seed: 1, values: { name: 'Late' }, diagnostics: [] }],
      statistics: { distinctRecords: 1, duplicateRecords: 0, responses: {} },
    });
    await pending;
    expect(data.records()).toHaveLength(0);
    expect(JSON.stringify(store.application())).toBe(original);
    const before = data.context(list);
    store.configureAccess(
      roles,
      store.application().forms.map((form) => ({ ...form, access: { reader: { open: false } } })),
    );
    expect(data.current(before)).toBe(false);
    expect(data.allowed('open', list)).toBe(false);
    store.replace(fixture());
    TestBed.tick();
    expect(access.roleId()).toBe('editor');
  });
});
