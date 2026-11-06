import { By } from '@angular/platform-browser';
import { CollectionWorkspaceComponent } from './collection-workspace.component';
import { createField } from './project.model';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CollectionConfiguratorComponent } from './collection-configurator.component';
import { CollectionSessionStore } from './collection-session.store';
import { CollectionSessionRegistry } from './collection-session.registry';
import { ProjectStore } from './project.store';
import { PatternCheckService } from './pattern-check.service';
import { FeedbackService } from './feedback.service';

describe('Dedicated list configuration', () => {
  beforeEach(() => {
    HTMLDialogElement.prototype.close = jest.fn();
  });
  function setup(): {
    fixture: ComponentFixture<CollectionConfiguratorComponent>;
    c: CollectionConfiguratorComponent;
  } {
    TestBed.configureTestingModule({
      imports: [CollectionConfiguratorComponent],
      providers: [
        ProjectStore,
        CollectionSessionStore,
        CollectionSessionRegistry,
        PatternCheckService,
      ],
    });
    const fixture = TestBed.createComponent(CollectionConfiguratorComponent),
      c = fixture.componentInstance;
    c.add();
    fixture.detectChanges();
    TestBed.tick();
    return { fixture, c };
  }
  it('keeps at least one selected group child and persists explicit child selection', () => {
    const { c } = setup();
    const field = {
      ...createField('group', 'items'),
      group: {
        layout: 'table' as const,
        minItems: 0,
        maxItems: 2,
        fields: [createField('text', 'product'), createField('number', 'quantity')],
      },
    };
    c.store.update({ fields: [field] });
    c.toggle('columns', 'items', true);
    c.groupField('items', 'quantity', false);
    expect(c.column('items').groupFields).toEqual(['product']);
    c.groupField('items', 'product', false);
    expect(c.column('items').groupFields).toEqual(['product']);
    c.groupField('items', 'quantity', true);
    expect(c.column('items').groupFields).toEqual(['product', 'quantity']);
  });
  it('disables the sole implicitly selected group child in the actual checkbox', async () => {
    const { fixture, c } = setup();
    c.store.update({
      fields: [
        {
          ...createField('group', 'items'),
          group: {
            layout: 'table',
            minItems: 0,
            maxItems: 2,
            fields: [createField('text', 'product')],
          },
        },
      ],
    });
    c.toggle('columns', 'items', true);
    fixture.detectChanges();
    TestBed.tick();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const checkbox = fixture.nativeElement.querySelector(
      '.collection-group-field-settings input',
    ) as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
    expect(checkbox.disabled).toBe(true);
    c.groupField('items', 'product', false);
    expect(c.groupSelection('items')).toEqual(['product']);
  });
  it('stores ordered headings, dimensions and disabled sorting without changing answer rules', () => {
    const { fixture, c } = setup();
    c.defaultSort('name');
    c.columnLabel('name', 'de', 'Person');
    c.columnPatch('name', { width: 180, align: 'end', sortable: false });
    expect(c.list()?.sort).toBeUndefined();
    c.moveColumn('name', 1);
    expect(c.list()?.columns[1]).toBe('name');
    c.look({ design: 'bordered', density: 'compact' });
    c.buttonLabel('edit', 'en', 'Update');
    c.buttonPatch('edit', { display: 'icon', icon: 'arrow', variant: 'primary' });
    c.moveAction('edit', -1);
    expect(c.list()?.actionOrder?.[1]).toBe('edit');
    expect(c.list()?.actionSettings?.edit?.label.en).toBe('Update');
    expect(c.list()?.appearance?.design).toBe('bordered');
    c.toggle('columns', 'name', false);
    expect(c.list()?.columnSettings).toEqual([]);
    fixture.detectChanges();
    const preview = fixture.debugElement.query(By.directive(CollectionWorkspaceComponent))
      .componentInstance as CollectionWorkspaceComponent;
    preview.setGenerationCount(9);
    fixture.detectChanges();
    expect(c.data.form().entries?.count).toBe(9);
    c.entries('count', 4);
    fixture.detectChanges();
    expect(preview.generationCount()).toBe(4);
    preview.setGenerationCount(0);
    fixture.detectChanges();
    expect(preview.generationValid()).toBe(false);
    expect(c.data.form().entries?.count).toBe(4);
    c.store.updateCollections([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#live-preview')).not.toBeNull();
    fixture.componentRef.setInput('previewVisible', false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#live-preview')).toBeNull();
  });
  it('preserves last valid settings on invalid edits and retires confirmations on disposal', () => {
    const { fixture, c } = setup();
    c.columnPatch('name', { width: 900 });
    expect(c.store.mutationError()).toBe(true);
    expect(c.list()?.columnSettings).toBeUndefined();
    c.removeList();
    const feedback = TestBed.inject(FeedbackService);
    expect(feedback.deletion()).not.toBeNull();
    fixture.destroy();
    expect(feedback.deletion()).toBeNull();
  });
});
