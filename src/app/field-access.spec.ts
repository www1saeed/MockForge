import { accessPresets } from './access-presets';
import { resolveAccess } from './application-access';
import {
  resolveFieldModes,
  projectFields,
  projectList,
  mergeFieldValues,
  fieldMode,
  lockedGroup,
} from './field-access';
import { parseApplicationProject, validateApplicationProject } from './application-project';
import { createField, example, text } from './project';
import { createCollectionList } from './collection.model';
import { queryCollection } from './collection-query';

function fixture(): NonNullable<ReturnType<typeof parseApplicationProject>> {
  const p = parseApplicationProject(example('saas'))!,
    presets = accessPresets();
  p.roles = presets.roles;
  p.users = presets.users;
  p.forms[0].fields = [
    createField('text', 'name'),
    { ...createField('text', 'secret'), required: true, minLength: 5, pattern: 'A+' },
    createField('checkbox', 'approved'),
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
      columns: ['name', 'secret', 'items', 'items/code'],
      searchFields: ['secret', 'items'],
      columnSettings: [
        {
          fieldId: 'items',
          label: text('', '', ''),
          align: 'start',
          sortable: true,
          groupFields: ['code'],
        },
      ],
    },
  ];
  p.forms[0].fieldAccess = {
    secret: { user: 'hidden' },
    approved: { user: 'readonly' },
    'items/code': { user: 'readonly' },
  };
  return p;
}
describe('Field access and predefined actors', () => {
  it('keeps fixed AND presets over hidden fields while removing reader-facing references', () => {
    const p = fixture(),
      f = p.forms[0];
    f.fieldAccess!.approved = { visitor: 'hidden' };
    f.fields.push(createField('checkbox', 'accepted'));
    f.fieldAccess!.accepted = { visitor: 'hidden' };
    const source = {
      ...f.lists![0],
      columns: ['name', 'approved'],
      filters: ['approved'],
      searchFields: ['approved'],
      sort: { fieldId: 'approved', direction: 'asc' as const },
      presets: [
        { fieldId: 'approved', value: true },
        { fieldId: 'accepted', value: true },
      ],
    };
    const fields = projectFields(f.fields, resolveFieldModes(p, 'visitor', f.id));
    const projected = projectList(source, fields);
    expect(projected.presets).toEqual(source.presets);
    expect(projected.filters).toEqual([]);
    expect(projected.columns).toEqual(['name']);
    expect(projected.searchFields).toEqual([]);
    expect(projected.sort).toBeUndefined();
    expect(
      queryCollection(
        { ...f, fields },
        projected,
        [
          { id: 'match', values: { name: 'One', approved: true, accepted: true } },
          { id: 'wrong-status', values: { name: 'Two', approved: false, accepted: true } },
          { id: 'wrong-second', values: { name: 'Three', approved: true, accepted: false } },
          { id: 'missing', values: { name: 'Four' } },
        ],
        { search: '', filters: new Map() },
        'en',
      ).map((record) => record.id),
    ).toEqual(['match']);
  });
  it('creates detached visitor/user/admin defaults, bounds users and enforces full admin rights except disabled actions', () => {
    const p = fixture(),
      f = p.forms[0],
      list = f.lists![0];
    expect(p.roles?.map((role) => role.id)).toEqual(['visitor', 'user', 'admin']);
    expect(p.users).toHaveLength(3);
    expect(resolveAccess(p, 'visitor', f.id, list.id)).toMatchObject({
      view: true,
      create: false,
      edit: false,
      delete: false,
    });
    f.access = { admin: { open: false } };
    list.access = { admin: { open: false, edit: false } };
    list.actions.delete = false;
    expect(resolveAccess(p, 'admin', f.id, list.id)).toEqual({
      open: true,
      create: true,
      view: true,
      edit: true,
      delete: false,
    });
    expect(
      Object.values(resolveFieldModes(p, 'admin', f.id)).every((mode) => mode === 'editable'),
    ).toBe(true);
    expect(validateApplicationProject(p)).toBe(true);
    const copy = accessPresets();
    copy.roles[2].rights.edit = false;
    expect(accessPresets().roles[2].rights.edit).toBe(true);
    for (const change of [
      { roles: copy.roles },
      { users: [{ ...p.users![0], roleId: 'unknown' }] },
      { users: [p.users![0], p.users![0]] },
      { users: [{ ...p.users![0], password: 'x' }] },
      { users: Array.from({ length: 21 }, (_, i) => ({ ...p.users![0], id: 'user-' + i })) },
    ])
      expect(validateApplicationProject({ ...p, ...change })).toBe(false);
    expect(parseApplicationProject({ ...p, schemaVersion: '2.4.0' })).toBeNull();
  });
  it('inherits form and group gates, ignores prototype lookups and validates only existing role/field references', () => {
    const p = fixture(),
      f = p.forms[0];
    f.fieldAccess!.items = { user: 'readonly' };
    f.fieldAccess!['items/product'] = { user: 'editable' };
    expect(resolveFieldModes(p, 'user', f.id)['items/product']).toBe('readonly');
    f.fieldDefaults = { user: 'hidden' };
    expect(
      Object.values(resolveFieldModes(p, 'user', f.id)).every((mode) => mode === 'hidden'),
    ).toBe(true);
    expect(fieldMode({}, 'constructor')).toBe('editable');
    expect(resolveFieldModes(p, 'unknown', f.id).name).toBe('hidden');
    for (const extra of [
      { fieldDefaults: { missing: 'hidden' } },
      { fieldAccess: { missing: { user: 'hidden' } } },
      { fieldAccess: { name: { user: 'invalid' } } },
      { fieldAccess: { name: { user: true } } },
    ])
      expect(validateApplicationProject({ ...p, forms: [{ ...f, ...extra }] })).toBe(false);
  });
  it('projects only visible group children into columns, details and queries without broadening empty selections', () => {
    const p = fixture(),
      f = p.forms[0];
    f.fieldAccess!['items/code'] = { user: 'hidden' };
    const modes = resolveFieldModes(p, 'user', f.id),
      fields = projectFields(f.fields, modes),
      list = projectList(f.lists![0], fields);
    expect(fields.map((field) => field.id)).not.toContain('secret');
    expect(
      fields.find((field) => field.id === 'items')!.group!.fields.map((field) => field.id),
    ).toEqual(['product']);
    expect(list.columns).toEqual(['name']);
    expect(list.searchFields).toEqual([]);
    expect(
      queryCollection(
        { ...f, fields },
        list,
        [
          {
            id: 'a',
            values: {
              name: 'Public',
              secret: 'hidden needle',
              approved: false,
              items: [{ product: 'Visible', code: 'needle' }],
            },
          },
        ],
        { search: 'needle', filters: new Map() },
        'en',
      ),
    ).toEqual([]);
    expect(f.lists![0].columns).toContain('secret');
    expect(
      lockedGroup(
        fields.find((field) => field.id === 'items')!,
        modes,
      ),
    ).toBe(true);
  });
  it('preserves protected scalar and group values, rejects row structure changes and ignores forged protected inputs', () => {
    const p = fixture(),
      f = p.forms[0],
      modes = resolveFieldModes(p, 'user', f.id);
    const old = {
      name: 'Before',
      secret: 'B',
      approved: false,
      items: [{ product: 'Old', code: 'PRIVATE' }],
    };
    const changed = mergeFieldValues(
      f.fields,
      modes,
      {
        name: 'After',
        secret: 'FORGED',
        approved: true,
        items: [{ product: 'New', code: 'FORGED' }],
      },
      old,
    );
    expect(changed).toEqual({
      ...old,
      name: 'After',
      items: [{ product: 'New', code: 'PRIVATE' }],
    });
    expect(old.items[0].product).toBe('Old');
    f.fields.find((field) => field.id === 'items')!.group!.minItems = 0;
    expect(mergeFieldValues(f.fields, modes, { name: 'After' }, old)).toBeNull();
    expect(mergeFieldValues(f.fields, modes, { name: 'After', items: [] }, old)).toBeNull();
    expect(
      mergeFieldValues(
        f.fields,
        modes,
        { name: 'After', items: [{ product: 'One' }, { product: 'Two' }] },
        old,
      ),
    ).toBeNull();
    expect(
      mergeFieldValues(f.fields, modes, {
        name: 'New',
        items: [{ product: 'Created', code: 'FORGED' }],
      }),
    ).toEqual({ name: 'New', items: [{ product: 'Created' }] });
    expect(mergeFieldValues(f.fields, modes, { unknown: 'x' }, old)).toBeNull();
    expect(
      mergeFieldValues(
        f.fields,
        modes,
        { name: 'x', items: [{ product: 'x', unknown: 'x' }] },
        old,
      ),
    ).toBeNull();
    expect(
      mergeFieldValues(
        f.fields,
        modes,
        { name: 'x', items: [] },
        { name: 'Before', secret: 'B', approved: false },
      ),
    ).toEqual({ name: 'x', secret: 'B', approved: false });
  });
  it('supports constructor IDs as protected values and migrates genuine 2.4 policies without inventing users', () => {
    const p = parseApplicationProject(example('saas'))!;
    p.roles = [
      {
        id: 'constructor',
        label: text('Role', 'Role', 'نقش'),
        rights: { open: true, create: true, view: true, edit: true, delete: true },
      },
    ];
    p.forms[0].fields = [createField('text', 'constructor'), createField('text', 'name')];
    p.forms[0].fieldAccess = JSON.parse('{"constructor":{"constructor":"readonly"}}');
    const modes = resolveFieldModes(p, 'constructor', p.forms[0].id);
    expect(modes.constructor).toBe('readonly');
    const values = mergeFieldValues(
      p.forms[0].fields,
      modes,
      { name: 'New' },
      JSON.parse('{"constructor":"kept","name":"Old"}'),
    )!;
    expect(Object.hasOwn(values, 'constructor')).toBe(true);
    expect(values['constructor']).toBe('kept');
    delete p.forms[0].fieldAccess;
    expect(parseApplicationProject({ ...p, schemaVersion: '2.4.0' })?.users).toBeUndefined();
  });
});
