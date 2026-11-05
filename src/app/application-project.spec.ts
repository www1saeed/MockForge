import {
  APPLICATION_LIMITS,
  ApplicationProject,
  parseApplicationProject,
  serializeApplicationProject,
  validateApplicationProject,
  projectForForm,
} from './application-project';
import { allFields, createField, example, Project } from './project';

function application(): ApplicationProject {
  return parseApplicationProject(example('complex'))!;
}

describe('Studio application contract', (): void => {
  it('projects a named form without application containers and rejects unknown root state', (): void => {
    const project = application();
    project.forms.push({ ...project.forms[0], id: 'second' });
    const selected = projectForForm(project, 'second')!;
    expect(selected.fields).toEqual(project.forms[1].fields);
    expect(selected.schemaVersion).toBe('1.3.0');
    expect('forms' in selected).toBe(false);
    expect('format' in selected).toBe(false);
    expect(projectForForm(project, 'missing')).toBeNull();
    expect(validateApplicationProject({ ...project, responses: {} })).toBe(false);
    expect(
      validateApplicationProject({ ...project, forms: [{ ...project.forms[0], session: {} }] }),
    ).toBe(false);
  });
  it('migrates every example without losing form, brief, translations or source ownership', (): void => {
    for (const kind of ['saas', 'commerce', 'agency', 'complex'] as const) {
      const legacy = example(kind);
      legacy.review = {
        reviewer: 'Reviewer',
        checks: [true, true, true, true, true],
        approvedAt: '2026-11-05T12:00:00Z',
      };
      const before = JSON.stringify(legacy);
      const migrated = parseApplicationProject(legacy)!;
      expect(validateApplicationProject(migrated)).toBe(true);
      expect(migrated.forms).toEqual([
        {
          id: 'form-1',
          title: legacy.title,
          description: legacy.description,
          submit: legacy.submit,
          columns: legacy.columns,
          fields: legacy.fields,
          buttons: legacy.buttons,
        },
      ]);
      for (const key of [
        'name',
        'owner',
        'audience',
        'goal',
        'scope',
        'theme',
        'languages',
        'decisions',
        'questions',
      ] as const)
        expect(migrated[key]).toEqual(legacy[key]);
      expect(migrated.review).toEqual({
        reviewer: 'Reviewer',
        checks: [false, false, false, false, false],
        approvedAt: null,
      });
      migrated.forms[0].fields[0].label.fa = 'Changed';
      migrated.languages.reverse();
      expect(JSON.stringify(legacy)).toBe(before);
    }
  });

  it('chains older Studio migrations and rejects foreign editions and malformed legacy data', (): void => {
    const legacy = example('saas');
    for (const schemaVersion of ['1.0.0', '1.1.0', '1.2.0']) {
      const old: unknown = JSON.parse(
        JSON.stringify({ ...legacy, schemaVersion }),
        (key, value: unknown): unknown => (key === 'fa' ? undefined : value),
      );
      const migrated = parseApplicationProject(old)!;
      expect(validateApplicationProject(migrated)).toBe(true);
      expect(migrated.forms[0].title.fa).toBe('');
      expect(migrated.review.approvedAt).toBeNull();
    }
    for (const schemaVersion of ['2.0.0', '2.6.0', '3.0.0', '9.0.0'])
      expect(parseApplicationProject({ ...legacy, schemaVersion })).toBeNull();
    expect(parseApplicationProject({ ...legacy, fields: [null] })).toBeNull();
    expect(parseApplicationProject(null)).toBeNull();
    expect(parseApplicationProject({ ...application(), format: 'mockforge' })).toBeNull();
  });

  it('round-trips every form and its menu flag with IDs scoped to each form', (): void => {
    const project = application();
    project.forms.push({ ...project.forms[0], id: 'second', menu: false });
    project.review.approvedAt = '2026-11-05T12:00:00Z';
    const restored = parseApplicationProject(JSON.parse(serializeApplicationProject(project)))!;
    expect(restored).toEqual(project);
    expect(restored).not.toBe(project);
    expect(restored.forms[1].fields).not.toBe(restored.forms[0].fields);
    restored.forms[1].fields[0].label.de = 'Other';
    expect(project.forms[1].fields[0].label.de).not.toBe('Other');
    expect(restored.forms[0].fields[0].label.de).not.toBe('Other');
    expect('fields' in restored).toBe(false);
    expect('buttons' in restored).toBe(false);
  });

  it('rejects unsafe/duplicate form IDs, incomplete forms and unsupported future configuration', (): void => {
    const project = application();
    for (const id of ['', '../form', 'Form', 'a'.repeat(65), null])
      expect(validateApplicationProject({ ...project, forms: [{ ...project.forms[0], id }] })).toBe(
        false,
      );
    expect(
      validateApplicationProject({ ...project, forms: [project.forms[0], project.forms[0]] }),
    ).toBe(false);
    for (const forms of [[], null, [null], [{}]])
      expect(validateApplicationProject({ ...project, forms })).toBe(false);
    for (const change of [
      { menu: null },
      { menu: 'yes' },
      { lists: null },
      { flow: {} },
      { access: {} },
      { fields: [null] },
      { buttons: [], columns: 3 },
      { title: { de: 'Only German' } },
    ])
      expect(
        validateApplicationProject({ ...project, forms: [{ ...project.forms[0], ...change }] }),
      ).toBe(false);
    for (const change of [
      { roles: {} },
      { fields: [] },
      { buttons: [] },
      { languages: ['de', 'en', 'fa'] },
      { name: null },
      { theme: 'unknown' },
      { review: null },
    ])
      expect(validateApplicationProject({ ...project, ...change })).toBe(false);
    project.forms[0].fields.push(project.forms[0].fields[0]);
    expect(validateApplicationProject(project)).toBe(false);
    expect((): string => serializeApplicationProject(project)).toThrow(
      'Invalid Studio application',
    );
  });

  it('enforces aggregate definition, button and form budgets in addition to per-form limits', (): void => {
    const project = application();
    const empty = { ...project.forms[0], fields: [], buttons: [] };
    project.forms = Array.from({ length: APPLICATION_LIMITS.forms }, (_, index) => ({
      ...empty,
      id: `form-${index}`,
    }));
    expect(validateApplicationProject(project)).toBe(true);
    project.forms.push({ ...empty, id: 'overflow' });
    expect(validateApplicationProject(project)).toBe(false);
    project.forms = Array.from({ length: 5 }, (_, index) => ({
      ...empty,
      id: `form-${index}`,
      fields: Array.from({ length: 100 }, (_, field) => createField('text', `field-${field}`)),
      buttons: Array.from({ length: 20 }, (_, button) => ({
        ...example('saas').buttons[0],
        id: `button-${button}`,
      })),
    }));
    expect(
      project.forms.reduce((sum, form): number => sum + allFields(form.fields).length, 0),
    ).toBe(500);
    expect(validateApplicationProject(project)).toBe(true);
    project.forms.push({ ...empty, id: 'sixth', fields: [createField('text', 'extra')] });
    expect(validateApplicationProject(project)).toBe(false);
    project.forms[5].fields = [];
    project.forms[5].buttons = [example('saas').buttons[0]];
    expect(validateApplicationProject(project)).toBe(false);
    project.forms[5].buttons = [];
    expect(validateApplicationProject(project)).toBe(true);
    project.forms[0].fields.push(createField('text', 'too-many'));
    expect(validateApplicationProject(project)).toBe(false);
  });

  it('rejects invalid group children and counts them towards the project budget', (): void => {
    const project = application();
    const group = createField('group', 'group');
    const form = { ...project.forms[0], fields: [group], buttons: [] };
    project.forms = [{ ...form, id: 'first' }];
    group.group!.fields = [createField('group', 'nested')];
    expect(validateApplicationProject(project)).toBe(false);
    group.group!.fields = [createField('text', 'child'), createField('text', 'child')];
    expect(validateApplicationProject(project)).toBe(false);
    group.group!.fields = Array.from({ length: 20 }, (_, index) =>
      createField('text', `child-${index}`),
    );
    form.fields = Array.from({ length: 4 }, (_, index) => ({
      ...group,
      id: `group-${index}`,
      group: {
        ...group.group!,
        fields: group.group!.fields.map((field) => ({ ...field, id: `${field.id}-${index}` })),
      },
    }));
    project.forms = Array.from({ length: 6 }, (_, index) => ({ ...form, id: `form-${index}` }));
    expect(validateApplicationProject(project)).toBe(false); // 6 * 84 definitions
    project.forms.pop();
    expect(validateApplicationProject(project)).toBe(true);
  });

  it('keeps the legacy factory as a compatible input and never writes storage', (): void => {
    const legacy: Project = example('saas');
    expect(legacy.schemaVersion).toBe('1.3.0');
    expect(parseApplicationProject(legacy)?.schemaVersion).toBe('2.2.0');
    expect(localStorage.length).toBe(0);
  });
});
