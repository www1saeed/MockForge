import { TestBed } from '@angular/core/testing';
import { FormPreviewComponent } from './form-preview.component';
import { BUTTON_ACTIONS, createButton, createField } from './project.model';
import { example } from './project.examples';

describe('FormPreviewComponent', (): void => {
  function setup(): {
    component: FormPreviewComponent;
    form: HTMLFormElement;
    control: HTMLInputElement;
  } {
    TestBed.configureTestingModule({ imports: [FormPreviewComponent] });
    const fixture = TestBed.createComponent(FormPreviewComponent);
    const field = createField('text', 'code');
    field.pattern = '[A-Z]{3}';
    field.patternMessage = { de: 'Drei Buchstaben', en: 'Three letters', fa: 'سه حرف' };
    fixture.componentRef.setInput('project', { ...example('saas'), fields: [field] });
    fixture.detectChanges();
    return {
      component: fixture.componentInstance,
      form: fixture.nativeElement.querySelector('form'),
      control: fixture.nativeElement.querySelector('#preview-code'),
    };
  }

  it('validates entire values and clears errors for empty or corrected responses', (): void => {
    const { component, control } = setup();
    const field = component.project().fields[0];
    for (const value of ['ABCx', 'ABC', '']) {
      control.value = value;
      const event = new Event('input');
      Object.defineProperty(event, 'target', { value: control });
      component.validatePattern(event, field);
      expect(control.validationMessage).toBe(value === 'ABCx' ? 'Drei Buchstaben' : '');
    }
    component.validatePattern(new Event('input'), field);
  });

  it('simulates every configured action locally and resets response validity', (): void => {
    const { component, form, control } = setup();
    const validity = jest.spyOn(form, 'reportValidity').mockReturnValue(true);
    for (const action of BUTTON_ACTIONS) {
      component.simulated.set(false);
      control.value = 'ABC';
      component.runButton({ ...createButton('action'), action }, form);
      if (action === 'delete') {
        expect(component.simulated()).toBe(false);
        component.feedback.confirmDelete();
      }
      expect(component.simulated()).toBe(action !== 'none');
      if (action === 'reset') {
        expect(control.value).toBe('');
        expect(control.validationMessage).toBe('');
      }
    }
    validity.mockReturnValue(false);
    component.simulated.set(false);
    component.runButton(createButton('submit'), form);
    expect(component.simulated()).toBe(false);
  });

  it('routes Enter submission through the configured submit action', (): void => {
    const { component, form } = setup();
    jest.spyOn(form, 'reportValidity').mockReturnValue(true);
    const event = new Event('submit', { cancelable: true });
    Object.defineProperty(event, 'target', { value: form });
    component.submit(event);
    expect(event.defaultPrevented).toBe(true);
    expect(component.simulated()).toBe(true);
  });
});
