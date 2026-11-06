import { TestBed } from '@angular/core/testing';
import { ProjectStore } from './project.store';
import { ApplicationAccessSession, COLLECTION_ACCESS } from './application-access.session';
import { CollectionSessionStore, COLLECTION_GENERATOR } from './collection-session.store';
import { CollectionSessionRegistry } from './collection-session.registry';
import { PatternCheckService } from './pattern-check.service';
import { parseApplicationProject } from './application-project';
import { createField, example } from './project';
import { accessPresets } from './access-presets';
import { createCollectionList } from './collection.model';
import { BatchResult } from './preview-data-batch';
import { FormPreviewComponent } from './form-preview.component';
import { AccessEditorComponent } from './access-editor.component';
import { FeedbackService } from './feedback.service';

function fixture(): NonNullable<ReturnType<typeof parseApplicationProject>> {
  const p = parseApplicationProject(example('saas'))!,
    presets = accessPresets();
  p.roles = presets.roles;
  p.users = presets.users;
  p.forms[0].fields = [
    createField('text', 'name'),
    { ...createField('text', 'secret'), required: true, pattern: 'A+' },
    {
      ...createField('group', 'items'),
      group: {
        layout: 'table',
        minItems: 1,
        maxItems: 3,
        fields: [
          createField('text', 'product'),
          { ...createField('text', 'code'), required: true },
        ],
      },
    },
  ];
  p.forms[0].lists = [
    {
      ...createCollectionList(p.forms[0].fields, []),
      columns: ['name', 'secret', 'items'],
      searchFields: ['secret', 'items'],
    },
  ];
  p.forms[0].fieldAccess = { secret: { user: 'hidden' }, 'items/code': { user: 'readonly' } };
  return p;
}
describe('Authorized record and actor sessions', () => {
  function setup(): {
    project: ProjectStore;
    access: ApplicationAccessSession;
    data: CollectionSessionStore;
  } {
    TestBed.configureTestingModule({
      providers: [
        ProjectStore,
        ApplicationAccessSession,
        CollectionSessionStore,
        CollectionSessionRegistry,
        PatternCheckService,
        { provide: COLLECTION_ACCESS, useExisting: ApplicationAccessSession },
      ],
    });
    const project = TestBed.inject(ProjectStore);
    project.replace(fixture());
    const access = TestBed.inject(ApplicationAccessSession),
      data = TestBed.inject(CollectionSessionStore);
    TestBed.tick();
    return { project, access, data };
  }
  it('enforces field edits at the store, keeps protected values and retires contexts when same-role users change', () => {
    const { project, access, data } = setup();
    expect(access.userId()).toBe('visitor-demo');
    expect(data.allowed('create')).toBe(false);
    access.selectUser('admin-demo');
    TestBed.tick();
    expect(
      data.save(
        { name: 'Before', secret: 'A', items: [{ product: 'Old', code: 'SECRET' }] },
        data.context('list-1'),
      ),
    ).toBe(true);
    const record = data.records()[0];
    access.selectUser('user-demo');
    TestBed.tick();
    expect(data.renderForm().fields.some((field) => field.id === 'secret')).toBe(false);
    expect(data.displayLists()[0].searchFields).not.toContain('secret');
    expect(
      data.save(
        { name: 'Changed', secret: 'FORGED', items: [{ product: 'New', code: 'FORGED' }] },
        data.context('list-1'),
        record.id,
      ),
    ).toBe(true);
    expect(data.records()[0].values).toEqual({
      name: 'Changed',
      secret: 'A',
      items: [{ product: 'New', code: 'SECRET' }],
    });
    expect(data.save({ name: 'No', items: [] }, data.context('list-1'), record.id)).toBe(false);
    project.configureAccess(project.application().roles!, undefined, [
      ...project.application().users!,
      { id: 'other-user', name: { de: 'Andere', en: 'Other', fa: 'دیگر' }, roleId: 'user' },
    ]);
    TestBed.tick();
    const before = data.context('list-1');
    access.selectUser('other-user');
    access.selectUser('user-demo');
    expect(data.current(before)).toBe(false);
    const stored = JSON.stringify(project.application());
    access.select('admin');
    expect(access.userId()).toBeNull();
    expect(JSON.stringify(project.application())).toBe(stored);
  });
  it('generates only editable fields and never installs a late result after an actor or field-policy change', async () => {
    let finish!: (value: BatchResult) => void;
    const generate = jest.fn<Promise<BatchResult>, [unknown, unknown]>(
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
    access.selectUser('user-demo');
    TestBed.tick();
    const pending = data.regenerate(data.context('list-1'), ['de'], 1, true);
    expect(generate.mock.calls[0][0]).toMatchObject({
      fields: [{ id: 'name' }, { id: 'items', group: { fields: [{ id: 'product' }] } }],
    });
    access.selectUser('admin-demo');
    TestBed.tick();
    finish({
      status: 'complete',
      reason: null,
      records: [
        {
          index: 0,
          seed: 1,
          values: { name: 'Late', items: [{ product: 'Late' }] },
          diagnostics: [],
        },
      ],
      statistics: { distinctRecords: 1, duplicateRecords: 0, responses: {} },
    });
    await pending;
    expect(data.records()).toEqual([]);
  });
});
describe('Native field protection and preset authoring', () => {
  beforeEach(() => {
    HTMLDialogElement.prototype.close = jest.fn();
  });
  it('disables readonly controls and row mutations while retaining saved values through test filling', async () => {
    TestBed.configureTestingModule({ imports: [FormPreviewComponent] });
    const f = TestBed.createComponent(FormPreviewComponent),
      p = fixture(),
      group = p.forms[0].fields[2];
    f.componentRef.setInput('project', {
      ...example('saas'),
      fields: [
        createField('text', 'name'),
        { ...createField('text', 'locked'), required: false, pattern: '' },
        group,
      ],
    });
    f.componentRef.setInput('fieldModes', { locked: 'readonly', 'items/code': 'readonly' });
    f.componentRef.setInput('recordMode', true);
    f.componentRef.setInput('initialValues', {
      name: 'Before',
      locked: 'KEEP',
      items: [{ product: 'One', code: 'PRIVATE' }],
    });
    f.detectChanges();
    await f.whenStable();
    const form = f.nativeElement.querySelector('form') as HTMLFormElement;
    expect(form.querySelector<HTMLInputElement>('#preview-locked')!.disabled).toBe(true);
    expect(form.querySelector<HTMLInputElement>('#preview-locked')!.value).toBe('KEEP');
    const repeated = f.componentInstance.groups()[0],
      before = repeated.rows();
    f.componentRef.setInput('project', {
      ...f.componentInstance.project(),
      owner: 'Copy-only edit',
    });
    f.detectChanges();
    expect(repeated.rows()).toBe(before);
    repeated.addEntry();
    repeated.removeEntry(before[0].id);
    expect(repeated.resizeForTestData(2, true)).toBe(false);
    expect(repeated.rows()).toBe(before);
    expect(TestBed.inject(FeedbackService).deletion()).toBeNull();
    f.componentInstance.replaceResponses.set(true);
    await f.componentInstance.fillResponses(form);
    expect(form.querySelector<HTMLInputElement>('#preview-locked')!.value).toBe('KEEP');
    expect(form.querySelector<HTMLInputElement>('[data-field-id="code"]')!.value).toBe('PRIVATE');
  });
  it('installs presets once, prevents admin downgrades, authors field policies and cleans assigned users on role removal', () => {
    TestBed.configureTestingModule({ providers: [ProjectStore] });
    const f = TestBed.createComponent(AccessEditorComponent),
      c = f.componentInstance;
    c.installPresets();
    f.detectChanges();
    const before = c.store.application();
    c.installPresets();
    expect(c.store.application()).toBe(before);
    expect(c.users()).toHaveLength(3);
    c.selected.set('admin');
    c.defaultRight('edit', false);
    c.defaultMode('hidden');
    c.fieldRule(c.store.activeFormId(), 'name', 'hidden');
    expect(c.role()?.rights.edit).toBe(true);
    expect(c.role()?.fieldMode).toBe('editable');
    c.selected.set('user');
    c.fieldRule(c.store.activeFormId(), 'name', 'readonly');
    expect(c.fieldEffective(c.store.activeFormId(), 'name')).toBe('readonly');
    c.addUser();
    expect(c.users()).toHaveLength(4);
    c.userName('demo-1', 'de', 'Bearbeitung');
    c.remove();
    TestBed.inject(FeedbackService).confirmDelete();
    expect(c.users().some((user) => user.roleId === 'user')).toBe(false);
    expect(c.roles().some((role) => role.id === 'admin')).toBe(true);
  });
});
