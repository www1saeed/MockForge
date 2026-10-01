import { ProjectStore } from './project.store';
import { example, STORAGE_KEY } from './project';

describe('ProjectStore', (): void => {
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
});
