import { TestBed } from '@angular/core/testing';
import { CollectionWorkspaceComponent } from './collection-workspace.component';
import { CollectionSessionStore, COLLECTION_GENERATOR } from './collection-session.store';
import { ProjectStore } from './project.store';
import { CollectionSessionRegistry } from './collection-session.registry';
import { PatternCheckService } from './pattern-check.service';
import { FeedbackService } from './feedback.service';
import { createField, handoff, text, validateApplicationProject } from './project';

describe('Collection workspace boundaries', () => {
  it('toggles the effective default direction, then uses reader overrides independently per column', () => {
    const c = setup();
    c.defaultSort('name');
    c.order('name');
    expect(c.sort()).toEqual({ fieldId: 'name', direction: 'desc' });
    c.order('name');
    expect(c.sort()?.direction).toBe('asc');
    c.sort.set(undefined);
    c.patch({ sort: { fieldId: 'name', direction: 'desc' } });
    c.order('name');
    expect(c.sort()?.direction).toBe('asc');
    c.order('state');
    expect(c.sort()).toEqual({ fieldId: 'state', direction: 'asc' });
    c.order('state');
    expect(c.sort()?.direction).toBe('desc');
  });
  function setup(): CollectionWorkspaceComponent {
    TestBed.configureTestingModule({
      imports: [CollectionWorkspaceComponent],
      providers: [
        ProjectStore,
        CollectionSessionRegistry,
        CollectionSessionStore,
        PatternCheckService,
        {
          provide: COLLECTION_GENERATOR,
          useValue: jest
            .fn()
            .mockResolvedValue({ status: 'complete', records: [], statistics: {} }),
        },
      ],
    });
    const project = TestBed.inject(ProjectStore);
    project.update({
      fields: [
        createField('text', 'name'),
        { ...createField('select', 'state'), options: [text('Offen', 'Open', 'باز')] },
        createField('checkbox', 'flag'),
      ],
    });
    const component = TestBed.runInInjectionContext(() => new CollectionWorkspaceComponent());
    // Dialog rendering/focus is verified in Chromium; callbacks are exercised here independently.
    component.dialog = {
      nativeElement: { close: jest.fn(), showModal: jest.fn() } as unknown as HTMLDialogElement,
    };
    TestBed.tick();
    component.add();
    TestBed.tick();
    return component;
  }
  it('keeps list configuration separate from answers and prunes obsolete references on field edits', () => {
    const c = setup();
    c.title('Cases', 'en');
    c.defaultSort('name');
    c.toggle('columns', 'name', false);
    expect(c.list()?.sort).toBeUndefined();
    c.toggle('columns', 'name', true);
    c.toggle('searchFields', 'name', false);
    c.toggle('filters', 'state', true);
    c.preset(c.field('state'), '0');
    c.preset(c.field('flag'), 'false');
    c.patch({ pageSize: 1 });
    c.entries('count', 3);
    c.entries('seed', 7);
    expect(c.store.application().forms[0].entries).toEqual({ count: 3, seed: 7 });
    expect(c.presetValue('flag')).toBe('false');
    c.duplicate();
    c.move(-1);
    expect(c.lists()[0].id).toBe('list-2');
    expect(c.lists()[1].title.en).toBe('Cases');
    expect(handoff(c.store.application())).toContain('Fixed filters (AND)');
    c.store.update({ fields: [createField('text', 'state')] });
    TestBed.tick();
    expect(c.list()?.presets).toEqual([]);
    expect(c.list()?.filters).toEqual([]);
    expect(c.list()?.columns).toEqual(['state']);
    expect(validateApplicationProject(c.store.application())).toBe(true);
    c.store.updateCollections(c.lists().map((list) => ({ ...list, columns: ['missing'] })));
    expect(c.store.mutationError()).toBe(true);
  });
  it('guards delayed delete/list callbacks against selection, revision and active-form changes', () => {
    const c = setup(),
      feedback = TestBed.inject(FeedbackService);
    c.data.save({ name: 'Alice', state: '0', flag: false }, c.data.context());
    TestBed.tick();
    const record = c.data.records()[0];
    c.remove([record.id]);
    c.data.save({ name: 'Bob', state: '0', flag: true }, c.data.context());
    feedback.confirmDelete();
    expect(c.data.records()).toHaveLength(2);
    c.remove([record.id]);
    c.action('delete', false);
    feedback.confirmDelete();
    expect(c.data.records()).toHaveLength(2);
    c.action('delete', true);
    c.removeList();
    c.duplicate();
    feedback.confirmDelete();
    expect(c.lists()).toHaveLength(2);
    c.removeList();
    c.store.addForm(text('Zweit', 'Second'));
    feedback.confirmDelete();
    expect(c.store.application().forms[0].lists).toHaveLength(2);
    c.store.selectForm('form-1');
    TestBed.tick();
    c.removeList();
    feedback.confirmDelete();
    expect(c.lists()).toHaveLength(1);
    expect(c.data.records()).toHaveLength(2);
    c.remove([record.id]);
    feedback.confirmDelete();
    expect(c.data.records()).toHaveLength(1);
    c.clear();
    feedback.confirmDelete();
    expect(c.data.records()).toHaveLength(0);
  });
  it('rechecks configured actions at save time and closes obsolete editors', () => {
    const c = setup();
    c.open('new');
    expect(c.editing()?.mode).toBe('new');
    c.save({ name: 'Alice', state: '0', flag: false });
    expect(c.editing()).toBeNull();
    const record = c.data.records()[0];
    c.open('edit', record);
    c.save({ name: 'Bob', state: '0', flag: true });
    expect(c.value(c.data.records()[0], c.field('name'))).toBe('Bob');
    c.open('view', record);
    c.save({ name: 'Ignored', state: '0', flag: true });
    expect(c.value(c.data.records()[0], c.field('name'))).toBe('Bob');
    c.close();
    c.open('new');
    c.action('create', false);
    c.save({ name: 'Blocked', state: '0', flag: true });
    expect(c.data.records()).toHaveLength(1);
    expect(
      TestBed.inject(FeedbackService)
        .toasts()
        .some((t) => t.key === 'listSaveFailed'),
    ).toBe(true);
    TestBed.tick();
    expect(c.editing()).toBeNull();
    c.open('new');
    expect(c.editing()).toBeNull();
    c.open('edit', c.data.records()[0]);
    c.store.selectForm(c.store.addForm(text('Zweit', 'Second'))!);
    TestBed.tick();
    expect(c.editing()).toBeNull();
  });
  it('pages one query, retains page selection, and clears selection when filters change', () => {
    const c = setup();
    c.patch({ pageSize: 1, filters: ['flag'] });
    for (const name of ['Alice', 'Bob', 'Clara'])
      c.data.save({ name, state: '0', flag: name !== 'Bob' }, c.data.context());
    TestBed.tick();
    c.selectPage(true);
    expect(c.selectedIds()).toHaveLength(1);
    c.page.set(1);
    c.selectPage(true);
    expect(c.selectedIds()).toHaveLength(2);
    c.selectAll();
    expect(c.selectedIds()).toHaveLength(3);
    c.selectPage(false);
    expect(c.selectedIds()).toHaveLength(2);
    c.filter(c.field('flag'), 'false');
    expect(c.selectedIds()).toHaveLength(0);
    expect(c.matches()).toHaveLength(1);
    c.filter(c.field('flag'), '');
    c.searchFor('Clara');
    expect(c.matches()).toHaveLength(1);
    c.searchFor('');
    c.order('name');
    c.order('name');
    expect(c.matches()[0].values['name']).toBe('Clara');
    c.page.set(99);
    expect(c.currentPage()).toBe(2);
  });
  it('requires confirmation to regenerate existing records and clears pending callbacks on disposal', async () => {
    const c = setup(),
      feedback = TestBed.inject(FeedbackService);
    c.regenerate();
    await Promise.resolve();
    expect(c.data.records()).toHaveLength(0);
    c.data.save({ name: 'Alice', state: '0', flag: false }, c.data.context());
    c.regenerate();
    expect(c.data.records()).toHaveLength(1);
    feedback.confirmDelete();
    await Promise.resolve();
    expect(c.data.records()).toHaveLength(0);
    c.removeList();
    c.ngOnDestroy();
    expect(feedback.deletion()).toBeNull();
  });
});
