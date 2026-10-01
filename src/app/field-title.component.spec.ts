import { TestBed } from '@angular/core/testing';
import { FieldTitleComponent } from './field-title.component';
import { PreviewFieldComponent } from './preview-field.component';
import { createField } from './project.model';

describe('Form tooltip titles', (): void => {
  test('switches title/icon triggers and removes them when suppressed or untranslated', (): void => {
    TestBed.configureTestingModule({ imports: [FieldTitleComponent] });
    const fixture = TestBed.createComponent(FieldTitleComponent);
    const field = createField('text', 'test');
    field.label = { de: 'Name', en: 'Name' };
    field.tooltip = { de: 'Hinweis', en: '' };
    fixture.componentRef.setInput('field', field);
    fixture.componentRef.setInput('locale', 'de');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('button').getAttribute('aria-label')).toBe(
      'Tooltip: Name',
    );
    fixture.componentRef.setInput('field', { ...field, tooltipPlacement: 'title' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
    expect(fixture.nativeElement.querySelector('.field-title-text').tabIndex).toBe(0);
    fixture.componentRef.setInput('enabled', false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[tabindex]')).toBeNull();
    fixture.componentRef.setInput('enabled', true);
    fixture.componentRef.setInput('locale', 'en');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[tabindex]')).toBeNull();
    fixture.destroy();
    expect(document.querySelector('.tooltip')).toBeNull();
  });

  test('a checkbox tooltip button never toggles the associated native checkbox', (): void => {
    TestBed.configureTestingModule({ imports: [PreviewFieldComponent] });
    const fixture = TestBed.createComponent(PreviewFieldComponent);
    const field = createField('checkbox', 'consent');
    field.tooltip = { de: 'Hinweis', en: 'Help' };
    fixture.componentRef.setInput('field', field);
    fixture.componentRef.setInput('locale', 'de');
    fixture.componentRef.setInput('controlId', 'consent-response');
    fixture.detectChanges();
    const checkbox: HTMLInputElement = fixture.nativeElement.querySelector('input');
    fixture.nativeElement.querySelector('.field-tooltip-button').click();
    expect(checkbox.checked).toBe(false);
    fixture.nativeElement.querySelector('label').click();
    expect(checkbox.checked).toBe(true);
  });
});
