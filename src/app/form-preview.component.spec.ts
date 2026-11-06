import { ALLOW_RIGHTS } from './application-access';
import { FeedbackService } from './feedback.service';
import { TestBed } from '@angular/core/testing';
import { FormPreviewComponent } from './form-preview.component';
import { BUTTON_ACTIONS, createButton, createField } from './project.model';
import { example } from './project.examples';

describe('FormPreviewComponent', (): void => {
  it('preserves explicit restored false/empty choices while filling missing answers and permits replacement', async (): Promise<void> => {
    TestBed.configureTestingModule({ imports: [FormPreviewComponent] });
    const fixture = TestBed.createComponent(FormPreviewComponent);
    const saved = createField('checkbox', 'saved');
    const missing = createField('checkbox', 'missing');
    const radio = createField('radio', 'radio');
    const group = createField('group', 'items');
    group.group!.minItems = 1;
    group.group!.fields = [createField('checkbox', 'child'), createField('radio', 'choice')];
    fixture.componentRef.setInput('project', {
      ...example('saas'),
      fields: [saved, missing, radio, group],
    });
    fixture.componentRef.setInput('recordMode', true);
    fixture.componentRef.setInput('initialValues', {
      saved: false,
      radio: '',
      items: [{ child: false, choice: '' }],
    });
    fixture.detectChanges();
    TestBed.tick();
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form');
    await fixture.componentInstance.fillResponses(form);
    expect((form.elements.namedItem('preview-saved') as HTMLInputElement).checked).toBe(false);
    expect((form.elements.namedItem('preview-missing') as HTMLInputElement).checked).toBe(true);
    expect(form.querySelector<HTMLInputElement>('input[data-field-id="child"]')!.checked).toBe(
      false,
    );
    expect(form.querySelector('input[type="radio"]:checked')).toBeNull();
    fixture.componentInstance.replaceResponses.set(true);
    await fixture.componentInstance.fillResponses(form);
    expect((form.elements.namedItem('preview-saved') as HTMLInputElement).checked).toBe(true);
    expect(form.querySelector<HTMLInputElement>('input[data-field-id="child"]')!.checked).toBe(
      true,
    );
    expect(form.querySelector('input[type="radio"]:checked')).not.toBeNull();
  });
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
  it('gates normal submit/save/delete simulations and rechecks a pending delete after rights change', () => {
    TestBed.configureTestingModule({ imports: [FormPreviewComponent] });
    HTMLDialogElement.prototype.close = jest.fn();
    const f = TestBed.createComponent(FormPreviewComponent),
      buttons = ['submit', 'save', 'delete', 'reset'].map((action, index) => ({
        ...createButton('button-' + index),
        action: action as 'submit' | 'save' | 'delete' | 'reset',
      }));
    f.componentRef.setInput('project', { ...example('saas'), fields: [], buttons });
    f.componentRef.setInput('operationRights', {
      ...ALLOW_RIGHTS,
      create: false,
      edit: false,
      delete: false,
    });
    f.detectChanges();
    const c = f.componentInstance,
      form = f.nativeElement.querySelector('form') as HTMLFormElement,
      feedback = TestBed.inject(FeedbackService);
    expect(c.allowedButtons().map((button) => button.action)).toEqual(['reset']);
    for (const button of buttons.slice(0, 3)) c.runButton(button, form);
    c.submit({ target: form, preventDefault: jest.fn() } as unknown as Event);
    expect(c.simulated()).toBe(false);
    expect(feedback.deletion()).toBeNull();
    f.componentRef.setInput('operationRights', ALLOW_RIGHTS);
    f.detectChanges();
    c.runButton(buttons[2], form);
    expect(feedback.deletion()).not.toBeNull();
    f.componentRef.setInput('operationRights', { ...ALLOW_RIGHTS, delete: false });
    f.detectChanges();
    feedback.confirmDelete();
    expect(c.simulated()).toBe(false);
  });
});
