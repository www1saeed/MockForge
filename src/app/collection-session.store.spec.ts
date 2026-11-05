import { TestBed } from '@angular/core/testing';
import { CollectionSessionStore, COLLECTION_GENERATOR } from './collection-session.store';
import { ProjectStore } from './project.store';
import { PatternCheckService } from './pattern-check.service';
import { BatchOptions, BatchResult } from './preview-data-batch';
import { createField, text, STORAGE_KEY } from './project';

describe('Session record ownership', () => {
  let data: CollectionSessionStore, project: ProjectStore;
  let resolve: (result: BatchResult) => void, options: BatchOptions;
  const result = (status: BatchResult['status'] = 'complete'): BatchResult => ({
    status,
    reason: status === 'budget' ? 'time' : null,
    records: [{ index: 0, seed: 1, values: { name: 'Generated' }, diagnostics: [] }],
    statistics: { distinctRecords: 1, duplicateRecords: 0, responses: {} },
  });
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        ProjectStore,
        CollectionSessionStore,
        PatternCheckService,
        {
          provide: COLLECTION_GENERATOR,
          useValue: (
            _project: unknown,
            _request: unknown,
            opts: BatchOptions,
          ): Promise<BatchResult> => {
            options = opts;
            return new Promise((done) => {
              resolve = done;
            });
          },
        },
      ],
    });
    project = TestBed.inject(ProjectStore);
    project.update({ fields: [createField('text', 'name')] });
    data = TestBed.inject(CollectionSessionStore);
    TestBed.tick();
  });
  it('creates, edits and deletes without touching specification, storage or approval', () => {
    project.updateReview({
      checks: [true, true, true, true, true],
      reviewer: 'Reviewer',
      approvedAt: '2026-11-05T12:00:00Z',
    });
    const stored = localStorage.getItem(STORAGE_KEY),
      specification = project.application();
    const values = { name: 'Manual' };
    expect(data.save(values, data.context())).toBe(true);
    values.name = 'Mutated';
    expect(data.records()[0].values['name']).toBe('Manual');
    const id = data.records()[0].id,
      old = data.context();
    expect(data.save({ name: 'Edited' }, old, id)).toBe(true);
    expect(data.remove([id], old)).toBe(false);
    expect(data.remove([id], data.context())).toBe(true);
    expect(project.application()).toBe(specification);
    expect(localStorage.getItem(STORAGE_KEY)).toBe(stored);
  });
  it('keeps separate form records through selection and clears on whole-project replacement', () => {
    data.save({ name: 'First' }, data.context());
    const first = project.activeFormId();
    project.addForm(text('Zweit', 'Second', 'دوم'));
    TestBed.tick();
    project.update({ fields: [createField('text', 'name')] });
    expect(data.records()).toHaveLength(0);
    data.save({ name: 'Second' }, data.context());
    project.selectForm(first);
    TestBed.tick();
    expect(data.records()[0].values['name']).toBe('First');
    project.replace(project.application());
    TestBed.tick();
    expect(data.records()).toHaveLength(0);
  });
  it('retains answers through copy edits and blocks stale-rule CRUD until clear or regeneration', () => {
    data.save({ name: 'First' }, data.context());
    project.update({ owner: 'Changed' });
    TestBed.tick();
    expect(data.stale()).toBe(false);
    const field = project.project().fields[0];
    project.update({ fields: [{ ...field, required: true }] });
    TestBed.tick();
    expect(data.stale()).toBe(true);
    expect(data.save({ name: 'New' }, data.context())).toBe(false);
    expect(data.remove([data.records()[0].id], data.context())).toBe(false);
    expect(data.clear(data.context())).toBe(true);
    expect(data.stale()).toBe(false);
    expect(data.save({ name: '' }, data.context())).toBe(false);
    expect(data.save({ name: 'New' }, data.context())).toBe(true);
  });
  it('replaces atomically only on complete generation, preserving manual answers on budget or cancellation', async () => {
    data.save({ name: 'Manual' }, data.context());
    let work = data.regenerate(data.context());
    expect(data.records()[0].values['name']).toBe('Manual');
    expect(data.save({ name: 'Blocked' }, data.context())).toBe(false);
    resolve(result('budget'));
    await work;
    expect(data.records()[0].values['name']).toBe('Manual');
    work = data.regenerate(data.context());
    data.cancel();
    expect(options.signal?.aborted).toBe(true);
    resolve(result());
    await work;
    expect(data.records()[0].values['name']).toBe('Manual');
    work = data.regenerate(data.context());
    resolve(result());
    await work;
    expect(data.records()[0].values['name']).toBe('Generated');
  });
  it('rejects late generation after a form switch, specification edit or project replacement', async () => {
    let work = data.regenerate(data.context());
    project.addForm(text('Zweit', 'Second'));
    TestBed.tick();
    resolve(result());
    await work;
    expect(data.records()).toHaveLength(0);
    work = data.regenerate(data.context());
    project.update({ description: text('Neu', 'New') });
    TestBed.tick();
    resolve(result());
    await work;
    expect(data.records()).toHaveLength(0);
    work = data.regenerate(data.context());
    project.replace(project.application());
    TestBed.tick();
    resolve(result());
    await work;
    expect(data.records()).toHaveLength(0);
  });
  it('enforces per-form and total retained data limits without partial writes', () => {
    const oversized = { name: 'x'.repeat(2000001) };
    expect(data.save(oversized, data.context())).toBe(false);
    expect(data.records()).toHaveLength(0);
    for (let index = 0; index < 500; index++)
      expect(data.save({ name: String(index) }, data.context())).toBe(true);
    expect(data.save({ name: 'One too many' }, data.context())).toBe(false);
    expect(data.records()).toHaveLength(500);
  });
});
