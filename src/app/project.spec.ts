import {
  createField,
  example,
  handoff,
  parseProject,
  validateProject,
  validPattern,
  FIELD_TYPES,
  allFields,
} from './project';

describe('Open-source project contract', (): void => {
  test('validates optional tooltip placement and preserves it in the handoff', (): void => {
    const project = example('complex');
    const field = project.fields[0];
    for (const tooltipPlacement of ['info', 'title', 'icon'] as const) {
      field.tooltipPlacement = tooltipPlacement;
      expect(validateProject(project)).toBe(true);
      expect(parseProject(JSON.parse(JSON.stringify(project)))?.fields[0].tooltipPlacement).toBe(
        tooltipPlacement,
      );
    }
    expect(handoff(project)).toContain('Question-mark icon beside title');
    field.tooltipPlacement = 'title';
    expect(handoff(project)).toContain('Tooltip trigger: Field title');
    field.tooltipPlacement = 'info';
    expect(handoff(project)).toContain('Information icon beside title');
    for (const invalid of ['bottom', null, true, {}]) {
      expect(
        validateProject({ ...project, fields: [{ ...field, tooltipPlacement: invalid }] }),
      ).toBe(false);
    }
  });
  test('accepts optional boolean table spacing and includes it in handoff', (): void => {
    const project = example('complex');
    const group = project.fields.find((field): boolean => field.group?.layout === 'table')!.group!;
    expect(validateProject(project)).toBe(true);
    group.gapless = true;
    expect(validateProject(project)).toBe(true);
    expect(handoff(project)).toContain('None (continuous grid)');
    group.gapless = false;
    expect(handoff(project)).toContain('Comfortable');
    expect(
      validateProject(
        JSON.parse(JSON.stringify(project).replace('"gapless":false', '"gapless":"false"')),
      ),
    ).toBe(false);
  });
  test('migrates Studio 1.0 without certifying its old acknowledgement', (): void => {
    const project = example('saas');
    const old = Object.fromEntries(
      Object.entries(project).filter(([key]): boolean => !['languages', 'buttons'].includes(key)),
    );
    const legacy = {
      ...old,
      schemaVersion: '1.0.0',
      review: { ...project.review, approvedAt: '2026-09-30T12:00:00Z' },
      fields: project.fields.map((field) =>
        Object.fromEntries(
          Object.entries(field).filter(
            ([key]): boolean => !['tooltip', 'pattern', 'patternMessage'].includes(key),
          ),
        ),
      ),
    };
    const migrated = parseProject(legacy);
    expect(migrated?.schemaVersion).toBe('1.3.0');
    expect(migrated?.buttons[0].label).toEqual(project.submit);
    expect(migrated?.fields[0].tooltip).toEqual({ de: '', en: '', fa: '' });
    expect(migrated?.review.approvedAt).toBeNull();
    expect(parseProject({ ...legacy, fields: [null] })).toBeNull();
    expect(parseProject({ ...legacy, submit: 'broken' })).toBeNull();
    expect(parseProject(project)).toBe(project);
  });
  test('validates language selections, button contracts and Unicode patterns', (): void => {
    const project = example('saas');
    for (const languages of [[], ['de', 'de'], ['fr'], ['de', 'en', 'fa']])
      expect(validateProject({ ...project, languages })).toBe(false);
    expect(validateProject({ ...project, languages: ['en'] })).toBe(true);
    expect(validateProject({ ...project, languages: ['fa'] })).toBe(true);
    expect(validateProject({ ...project, languages: ['en', 'fa'] })).toBe(true);
    for (const change of [
      { action: 'network' },
      { variant: 'unknown' },
      { cssClass: '<script>' },
      { id: '../bad' },
      { label: null },
    ]) {
      expect(validateProject({ ...project, buttons: [{ ...project.buttons[0], ...change }] })).toBe(
        false,
      );
    }
    expect(validateProject({ ...project, buttons: [project.buttons[0], project.buttons[0]] })).toBe(
      false,
    );
    expect(validateProject({ ...project, buttons: null })).toBe(false);
    expect(validPattern('[A-Z]{3}')).toBe(true);
    expect(validPattern('[')).toBe(false);
    expect(validPattern('a'.repeat(501))).toBe(false);
    expect(validateProject({ ...project, fields: [{ ...project.fields[0], pattern: '[' }] })).toBe(
      false,
    );
    expect(validateProject({ ...project, fields: [{ ...project.fields[0], tooltip: null }] })).toBe(
      false,
    );
    project.fields[0].tooltip = { de: 'Wie im Ausweis', en: 'As on your ID', fa: 'مطابق مدرک' };
    project.fields[0].pattern = '[A-Z]{3}';
    project.buttons[0].note = 'Route to the sales team.';
    const brief = handoff(project);
    expect(brief).toContain('Languages: de, en');
    expect(brief).toContain('As on your ID');
    expect(brief).toContain('Pattern: [A-Z]{3}');
    expect(brief).toContain('Route to the sales team.');
  });
  test.each(['saas', 'commerce', 'agency', 'complex'] as const)(
    'validates the %s commercial example',
    (kind): void => {
      expect(validateProject(example(kind))).toBe(true);
    },
  );
  test('complex example contains every field type, both group layouts and a complete handoff', (): void => {
    const project = example('complex');
    expect(new Set(allFields(project.fields).map((field): string => field.type))).toEqual(
      new Set(FIELD_TYPES),
    );
    expect(
      project.fields
        .filter((field): boolean => field.type === 'group')
        .map((field): string => field.group!.layout),
    ).toEqual(['cards', 'table']);
    expect(validateProject(JSON.parse(JSON.stringify(project)))).toBe(true);
    const brief = handoff(project);
    expect(brief).toContain('Repeat group: cards; Min items: 1; Max items: 8');
    expect(brief).toContain('Repeat group: table; Min items: 1; Max items: 12');
    expect(brief).toContain('member-email');
    expect(brief).toContain('Pattern: [A-Z]{2}-[0-9]{4}');
    expect(brief).toContain('Label EN: Item code');
  });
  test('upgrades Studio 1.1 while resetting its old review', (): void => {
    const project = example('saas');
    const legacy = {
      ...project,
      schemaVersion: '1.1.0',
      review: {
        ...project.review,
        checks: Array(5).fill(true),
        approvedAt: '2026-10-01T00:00:00Z',
      },
    };
    const restored = parseProject(legacy);
    expect(restored?.schemaVersion).toBe('1.3.0');
    expect(restored?.fields).toEqual(project.fields);
    expect(restored?.review.approvedAt).toBeNull();
    expect(restored?.review.checks).toEqual(Array(5).fill(false));
    expect(
      parseProject({ ...legacy, fields: [{ ...project.fields[0], tooltip: undefined }] }),
    ).toBeNull();
    expect(
      parseProject({ ...legacy, fields: [createField('group', 'unsupported-old-group')] }),
    ).toBeNull();
  });
  test('upgrades schema 1.2 text recursively with empty Persian copy', (): void => {
    const withoutPersian = (value: unknown): unknown => {
      if (Array.isArray(value)) return value.map(withoutPersian);
      if (!value || typeof value !== 'object') return value;
      return Object.fromEntries(
        Object.entries(value)
          .filter(([key]): boolean => key !== 'fa')
          .map(([key, nested]): [string, unknown] => [key, withoutPersian(nested)]),
      );
    };
    const legacy = withoutPersian({
      ...example('complex'),
      schemaVersion: '1.2.0',
      review: {
        ...example('complex').review,
        checks: Array(5).fill(true),
        approvedAt: '2026-10-01T00:00:00Z',
      },
    });
    const restored = parseProject(legacy);
    expect(restored?.schemaVersion).toBe('1.3.0');
    expect(restored?.title.fa).toBe('');
    expect(restored?.fields.find((field) => field.group)?.group?.fields[0].label.fa).toBe('');
    expect(restored?.review.checks).toEqual(Array(5).fill(false));
    expect(restored?.review.approvedAt).toBeNull();
  });
  test('rejects unsafe or unbounded repeat definitions before flattening', (): void => {
    const project = example('saas');
    const group = createField('group', 'items');
    const validate = (field: unknown): boolean => validateProject({ ...project, fields: [field] });
    expect(validate(group)).toBe(true);
    for (const config of [
      undefined,
      null,
      { ...group.group, layout: 'grid' },
      { ...group.group, fields: [] },
      { ...group.group, fields: [null] },
      { ...group.group, fields: [createField('group', 'nested')] },
      { ...group.group, fields: [group.group!.fields[0], group.group!.fields[0]] },
      { ...group.group, fields: Array(21).fill(group.group!.fields[0]) },
      { ...group.group, minItems: -1 },
      { ...group.group, minItems: 2, maxItems: 1 },
      { ...group.group, maxItems: 21 },
      { ...group.group, minItems: 1.5 },
      { ...group.group, maxItems: 0 },
    ]) {
      expect(validate({ ...group, group: config })).toBe(false);
    }
    expect(validate({ ...createField('text', 'plain'), group: group.group })).toBe(false);
    expect(
      validateProject({
        ...project,
        fields: [group, { ...createField('text', 'plain'), id: group.group!.fields[0].id }],
      }),
    ).toBe(false);
    expect(
      validateProject({
        ...project,
        fields: [
          group,
          ...Array.from({ length: 99 }, (_, index) => createField('text', `root-${index}`)),
        ],
      }),
    ).toBe(false);
  });
  test('rejects incompatible versions and malformed review data', (): void => {
    expect(validateProject({ ...example('saas'), schemaVersion: '2.1.0' })).toBe(false);
    expect(validateProject({ ...example('saas'), review: { checks: [] } })).toBe(false);
    expect(validateProject(null)).toBe(false);
  });
  test('rejects duplicate field ids and impossible length constraints', (): void => {
    const project = example('saas');
    project.fields.push({ ...project.fields[0] });
    expect(validateProject(project)).toBe(false);
    project.fields.pop();
    project.fields[0].minLength = 30;
    project.fields[0].maxLength = 2;
    expect(validateProject(project)).toBe(false);
  });
  test('rejects unknown themes, broken labels and empty choices', (): void => {
    expect(validateProject({ ...example('saas'), theme: 'unknown' })).toBe(false);
    const project = example('saas');
    project.fields[0].label = { de: 'Name' } as never;
    expect(validateProject(project)).toBe(false);
    project.fields[0].label = { de: 'Name', en: 'Name', fa: 'نام' };
    project.fields[3].options = [];
    expect(validateProject(project)).toBe(false);
  });
  test('exports implementation details, all locales and review limitations', (): void => {
    const project = example('saas');
    project.fields[0].note = 'Use the preferred full name.';
    const brief = handoff(project);
    expect(brief).toContain('Use the preferred full name.');
    expect(brief).toContain('Label DE: Vollständiger Name');
    expect(brief).toContain('Label EN: Full name');
    expect(brief).toContain('Label FA:');
    expect(brief).toContain('not authenticated approval');
    expect(brief).toContain('Open questions');
  });
  test('all nine field types can be serialized', (): void => {
    const field = createField('radio', 'role');
    expect(field.options).toHaveLength(2);
    expect(field.required).toBe(false);
    const project = example('saas');
    expect(validateProject(JSON.parse(JSON.stringify(project)))).toBe(true);
  });
});
