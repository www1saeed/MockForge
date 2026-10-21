import { ProjectStore } from './project.store';
import { allFields, createField } from './project.model';
import { validateProject } from './project.validation';

describe('Session field clipboard', (): void => {
  beforeEach((): void => localStorage.clear());
  function setup(): ProjectStore {
    const store = new ProjectStore();
    const group = createField('group', 'team');
    group.group!.fields.push(createField('email', 'email'));
    store.update({ fields: [createField('text', 'name'), group] });
    return store;
  }

  it('copies complete groups repeatedly with fresh globally unique IDs and detached translations', (): void => {
    const store = setup();
    store.captureField('team', 'copy');
    const before = store.project();
    const id = store.pasteField()!;
    store.pasteField();
    const fields = allFields(store.project().fields);
    expect(new Set(fields.map((field): string => field.id)).size).toBe(fields.length);
    expect(
      store.project().fields.find((field): boolean => field.id === id)?.group?.fields,
    ).toHaveLength(2);
    expect(store.project().fields[2].label).not.toBe(before.fields[1].label);
    expect(before.fields).toHaveLength(2);
    expect(validateProject(store.project())).toBe(true);
    expect(store.clipboard()?.mode).toBe('copy');
  });

  it('defers cuts, moves the latest source atomically and invalidates review only on paste', (): void => {
    const store = setup();
    store.updateReview({
      checks: [true, true, true, true, true],
      reviewer: 'Owner',
      approvedAt: '2026-10-21T12:00:00Z',
    });
    const before = store.project();
    store.captureField('name', 'cut');
    expect(store.project()).toBe(before);
    store.update({
      fields: store
        .project()
        .fields.map((field) => (field.id === 'name' ? { ...field, note: 'latest' } : field)),
    });
    expect(store.pasteField('team')).toBe('name');
    expect(store.project().fields).toHaveLength(1);
    expect(store.project().fields[0].group!.fields.at(-1)?.note).toBe('latest');
    expect(store.project().review.checks).toEqual([false, false, false, false, false]);
    expect(store.clipboard()).toBeNull();
    expect(validateProject(store.project())).toBe(true);
  });

  it('rejects nested groups, full destinations and removing the last child without changing state', (): void => {
    const store = setup();
    store.captureField('team', 'cut');
    const before = store.project();
    expect(store.pasteField('team')).toBeNull();
    expect(store.project()).toBe(before);
    store.captureField('name', 'copy');
    const group = store.project().fields[1];
    store.update({
      fields: [
        {
          ...group,
          group: {
            ...group.group!,
            fields: Array.from({ length: 20 }, (_, i) => createField('text', `child-${i}`)),
          },
        },
      ],
    });
    expect(store.pasteField('team')).toBeNull();
    store.update({ fields: [createField('group', 'solo')] });
    store.captureField('solo-item', 'cut');
    expect(store.pasteField()).toBeNull();
    expect(store.pasteField('solo')).toBe('solo-item');
  });

  it('enforces the total definition limit and rejects missing destinations', (): void => {
    const store = setup();
    store.captureField('team', 'copy');
    store.update({
      fields: Array.from({ length: 99 }, (_, i) => createField('text', `field-${i}`)),
    });
    expect(store.pasteField()).toBeNull();
    expect(store.pasteField('missing')).toBeNull();
    expect(store.project().fields).toHaveLength(99);
  });

  it('clears pending cuts on source deletion and all clipboard state on replacement or restore', (): void => {
    const store = setup();
    store.captureField('name', 'cut');
    store.update({ fields: [] });
    expect(store.clipboard()).toBeNull();
    expect(store.pasteField()).toBeNull();
    const next = setup().project();
    store.replace(next);
    store.captureField('team', 'copy');
    store.restore();
    expect(store.clipboard()).toBeNull();
    store.captureField('team', 'cut');
    store.clearClipboard();
    expect(store.project().fields).toHaveLength(2);
    store.captureField('team', 'copy');
    store.replace(next);
    expect(store.clipboard()).toBeNull();
    expect(JSON.stringify(store.project())).not.toContain('clipboard');
  });
});
