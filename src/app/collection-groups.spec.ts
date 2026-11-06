import { TestBed } from '@angular/core/testing';
import { CollectionCellComponent } from './collection-cell.component';
import { collectionFields, createCollectionList, pruneCollections } from './collection.model';
import { collectionValue, queryCollection, formatRecordValue } from './collection-query';
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
  beforeEach(() => {
    HTMLDialogElement.prototype.showModal = jest.fn(function (this: HTMLDialogElement): void {
      this.setAttribute('open', '');
    });
    HTMLDialogElement.prototype.close = jest.fn(function (this: HTMLDialogElement): void {
      this.removeAttribute('open');
    });
  });
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
    expect(formatRecordValue(group, values.items, 'en', ['name'])).toBe('Notebook | Pencil');
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
  it('rejects malformed or foreign group presentation', () => {
    const project = parseApplicationProject(example('saas'))!,
      form = project.forms[0];
    form.fields = [group];
    const list = { ...createCollectionList(form.fields, []), columns: ['items'] };
    form.lists = [list];
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
  it('validates features against their declared historical version without rejecting genuine 2.2 presentation', () => {
    const p = parseApplicationProject(example('saas'))!,
      f = p.forms[0];
    f.fields = [createField('text', 'rootname'), group];
    const list = {
      ...createCollectionList(f.fields, []),
      columns: ['rootname'],
      searchFields: ['rootname'],
    };
    f.lists = [list];
    const old = { ...p, schemaVersion: '2.1.0' };
    expect(parseApplicationProject(old)?.schemaVersion).toBe('2.5.0');
    const presented = { ...list, columnSettings: [{ ...setting, fieldId: 'rootname' }] };
    f.lists = [presented];
    expect(parseApplicationProject({ ...p, schemaVersion: '2.2.0' })).not.toBeNull();
    expect(parseApplicationProject({ ...p, schemaVersion: '2.1.0' })).toBeNull();
    for (const extra of [
      {
        appearance: {
          design: 'plain',
          density: 'compact',
          hover: true,
          stickyHeader: false,
          layout: 'cards',
        },
      },
      { columnSettings: [{ ...setting, fieldId: 'rootname', display: 'badge' }] },
      { columnSettings: [{ ...setting, groupFields: ['rootname'] }] },
      { columns: ['items'] },
      { searchFields: ['items/name'] },
    ]) {
      f.lists = [{ ...list, ...extra } as typeof list];
      expect(parseApplicationProject({ ...p, schemaVersion: '2.2.0' })).toBeNull();
    }
    f.lists = [list];
    expect(parseApplicationProject({ ...p, schemaVersion: '2.0.0' })).toBeNull();
    expect(p.schemaVersion).toBe('2.5.0');
  });
  it('preserves an open projected-child dialog through equivalent field and value clones', () => {
    TestBed.configureTestingModule({ imports: [CollectionCellComponent] });
    const f = TestBed.createComponent(CollectionCellComponent);
    f.componentRef.setInput('field', collectionFields([group])[1]);
    f.componentRef.setInput('values', values);
    f.componentRef.setInput('locale', 'en');
    f.componentRef.setInput('setting', { ...setting, display: 'count' });
    f.detectChanges();
    f.componentInstance.openDetails();
    f.detectChanges();
    f.componentRef.setInput('field', JSON.parse(JSON.stringify(collectionFields([group])[1])));
    f.componentRef.setInput('values', JSON.parse(JSON.stringify(values)));
    f.componentRef.setInput('setting', { ...setting, display: 'count', width: 200 });
    f.detectChanges();
    expect(f.nativeElement.querySelector('dialog').open).toBe(true);
    f.componentRef.setInput('values', { items: [{ name: 'Changed', quantity: '2' }] });
    f.detectChanges();
    expect(f.nativeElement.querySelector('dialog').open).toBe(false);
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
      if (f.componentInstance.dialogMode()) {
        f.componentInstance.openDetails();
        f.detectChanges();
      }
      expect(f.nativeElement.textContent).toContain('Notebook');
      expect(f.nativeElement.textContent).toContain('Pencil');
      expect(f.nativeElement.textContent).not.toContain('Quantity');
    }
    expect(f.nativeElement.querySelectorAll('details')).toHaveLength(2);
    f.componentRef.setInput('setting', { ...setting, display: 'count', groupFields: ['name'] });
    f.detectChanges();
    f.componentInstance.openDetails();
    f.detectChanges();
    expect(f.nativeElement.querySelector('dialog').open).toBe(true);
    f.componentRef.setInput('values', { items: [] });
    f.detectChanges();
    expect(f.componentInstance.detailsOpen()).toBe(false);
    expect(f.componentInstance.itemCount()).toBe(0);
    f.componentInstance.openDetails();
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('—');
    const dialog = f.nativeElement.querySelector('dialog');
    f.destroy();
    expect(dialog.open).toBe(false);
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
      if (f.componentInstance.dialogMode()) {
        f.componentInstance.openDetails();
        f.detectChanges();
      }
      expect(f.nativeElement.querySelector('img')).toBeNull();
      if (display === 'count')
        expect(f.nativeElement.querySelector('.collection-group-trigger').textContent.trim()).toBe(
          '2',
        );
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
    f.componentRef.setInput('setting', { ...setting, display: 'count' });
    f.detectChanges();
    expect(f.componentInstance.mode()).toBe('text');
    expect(f.nativeElement.querySelector('.collection-group-trigger')).toBeNull();
  });
  it('renders colored badges and numbered group chips with selected labels and no hidden children', () => {
    TestBed.configureTestingModule({ imports: [CollectionCellComponent] });
    const f = TestBed.createComponent(CollectionCellComponent);
    f.componentRef.setInput('field', group);
    f.componentRef.setInput('values', values);
    f.componentRef.setInput('locale', 'en');
    f.componentRef.setInput('setting', {
      ...setting,
      display: 'chips',
      groupFields: ['name'],
      badgeColor: 'violet',
    });
    f.detectChanges();
    expect(f.nativeElement.querySelectorAll('ol > li')).toHaveLength(2);
    expect(f.nativeElement.querySelectorAll('dt')[0].textContent).toBe('Item');
    expect(f.nativeElement.querySelectorAll('[data-badge-color="violet"]')).toHaveLength(2);
    expect(f.nativeElement.textContent).not.toContain('Quantity');
    f.componentRef.setInput('field', createField('text', 'name'));
    f.componentRef.setInput('values', { name: '<script>' });
    f.componentRef.setInput('setting', { ...setting, display: 'badge', badgeColor: 'red' });
    f.detectChanges();
    expect(
      f.nativeElement.querySelector('.collection-badge').getAttribute('data-badge-color'),
    ).toBe('red');
    expect(f.nativeElement.querySelector('script')).toBeNull();
  });
});
