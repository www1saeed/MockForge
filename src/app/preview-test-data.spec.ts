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
    expect(component.dataReport()).toEqual({ filled: 11, preserved: 0, skipped: 0 });
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
    expect(component.dataReport()).toEqual({ filled: 1, preserved: 0, skipped: 2 });
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
});
