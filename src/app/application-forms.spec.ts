import {
  addApplicationForm,
  allocateFormId,
  createApplicationForm,
  duplicateApplicationForm,
  moveApplicationForm,
  removeApplicationForm,
  updateApplicationForm,
} from './application-forms';
import { ApplicationProject, parseApplicationProject } from './application-project';
import { createField, example, text } from './project';

function approved(): ApplicationProject {
  const project = parseApplicationProject(example('complex'))!;
  project.review = {
    reviewer: 'Reviewer',
    checks: [true, true, true, true, true],
    approvedAt: '2026-11-05T12:00:00Z',
  };
  return project;
}

describe('Immutable application form operations', (): void => {
  it('adds an owned draft, preserving the source and invalidating project review', (): void => {
    const project = approved();
    const before = JSON.stringify(project);
    const title = text('Antrag', 'Application', 'درخواست');
    const form = createApplicationForm(allocateFormId(project), title);
    title.de = 'Caller edit';
    expect(form.title.de).toBe('Antrag');
    const next = addApplicationForm(project, form)!;
    expect(next.forms.map((item): string => item.id)).toEqual(['form-1', 'form-2']);
    expect(next.forms[1].fields).toEqual([]);
    expect(next.forms[1].buttons[0].action).toBe('submit');
    expect(next.forms[1].submit).toEqual(next.forms[1].buttons[0].label);
    expect(next.review).toEqual({
      reviewer: 'Reviewer',
      checks: [false, false, false, false, false],
      approvedAt: null,
    });
    form.title.de = 'Changed outside';
    next.forms[0].fields[0].label.de = 'Changed in next';
    expect(next.forms[1].title.de).toBe('Antrag');
    expect(JSON.stringify(project)).toBe(before);
    expect('activeFormId' in next).toBe(false);
  });

  it('duplicates every group child and button without sharing nested data', (): void => {
    const project = approved();
    const next = duplicateApplicationForm(project, 'form-1', text('Kopie', 'Copy', 'کپی'))!;
    expect(next.forms[1].fields).toEqual(next.forms[0].fields);
    expect(next.forms[1].buttons).toEqual(next.forms[0].buttons);
    const child = next.forms[1].fields.find((field): boolean => !!field.group)!.group!.fields[0];
    child.label.fa = 'Other';
    expect(
      next.forms[0].fields.find((field): boolean => !!field.group)!.group!.fields[0].label.fa,
    ).not.toBe('Other');
    next.forms[1].buttons[0].label.de = 'Other';
    expect(next.forms[0].buttons[0].label.de).not.toBe('Other');
    expect(duplicateApplicationForm(project, 'missing', text('', ''))).toBeNull();
  });

  it('updates only the named form, including menu intent, without changing its identity', (): void => {
    const project = duplicateApplicationForm(approved(), 'form-1', text('Zweite', 'Second'))!;
    const fields = [createField('email', 'email')];
    const next = updateApplicationForm(project, 'form-2', { fields, menu: false })!;
    expect(next.forms[0]).toEqual(project.forms[0]);
    expect(next.forms[1].fields).toEqual(fields);
    expect(next.forms[1].menu).toBe(false);
    fields[0].label.de = 'Outside';
    expect(next.forms[1].fields[0].label.de).not.toBe('Outside');
    expect(updateApplicationForm(project, 'missing', { menu: false })).toBeNull();
    expect(updateApplicationForm(project, 'form-2', { fields: [fields[0], fields[0]] })).toBeNull();
    const withReview = approved();
    expect(updateApplicationForm(withReview, 'form-1', {})).toBe(withReview);
    expect(withReview.review.approvedAt).not.toBeNull();
  });

  it('rejects invalid or over-budget additions without changing the approved baseline', (): void => {
    const project = approved();
    const before = JSON.stringify(project);
    expect(addApplicationForm(project, project.forms[0])).toBeNull();
    expect(addApplicationForm(project, createApplicationForm('../bad', text('', '')))).toBeNull();
    const full = {
      ...project,
      forms: Array.from({ length: 20 }, (_, index) =>
        createApplicationForm(`form-${index}`, text('', '')),
      ),
    };
    expect(addApplicationForm(full, createApplicationForm('extra', text('', '')))).toBeNull();
    expect(duplicateApplicationForm(full, 'form-1', text('', ''))).toBeNull();
    const definitions = Array.from({ length: 100 }, (_, index) =>
      createField('text', `field-${index}`),
    );
    const limited = {
      ...project,
      forms: Array.from({ length: 5 }, (_, index) => ({
        ...createApplicationForm(`form-${index}`, text('', '')),
        fields: definitions,
      })),
    };
    expect(duplicateApplicationForm(limited, 'form-1', text('', ''))).toBeNull();
    expect(JSON.stringify(project)).toBe(before);
  });

  it('moves and deletes by ID, forbids deleting the last form and leaves rejected actions untouched', (): void => {
    const original = approved();
    const project = duplicateApplicationForm(original, 'form-1', text('Zweite', 'Second'))!;
    project.review = { ...original.review, checks: [...original.review.checks] };
    const moved = moveApplicationForm(project, 'form-2', -1)!;
    expect(moved.review.approvedAt).toBeNull();
    expect(moved.review.checks).toEqual([false, false, false, false, false]);
    expect(moved.forms.map((form): string => form.id)).toEqual(['form-2', 'form-1']);
    expect(moved.forms[0]).toEqual(project.forms[1]);
    expect(project.forms[0].id).toBe('form-1');
    expect(moveApplicationForm(project, 'form-1', -1)).toBeNull();
    expect(moveApplicationForm(project, 'form-2', 1)).toBeNull();
    expect(moveApplicationForm(project, 'missing', 1)).toBeNull();
    expect(moveApplicationForm(moved, 'form-2', 1)?.forms).toEqual(project.forms);
    expect(removeApplicationForm(project, 'form-1')?.forms).toEqual([project.forms[1]]);
    expect(removeApplicationForm(project, 'form-1')?.review.approvedAt).toBeNull();
    expect(removeApplicationForm(project, 'missing')).toBeNull();
    expect(removeApplicationForm(original, 'form-1')).toBeNull();
    expect(original.review.approvedAt).not.toBeNull();
    expect(project.review.approvedAt).not.toBeNull();
    const gap = { ...project, forms: [project.forms[1]] };
    expect(allocateFormId(gap)).toBe('form-1');
  });
});
