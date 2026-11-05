import { ProjectStore } from './project.store';
import {
  example,
  STORAGE_KEY,
  createField,
  text,
  parseApplicationProject,
  serializeApplicationProject,
} from './project';

describe('ProjectStore', (): void => {
  test('persists menu visibility as reviewed form configuration without changing selection', (): void => {
    const store = new ProjectStore();
    store.updateReview({
      checks: [true, true, true, true, true],
      reviewer: 'Owner',
      approvedAt: '2026-11-05T12:00:00Z',
    });
    const id = store.activeFormId(),
      session = store.formSession();
    expect(store.setFormMenu(false)).toBe(true);
    expect(store.application().forms[0].menu).toBe(false);
    expect(store.project().review.approvedAt).toBeNull();
    expect(store.activeFormId()).toBe(id);
    expect(store.formSession()).toBe(session);
    const restored = new ProjectStore();
    restored.restore();
    expect(restored.application().forms[0].menu).toBe(false);
  });
  beforeEach((): void => {
    localStorage.clear();
  });
  test('persists updates and restores them without sharing references', (): void => {
    const store = new ProjectStore();
    const previous = store.project();
    store.update({ owner: 'Alex' });
    expect(previous.owner).toBe('');
    const restored = new ProjectStore();
    restored.restore();
    expect(restored.project().owner).toBe('Alex');
  });
  test('invalidates every checked decision and approval after a specification edit', (): void => {
    const store = new ProjectStore();
    store.updateReview({
      checks: [true, true, true, true, true],
      reviewer: 'Alex',
      approvedAt: new Date().toISOString(),
    });
    store.update({ columns: 1 });
    expect(store.project().review.approvedAt).toBeNull();
    expect(store.project().review.checks).toEqual([false, false, false, false, false]);
  });
  test('preserves working state when saved data is malformed', (): void => {
    localStorage.setItem(STORAGE_KEY, '{bad');
    const store = new ProjectStore();
    store.restore();
    expect(store.restoreError()).toBe(true);
    expect(store.project().name).toContain('Orbit');
  });
  test('reports schema rejection and inaccessible storage without replacing the default', (): void => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: 'unknown' }));
    const store = new ProjectStore();
    store.restore();
    expect(store.restoreError()).toBe(true);
    const spy = jest.spyOn(Storage.prototype, 'getItem').mockImplementation((): never => {
      throw new Error('blocked');
    });
    const blocked = new ProjectStore();
    blocked.restore();
    expect(blocked.restoreError()).toBe(true);
    spy.mockRestore();
  });
  test('reports quota errors while keeping the working edit', (): void => {
    const spy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation((): never => {
      throw new Error('quota');
    });
    const store = new ProjectStore();
    store.update({ name: 'Working draft' });
    expect(store.storageError()).toBe(true);
    expect(store.project().name).toBe('Working draft');
    spy.mockRestore();
  });
  test('replacing a project clones the input', (): void => {
    const store = new ProjectStore();
    const project = example('commerce');
    store.replace(project);
    project.fields[0].label.de = 'changed';
    expect(store.project().fields[0].label.de).toBe('Bestellnummer');
  });

  test('stores all forms and scopes edits to selection without persisting response/session state', (): void => {
    const store = new ProjectStore();
    store.update({ owner: 'Owner' });
    const first = store.activeFormId();
    const second = store.addForm(text('Zweite', 'Second', 'دوم'))!;
    store.update({
      fields: [createField('text', 'name')],
      title: text('Geändert', 'Changed', 'ویرایش'),
    });
    expect(store.application().forms[0].fields[0].id).toBe('name');
    expect(store.application().forms[1].fields[0].id).toBe('name');
    store.updateReview({
      checks: [true, true, true, true, true],
      reviewer: 'Owner',
      approvedAt: '2026-11-05T12:00:00Z',
    });
    const saved = localStorage.getItem(STORAGE_KEY);
    const epoch = store.formSession();
    expect(store.selectForm(first)).toBe(true);
    expect(store.formSession()).toBe(epoch + 1);
    expect(store.project().title.en).not.toBe('Changed');
    expect(store.project().owner).toBe('Owner');
    expect(store.project().review.approvedAt).not.toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBe(saved);
    expect(store.selectForm('missing')).toBe(false);
    expect(store.selectForm(first)).toBe(false);
    const restored = new ProjectStore();
    restored.restore();
    expect(restored.application()).toEqual(store.application());
    expect(restored.activeFormId()).toBe(first);
    expect(restored.application().forms[1].id).toBe(second);
    expect(saved).not.toMatch(/activeFormId|formSession|clipboard/);
    expect(parseApplicationProject(JSON.parse(saved!))?.forms).toHaveLength(2);
  });

  test('migrates legacy storage without overwriting it and preserves bad bytes for recovery', (): void => {
    const legacy = example('complex');
    legacy.review.approvedAt = '2026-11-05T12:00:00Z';
    const raw = JSON.stringify(legacy);
    localStorage.setItem(STORAGE_KEY, raw);
    const store = new ProjectStore();
    store.restore();
    expect(store.application().schemaVersion).toBe('2.2.0');
    const group = store.project().fields.find((field): boolean => !!field.group)!;
    expect(store.project().review.approvedAt).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBe(raw);
    store.update({ owner: 'Migrated' });
    expect(store.project().fields.find((field): boolean => field.id === group.id)).toBe(group);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).forms).toHaveLength(1);
    const before = store.application();
    localStorage.setItem(STORAGE_KEY, '{bad');
    store.restore();
    expect(store.application()).toBe(before);
    expect(localStorage.getItem(STORAGE_KEY)).toBe('{bad');
    expect(store.replace({ schemaVersion: 'bad' } as never)).toBe(false);
  });

  test('copies and cuts across forms without ambiguous IDs, stale sources or partial writes', (): void => {
    const store = new ProjectStore();
    store.update({ fields: [createField('text', 'name')] });
    store.captureField('name', 'cut');
    const second = store.addForm(text('Zweite', 'Second'))!;
    store.update({ fields: [createField('email', 'name')] });
    const before = serializeApplicationProject(store.application());
    expect(store.pasteField()).toBeNull();
    expect(serializeApplicationProject(store.application())).toBe(before);
    store.update({ fields: [] });
    expect(store.pasteField()).toBe('name');
    expect(store.application().forms[0].fields).toHaveLength(0);
    expect(store.project().fields[0].type).toBe('text');
    expect(store.clipboard()).toBeNull();
    store.captureField('name', 'copy');
    store.selectForm('form-1');
    expect(store.pasteField()).toBe('field-1');
    expect(store.project().fields[0].id).toBe('field-1');
    store.selectForm(second);
    store.captureField('name', 'cut');
    store.selectForm('form-1');
    store.removeForm(second);
    expect(store.clipboard()).toBeNull();
  });

  test('aggregate limits reject edits and copies atomically while removing/reordering preserve selection', (): void => {
    const store = new ProjectStore();
    const project = parseApplicationProject(example('saas'))!;
    const base = project.forms[0];
    project.forms = Array.from({ length: 5 }, (_, index) => ({
      ...base,
      id: `form-${index}`,
      fields: Array.from({ length: 100 }, (_, field) => createField('text', `field-${field}`)),
    }));
    store.replace(project);
    store.captureField('field-0', 'copy');
    const before = store.application();
    expect(store.addForm(text('Extra', 'Extra'))).not.toBeNull(); // empty form is within the definition budget
    const added = store.activeFormId();
    const withEmpty = store.application();
    expect(store.update({ fields: [createField('text', 'extra')] })).toBe(false);
    expect(store.pasteField()).toBeNull();
    expect(store.application()).toBe(withEmpty);
    expect(store.mutationError()).toBe(true);
    expect(store.duplicateForm(before.forms[0].id, text('Extra', 'Extra'))).toBeNull();
    expect(store.removeForm('missing')).toBe(false);
    expect(store.moveForm('missing', -1)).toBe(false);
    expect(store.moveForm(added, -1)).toBe(true);
    expect(store.activeFormId()).toBe(added);
    expect(store.removeForm(added)).toBe(true);
    expect(store.activeFormId()).toBe(store.application().forms[0].id);
  });
});
