import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RepeatGroupComponent } from './repeat-group.component';
import { createField } from './project.model';

describe('RepeatGroupComponent', (): void => {
  function setup(minItems = 1, maxItems = 3): ComponentFixture<RepeatGroupComponent> {
    TestBed.configureTestingModule({ imports: [RepeatGroupComponent] });
    const fixture = TestBed.createComponent(RepeatGroupComponent);
    const field = createField('group', 'people');
    field.group!.minItems = minItems;
    field.group!.maxItems = maxItems;
    fixture.componentRef.setInput('field', field);
    fixture.componentRef.setInput('locale', 'de');
    fixture.detectChanges();
    return fixture;
  }

  it('keeps stable response identities and requires confirmation before removal', (): void => {
    const fixture = setup();
    const component = fixture.componentInstance;
    const first = component.rows()[0].id;
    component.removeEntry(first);
    expect(component.feedback.deletion()).toBeNull();
    component.addEntry();
    component.addEntry();
    const third = component.rows()[2].id;
    component.addEntry();
    expect(component.rows()).toHaveLength(3);
    const second = component.rows()[1].id;
    component.removeEntry(second);
    expect(component.rows()).toHaveLength(3);
    component.feedback.cancelDelete();
    expect(component.rows()).toHaveLength(3);
    component.removeEntry(second);
    component.feedback.confirmDelete();
    expect(component.rows().map((row): number => row.id)).toEqual([first, third]);
    expect(component.controlId(first, component.field().group!.fields[0])).not.toBe(
      component.controlId(third, component.field().group!.fields[0]),
    );
    component.removeEntry(999);
    expect(component.feedback.deletion()).toBeNull();
    expect(component.field().group!.fields).toHaveLength(1);
  });

  it('allows optional empty groups and resets row state without persisting responses', (): void => {
    const fixture = setup(0);
    const component = fixture.componentInstance;
    expect(component.rows()).toEqual([]);
    component.addEntry();
    const id = component.rows()[0].id;
    fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    input.value = 'Private response';
    fixture.componentRef.setInput('locale', 'en');
    fixture.detectChanges();
    expect(component.rows()[0].id).toBe(id);
    expect(input.value).toBe('Private response');
    expect(fixture.nativeElement.textContent).toContain('Add entry');
    fixture.componentRef.setInput('resetToken', 1);
    fixture.detectChanges();
    expect(component.rows()).toEqual([]);
    expect(JSON.stringify(component.field())).not.toContain('Private response');
  });

  it('renders semantic tables and ignores stale confirmations after a reset', (): void => {
    const fixture = setup();
    const component = fixture.componentInstance;
    fixture.componentRef.setInput('field', {
      ...component.field(),
      group: { ...component.field().group!, layout: 'table' },
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('table caption')).not.toBeNull();
    component.addEntry();
    component.removeEntry(component.rows()[1].id);
    fixture.componentRef.setInput('resetToken', 1);
    fixture.detectChanges();
    component.feedback.confirmDelete();
    expect(component.rows()).toHaveLength(1);
  });
  it('gives repeated radio sets independent names and label targets', (): void => {
    const fixture = setup();
    const component = fixture.componentInstance;
    fixture.componentRef.setInput('field', {
      ...component.field(),
      group: { ...component.field().group!, fields: [createField('radio', 'role')] },
    });
    fixture.detectChanges();
    component.addEntry();
    fixture.detectChanges();
    const radios: HTMLInputElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('input[type=radio]'),
    );
    expect(radios).toHaveLength(4);
    expect(radios[0].name).toBe(radios[1].name);
    expect(radios[0].name).not.toBe(radios[2].name);
    radios[0].click();
    radios[2].click();
    expect(radios[0].checked).toBe(true);
    expect(radios[2].checked).toBe(true);
  });
});
