import { TestBed } from '@angular/core/testing';
import { FormPreviewComponent } from './form-preview.component';
import { example } from './project.examples';
import { allFields, createField, Field, LEAF_FIELD_TYPES, text } from './project.model';
import { fillTestData, testDataCandidate } from './preview-test-data';

describe('Preview test data', (): void => {
  function setup(fields: Field[]): { component: FormPreviewComponent; form: HTMLFormElement } {
    TestBed.configureTestingModule({ imports: [FormPreviewComponent] });
    const fixture = TestBed.createComponent(FormPreviewComponent);
    fixture.componentRef.setInput('project', { ...example('saas'), fields });
    fixture.detectChanges();
    return {
      component: fixture.componentInstance,
      form: fixture.nativeElement.querySelector('form'),
    };
  }

  it('fills every native type and repeated response independently, without editing the specification', (): void => {
    const fields = LEAF_FIELD_TYPES.map((type): Field => ({
      ...createField(type, type),
      required: true,
    }));
    const group = createField('group', 'people');
    group.group!.minItems = 2;
    fields.push(group);
    const { component, form } = setup(fields);
    const before = JSON.stringify(component.project());
    component.fillResponses(form);
    expect(component.dataReport()).toMatchObject({ filled: 11, preserved: 0, skipped: 0 });
    expect(form.checkValidity()).toBe(true);
    expect(JSON.stringify(component.project())).toBe(before);
    expect(form.querySelectorAll('[data-field-id="people-item"]')).toHaveLength(2);
    const first = Array.from(form.querySelectorAll('input')).map(
      (control): string => control.value,
    );
    component.replaceResponses.set(true);
    component.fillResponses(form);
    expect(
      Array.from(form.querySelectorAll('input')).map((control): string => control.value),
    ).toEqual(first);
    expect(allFields(fields)).toHaveLength(11);
  });

  it('preserves entered answers by default and explicitly replaces or empties them', (): void => {
    const field = createField('text', 'name');
    field.label = text('Name', 'Name', 'نام');
    const { component, form } = setup([field]);
    const control = form.querySelector('input')!;
    control.value = 'My answer';
    component.fillResponses(form);
    expect(control.value).toBe('My answer');
    expect(component.dataReport()?.preserved).toBe(1);
    component.replaceResponses.set(true);
    component.dataLocale.set('fa');
    component.fillResponses(form);
    expect(control.value).toMatch(/نمونه/);
    component.dataScenario.set('empty');
    component.fillResponses(form);
    expect(control.value).toBe('');
  });

  it('preserves an explicitly unchecked checkbox until replacement is requested', (): void => {
    const { component, form } = setup([createField('checkbox', 'consent')]);
    const checkbox = form.querySelector('input')!;
    checkbox.checked = false;
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    component.fillResponses(form);
    expect(checkbox.checked).toBe(false);
    expect(component.dataReport()?.preserved).toBe(1);
    component.replaceResponses.set(true);
    component.fillResponses(form);
    expect(checkbox.checked).toBe(true);
  });

  it('generates bounded patterns and reports unsupported patterns or impossible email lengths', (): void => {
    const code = { ...createField('text', 'code'), pattern: '[A-Z]{3}' };
    const uncertain = { ...createField('textarea', 'uncertain'), pattern: '(a+)+$' };
    const email = { ...createField('email', 'email'), maxLength: 2 };
    const { component, form } = setup([code, uncertain, email]);
    const control = form.querySelector<HTMLInputElement>('#preview-code')!;
    control.setCustomValidity('Old error');
    component.fillResponses(form);
    expect(control.value).toMatch(/^[A-Z]{3}$/);
    expect(control.validationMessage).toBe('');
    expect(component.dataReport()).toMatchObject({ filled: 1, preserved: 0, skipped: 2 });
    expect(form.querySelector('textarea')!.value).toBe('');
    expect(testDataCandidate({ ...code, pattern: '[Z-A]{3}' }, 'en', 0)).toBeNull();
    expect(testDataCandidate({ ...code, pattern: '[a-z]{101}' }, 'en', 0)).toBeNull();
    expect(testDataCandidate({ ...code, pattern: '[a-z]{9,2}' }, 'en', 0)).toBeNull();
  });

  it('adds one optional group entry and respects text length bounds and profile-independent technical values', (): void => {
    const group = createField('group', 'optional');
    group.group!.minItems = 0;
    group.required = false;
    const { component, form } = setup([group]);
    component.fillResponses(form);
    expect(component.groups()[0].rows()).toHaveLength(1);
    expect(component.dataReport()?.filled).toBe(1);
    const field = { ...createField('text', 'text'), minLength: 30, maxLength: 30 };
    expect(testDataCandidate(field, 'en', 0)).toHaveLength(30);
    expect(testDataCandidate({ ...field, minLength: 0, maxLength: 3 }, 'de', 0)).toHaveLength(3);
    expect(testDataCandidate(createField('email', 'email'), 'fa', 2)).toBe('sample3@example.org');
    expect(fillTestData(form, allFields([group]), 'en', Infinity, true, 'valid').filled).toBe(1);
  });

  it.each([
    ['minimum', 3, true],
    ['maximum', 6, true],
    ['belowMinimum', 2, false],
    ['aboveMaximum', 7, false],
  ] as const)('verifies %s with real response validity', (boundary, length, valid): void => {
    const field = {
      ...createField('textarea', 'message'),
      required: false,
      minLength: 3,
      maxLength: 6,
    };
    const { component, form } = setup([field]);
    component.dataScenario.set('boundary');
    component.dataBoundary.set(boundary);
    component.fillResponses(form);
    expect(form.querySelector('textarea')!.value).toHaveLength(length);
    expect(form.checkValidity()).toBe(valid);
    expect(component.dataReport()?.diagnostics[0]).toMatchObject({
      outcome: 'filled',
      expectedValid: valid,
      actualValid: valid,
    });
    // Submission refreshes the same explicit constraints, rather than losing programmatic errors.
    component.runButton(component.project().buttons[0], form);
    expect(form.checkValidity()).toBe(valid);
  });

  it('distinguishes unavailable cases, safe-pattern skips and failed candidate attempts', (): void => {
    const fields = [
      { ...createField('text', 'optional'), required: false, minLength: 1 },
      { ...createField('text', 'pattern'), pattern: '[A-Z]{3}', minLength: 2, maxLength: 4 },
      { ...createField('text', 'complex'), pattern: '(a+)+$' },
      createField('number', 'quantity'),
    ];
    const { component, form } = setup(fields);
    const patterned = form.querySelector<HTMLInputElement>('#preview-pattern')!;
    patterned.value = 'ABC';
    component.replaceResponses.set(true);
    component.dataScenario.set('boundary');
    component.dataBoundary.set('minimum');
    component.fillResponses(form);
    expect(component.dataReport()?.diagnostics.map((item): string => item.reason)).toEqual([
      'applied',
      'mismatch',
      'unsupported',
      'unavailable',
    ]);
    expect(patterned.value).toBe('ABC');
    expect(patterned.checkValidity()).toBe(true);
    component.dataBoundary.set('belowMinimum');
    component.fillResponses(form);
    expect(component.dataReport()?.diagnostics[0].reason).toBe('unavailable');
  });

  it('observes invalid required, email, URL and optional length values without inventing numeric failures', (): void => {
    const fields = [
      ...(['checkbox', 'radio', 'select', 'text'] as const).map((type): Field => ({
        ...createField(type, type),
        required: true,
      })),
      ...(['email', 'url'] as const).map((type): Field => ({
        ...createField(type, type),
        required: false,
      })),
      { ...createField('textarea', 'short'), required: false, minLength: 3 },
      { ...createField('text', 'long'), required: false, maxLength: 2 },
      { ...createField('number', 'number'), required: false },
    ];
    const { component, form } = setup(fields);
    component.dataScenario.set('invalid');
    component.fillResponses(form);
    expect(component.dataReport()).toMatchObject({ filled: 8, skipped: 1 });
    expect(
      component
        .dataReport()
        ?.diagnostics.slice(0, 8)
        .every((item): boolean => item.expectedValid === false && item.actualValid === false),
    ).toBe(true);
    expect(component.dataReport()?.diagnostics[8].reason).toBe('unavailable');
    expect(form.checkValidity()).toBe(false);
  });

  it('empties required patterned fields without evaluating unsupported expressions', (): void => {
    const field = { ...createField('text', 'complex'), pattern: '(a+)+$', required: true };
    const { component, form } = setup([field]);
    component.dataScenario.set('boundary');
    component.dataBoundary.set('requiredEmpty');
    component.fillResponses(form);
    expect(component.dataReport()?.diagnostics[0]).toMatchObject({
      outcome: 'filled',
      rule: 'required',
      actualValid: false,
    });
    expect(form.checkValidity()).toBe(false);
  });

  it('protects group responses on shrink and preserves surviving identities at row boundaries', (): void => {
    const field = createField('group', 'team');
    field.group!.minItems = 0;
    field.group!.maxItems = 3;
    const { component, form } = setup([field]);
    component.dataGroupRows.set('maximum');
    component.fillResponses(form);
    const group = component.groups()[0];
    const ids = group.rows().map((row): number => row.id);
    expect(group.rows()).toHaveLength(3);
    expect(component.dataReport()?.diagnostics[0]).toMatchObject({
      rule: 'group',
      actualValid: true,
    });
    expect(component.diagnosticLabel(component.dataReport()!.diagnostics[1])).toContain('1');
    const before = JSON.stringify(component.project());
    component.dataGroupRows.set('minimum');
    component.fillResponses(form);
    expect(group.rows().map((row): number => row.id)).toEqual(ids);
    expect(component.dataReport()?.diagnostics[0].reason).toBe('protected');
    component.replaceResponses.set(true);
    component.fillResponses(form);
    expect(group.rows()).toHaveLength(0);
    expect(JSON.stringify(component.project())).toBe(before);
    component.dataGroupRows.set('maximum');
    component.fillResponses(form);
    expect(group.rows()[0].id).toBeGreaterThan(ids[2]);
  });

  it('bounds maximum-plus-one allocation and clears length errors after correction and reset', (): void => {
    const field = {
      ...createField('text', 'large'),
      minLength: 2,
      maxLength: 10000,
      required: false,
    };
    const { component, form } = setup([field]);
    const control = form.querySelector('input')!;
    component.dataScenario.set('boundary');
    component.dataBoundary.set('aboveMaximum');
    component.fillResponses(form);
    expect(control.value).toHaveLength(10001);
    expect(control.checkValidity()).toBe(false);
    control.value = 'ok';
    control.dispatchEvent(new Event('input', { bubbles: true }));
    expect(control.checkValidity()).toBe(true);
    expect(component.dataReport()).toBeNull();
    component.runButton({ ...component.project().buttons[0], action: 'reset' }, form);
    expect(control.value).toBe('');
    expect(control.checkValidity()).toBe(true);
  });
});
