import { TestBed } from '@angular/core/testing';
import { FieldListComponent } from './field-list.component';
import { createField } from './project.model';

describe('FieldListComponent', (): void => {
  it('renders a compact rail with accessible index, name and type and emits its toggle', (): void => {
    TestBed.configureTestingModule({ imports: [FieldListComponent] });
    const fixture = TestBed.createComponent(FieldListComponent);
    const field = createField('email', 'contact');
    field.label = { de: 'Kontakt', en: 'Contact', fa: 'تماس' };
    fixture.componentRef.setInput('fields', [field]);
    fixture.componentRef.setInput('selectedId', field.id);
    fixture.componentRef.setInput('locale', 'de');
    fixture.componentRef.setInput('languages', ['de', 'en']);
    fixture.componentRef.setInput('collapsible', true);
    fixture.componentRef.setInput('collapsed', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.field-row').getAttribute('aria-label')).toBe(
      '01 · Kontakt · E-Mail',
    );
    expect(fixture.nativeElement.querySelector('.field-row svg')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.field-list-tools')).toBeNull();
    expect(fixture.nativeElement.querySelector('.add-field')).toBeNull();
    const toggle = jest.fn();
    fixture.componentInstance.collapsedChange.subscribe(toggle);
    fixture.nativeElement.querySelector('.field-list-toggle').click();
    expect(toggle).toHaveBeenCalledWith(false);
    fixture.componentRef.setInput('collapsed', false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.add-field')).not.toBeNull();
    fixture.destroy();
    expect(document.querySelector('.field-rail-tooltip')).toBeNull();
  });
  it('emits structural actions without mutating fields and disables boundary moves', (): void => {
    TestBed.configureTestingModule({ imports: [FieldListComponent] });
    const fixture = TestBed.createComponent(FieldListComponent);
    const fields = [createField('text', 'first'), createField('email', 'second')];
    fixture.componentRef.setInput('fields', fields);
    fixture.componentRef.setInput('selectedId', 'first');
    fixture.componentRef.setInput('locale', 'de');
    fixture.componentRef.setInput('languages', ['en']);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    expect(component.label({ de: 'Deutsch', en: 'English', fa: 'فارسی' })).toBe('English');
    const moved = jest.fn();
    const removed = jest.fn();
    const selected = jest.fn();
    const added = jest.fn();
    component.moved.subscribe(moved);
    component.removed.subscribe(removed);
    component.selected.subscribe(selected);
    component.added.subscribe(added);
    const buttons: HTMLButtonElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('.field-list-tools button'),
    );
    expect(buttons[0].disabled).toBe(true);
    buttons[1].click();
    buttons[2].click();
    fixture.nativeElement.querySelectorAll('.field-row')[1].click();
    fixture.nativeElement.querySelector('.add-button').click();
    expect(moved).toHaveBeenCalledWith(1);
    expect(removed).toHaveBeenCalled();
    expect(selected).toHaveBeenCalledWith('second');
    expect(added).toHaveBeenCalledWith('text');
    expect(fields.map((field): string => field.id)).toEqual(['first', 'second']);
    fixture.componentRef.setInput('selectedId', 'second');
    fixture.detectChanges();
    expect(buttons[1].disabled).toBe(true);
  });
});
