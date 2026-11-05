import { TestBed } from '@angular/core/testing';
import { CollectionCellComponent } from './collection-cell.component';
import { collectionFields, createCollectionList, pruneCollections } from './collection.model';
import { collectionValue, queryCollection } from './collection-query';
import {
  example,
  createField,
  text,
  parseApplicationProject,
  validateApplicationProject,
} from './project';
import { CollectionColumnSetting } from './collection-presentation';
const group = {
  ...createField('group', 'items'),
  label: text('Positionen', 'Items', 'اقلام'),
  group: {
    layout: 'table' as const,
    minItems: 0,
    maxItems: 8,
    fields: [
      { ...createField('text', 'name'), label: text('Artikel', 'Item', 'کالا') },
      createField('number', 'quantity'),
    ],
  },
};
const values = {
  items: [
    { name: 'Notebook', quantity: '2' },
    { name: 'Pencil', quantity: '10' },
  ],
};
const setting: CollectionColumnSetting = {
  fieldId: 'items',
  label: text('', '', ''),
  align: 'start',
  sortable: false,
};
describe('Grouped list projections', () => {
  it('uses unambiguous root/group-child references for real saved rows and localized search/sort', () => {
    const project = parseApplicationProject(example('saas'))!,
      form = project.forms[0];
    form.fields = [group];
    const list = {
      ...createCollectionList(form.fields, []),
      columns: ['items', 'items/name', 'items/quantity'],
      searchFields: ['items/name'],
      sort: { fieldId: 'items/quantity', direction: 'asc' as const },
    };
    form.lists = [list];
    expect(validateApplicationProject(project)).toBe(true);
    expect(collectionFields(form.fields).map((field) => field.id)).toEqual([
      'items',
      'items/name',
      'items/quantity',
    ]);
    expect(collectionValue(values, 'items/name')).toEqual(['Notebook', 'Pencil']);
    const records = [
      { id: 'a', values },
      { id: 'b', values: { items: [{ name: 'Other', quantity: '1' }] } },
    ];
    expect(
      queryCollection(form, list, records, { search: 'pencil', filters: new Map() }, 'en').map(
        (record) => record.id,
      ),
    ).toEqual(['a']);
    expect(
      queryCollection(form, list, records, { search: '', filters: new Map() }, 'en').map(
        (record) => record.id,
      ),
    ).toEqual(['b', 'a']);
    form.lists = [{ ...list, columns: ['items/missing'] }];
    expect(validateApplicationProject(project)).toBe(false);
  });
  it('rejects malformed or foreign group presentation while migrating 2.2 without approval', () => {
    const project = parseApplicationProject(example('saas'))!,
      form = project.forms[0];
    form.fields = [group];
    const list = { ...createCollectionList(form.fields, []), columns: ['items'] };
    form.lists = [list];
    expect(
      parseApplicationProject({
        ...project,
        schemaVersion: '2.2.0',
        review: {
          ...project.review,
          checks: [true, true, true, true, true],
          approvedAt: '2026-11-05T00:00:00Z',
        },
      })?.review.approvedAt,
    ).toBeNull();
    for (const change of [
      { display: 'iframe' },
      { groupFields: [] },
      { groupFields: ['missing'] },
      { groupFields: ['name', 'name'] },
      { groupFields: 'name' },
      { groupFields: Array(21).fill('name') },
    ]) {
      expect(
        validateApplicationProject({
          ...project,
          forms: [{ ...form, lists: [{ ...list, columnSettings: [{ ...setting, ...change }] }] }],
        }),
      ).toBe(false);
    }
    expect(
      validateApplicationProject({
        ...project,
        forms: [
          {
            ...form,
            lists: [
              {
                ...list,
                appearance: {
                  design: 'plain',
                  density: 'compact',
                  hover: true,
                  stickyHeader: false,
                  layout: 'iframe',
                },
              },
            ],
          },
        ],
      }),
    ).toBe(false);
    form.lists = [
      { ...list, columnSettings: [{ ...setting, display: 'cards', groupFields: ['name'] }] },
    ];
    expect(validateApplicationProject(project)).toBe(true);
  });
  it('prunes removed child paths/settings and safely adapts a group changed into a leaf', () => {
    const list = {
      ...createCollectionList([group], []),
      columns: ['items', 'items/name', 'items/quantity'],
      searchFields: ['items/name'],
      columnSettings: [{ ...setting, display: 'table' as const, groupFields: ['name'] }],
    };
    const shortened = {
      ...group,
      group: { ...group.group, fields: [createField('number', 'quantity')] },
    };
    const pruned = pruneCollections([shortened], [list])![0];
    expect(pruned.columns).toEqual(['items', 'items/quantity']);
    expect(pruned.searchFields).toEqual([]);
    expect(pruned.columnSettings?.[0].groupFields).toBeUndefined();
    expect(
      pruneCollections([createField('text', 'items')], [list])![0].columnSettings?.[0].display,
    ).toBe('text');
    expect(list.columnSettings[0].groupFields).toEqual(['name']);
  });
  it('renders actual rows and only selected subfields in table, card and accordion modes', () => {
    TestBed.configureTestingModule({ imports: [CollectionCellComponent] });
    const f = TestBed.createComponent(CollectionCellComponent);
    f.componentRef.setInput('field', group);
    f.componentRef.setInput('values', values);
    f.componentRef.setInput('locale', 'en');
    for (const display of ['table', 'cards', 'accordion']) {
      f.componentRef.setInput('setting', { ...setting, display, groupFields: ['name'] });
      f.detectChanges();
      expect(f.nativeElement.textContent).toContain('Notebook');
      expect(f.nativeElement.textContent).toContain('Pencil');
      expect(f.nativeElement.textContent).not.toContain('Quantity');
    }
    expect(f.nativeElement.querySelectorAll('details')).toHaveLength(2);
    f.componentRef.setInput('values', { items: [] });
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('—');
  });
  it('supports child chips, badges, text, counts and localized choice labels without HTML interpretation', () => {
    TestBed.configureTestingModule({ imports: [CollectionCellComponent] });
    const f = TestBed.createComponent(CollectionCellComponent);
    f.componentRef.setInput('field', collectionFields([group])[1]);
    f.componentRef.setInput('values', { items: [{ name: '<img src=x>' }, { name: 'Second' }] });
    f.componentRef.setInput('locale', 'en');
    for (const display of ['text', 'chips', 'badge', 'count']) {
      f.componentRef.setInput('setting', { ...setting, display });
      f.detectChanges();
      expect(f.nativeElement.querySelector('img')).toBeNull();
      if (display === 'count') expect(f.nativeElement.textContent.trim()).toBe('2');
      else expect(f.nativeElement.textContent).toContain('<img src=x>');
    }
    f.componentRef.setInput('field', {
      ...createField('select', 'state'),
      options: [text('Offen', 'Open', 'باز')],
    });
    f.componentRef.setInput('values', { state: '0' });
    f.componentRef.setInput('locale', 'fa');
    f.componentRef.setInput('setting', { ...setting, display: 'badge' });
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('باز');
  });
});
