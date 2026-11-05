import { APPLICATION_EXAMPLES, applicationExample } from './application-examples';
import { validateApplicationProject } from './application-project';
import { allFields, LOCALES } from './project.model';

describe('Current application example catalogue', () => {
  it('provides three complete progressive projects with usable scoped lists and translations', () => {
    const projects = APPLICATION_EXAMPLES.map((example) => applicationExample(example.id));
    expect(projects.map((project) => project.forms.length)).toEqual([1, 1, 2]);
    expect(
      projects.map((project) => project.forms.flatMap((form) => form.lists ?? []).length),
    ).toEqual([1, 3, 7]);
    expect(projects[0].forms[0].fields).toHaveLength(3);
    expect(projects[1].forms[0].fields.find((field) => field.group)?.group).toMatchObject({
      layout: 'table',
      minItems: 1,
      maxItems: 8,
      gapless: true,
    });
    for (const project of projects) {
      expect(validateApplicationProject(project)).toBe(true);
      expect(project.review.approvedAt).toBeNull();
      expect(project.review.reviewer).toBe('');
      for (const form of project.forms) {
        for (const locale of LOCALES) {
          expect(form.title[locale].trim()).not.toBe('');
          for (const field of allFields(form.fields)) {
            expect(field.label[locale].trim()).not.toBe('');
            for (const option of field.options) expect(option[locale].trim()).not.toBe('');
          }
          for (const list of form.lists ?? []) expect(list.title[locale].trim()).not.toBe('');
        }
        expect(form.entries?.count).toBeGreaterThan(0);
      }
    }
  });
  it('detaches nested form, list and repeated definitions from subsequent loads and downloads', () => {
    const first = applicationExample('workspace');
    first.forms[1].title.de = 'Edited';
    first.forms[0].lists![0].columns.splice(0);
    first.forms[0].fields.find((field) => field.group)!.group!.fields[0].label.de = 'Changed child';
    expect(applicationExample('workspace')).toEqual(APPLICATION_EXAMPLES[2].value);
  });
  it('prepares business responsibilities and read-only views without inventing role contracts', () => {
    const project = applicationExample('workspace');
    for (const form of project.forms) {
      const readOnly = form.lists!.find(
        (list) => !list.actions.create && !list.actions.edit && !list.actions.delete,
      )!;
      expect(readOnly.actions.view).toBe(true);
      expect(readOnly.selectable).toBe(false);
      expect(form).not.toHaveProperty('access');
    }
    expect(project).not.toHaveProperty('roles');
    expect(project.decisions).toContain('not role permissions');
    expect(project.questions).toContain('server authorization');
    const queue = project.forms[0].lists!.find((list) => list.id === 'review-queue')!;
    expect(queue.presets).toHaveLength(2);
    expect(queue.actions.delete).toBe(false);
  });
});
