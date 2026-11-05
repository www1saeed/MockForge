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
  it('stores ordered headings, dimensions and disabled sorting without changing answer rules', () => {
    const { c } = setup();
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
