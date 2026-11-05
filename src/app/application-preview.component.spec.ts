import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { CollectionWorkspaceComponent } from './collection-workspace.component';
import { ApplicationPreviewComponent } from './application-preview.component';
import { ApplicationPreviewSession } from './application-preview.session';
import { CollectionSessionRegistry } from './collection-session.registry';
import { CollectionSessionStore } from './collection-session.store';
import { COLLECTION_VIEW } from './collection-view';
import { PatternCheckService } from './pattern-check.service';
import { ProjectStore } from './project.store';
import { createCollectionList, text } from './project';
import { FeedbackService } from './feedback.service';

describe('Application preview cursor', () => {
  beforeEach(() => {
    HTMLDialogElement.prototype.close = jest.fn();
  });
  it('retires shared confirmations on screen/project changes and disposal, retaining current requests through language or copy edits', () => {
    TestBed.configureTestingModule({ providers: [ProjectStore, CollectionSessionRegistry] });
    const store = TestBed.inject(ProjectStore),
      feedback = TestBed.inject(FeedbackService);
    const second = store.addForm(text('Zweit', 'Second'))!;
    const fixture = TestBed.createComponent(ApplicationPreviewComponent);
    fixture.componentRef.setInput('route', { kind: 'form', formId: 'form-1' });
    fixture.detectChanges();
    TestBed.tick();
    const confirm = jest.fn();
    const request = (): void => feedback.requestDelete('Old form', confirm);
    request();
    fixture.componentRef.setInput('locale', 'en');
    fixture.detectChanges();
    TestBed.tick();
    expect(feedback.deletion()).not.toBeNull();
    store.update({ owner: 'Changed copy' });
    fixture.detectChanges();
    TestBed.tick();
    expect(feedback.deletion()).not.toBeNull();
    fixture.componentRef.setInput('route', { kind: 'form', formId: 'form-1' });
    fixture.detectChanges();
    TestBed.tick();
    expect(feedback.deletion()).not.toBeNull();
    fixture.componentRef.setInput('route', { kind: 'form', formId: second });
    fixture.detectChanges();
    TestBed.tick();
    expect(feedback.deletion()).toBeNull();
    feedback.confirmDelete();
    expect(confirm).not.toHaveBeenCalled();
    request();
    fixture.componentRef.setInput('route', { kind: 'missing' });
    fixture.detectChanges();
    TestBed.tick();
    expect(feedback.deletion()).toBeNull();
    feedback.confirmDelete();
    expect(confirm).not.toHaveBeenCalled();
    fixture.componentRef.setInput('route', { kind: 'form', formId: second });
    fixture.detectChanges();
    TestBed.tick();
    request();
    store.replace(store.application());
    fixture.detectChanges();
    TestBed.tick();
    expect(feedback.deletion()).toBeNull();
    feedback.confirmDelete();
    expect(confirm).not.toHaveBeenCalled();
    request();
    feedback.confirmDelete();
    expect(confirm).toHaveBeenCalledTimes(1);
    request();
    fixture.destroy();
    expect(feedback.deletion()).toBeNull();
    feedback.confirmDelete();
    expect(confirm).toHaveBeenCalledTimes(1);
  });
  it('resolves routed projections and localized titles without changing authoring state, storage or review', () => {
    // Native modal behavior is exercised by the Chromium navigation journeys.
    TestBed.configureTestingModule({
      providers: [
        ProjectStore,
        CollectionSessionRegistry,
        CollectionSessionStore,
        PatternCheckService,
        ApplicationPreviewSession,
        { provide: COLLECTION_VIEW, useExisting: ApplicationPreviewSession },
      ],
    });
    const store = TestBed.inject(ProjectStore);
    const second = store.addForm(text('Zweit', 'Second', 'دوم'))!;
    const lists = [createCollectionList(store.project().fields, [])];
    store.updateCollections(lists);
    store.selectForm('form-1');
    const fixture = TestBed.createComponent(ApplicationPreviewComponent);
    fixture.componentRef.setInput('route', { kind: 'list', formId: second, listId: lists[0].id });
    fixture.componentRef.setInput('locale', 'en');
    fixture.detectChanges();
    TestBed.tick();
    const component = fixture.componentInstance,
      stored = localStorage.getItem('mockforge-studio-v1');
    expect(component.data.form().id).toBe(second);
    expect(component.title({ kind: 'form', formId: second })).toBe('Second');
    expect(component.active({ kind: 'list', formId: second, listId: lists[0].id })).toBe(true);
    const list = fixture.debugElement.query(By.directive(CollectionWorkspaceComponent))
      .componentInstance as CollectionWorkspaceComponent;
    const baseline = store.application();
    list.add();
    list.duplicate();
    list.move(1);
    list.removeList();
    list.patch({ pageSize: 99 });
    list.entries('count', 500);
    expect(store.application()).toBe(baseline);
    component.selectedLocale.set('fa');
    expect(component.language()).toBe('de');
    component.selectedLocale.set('en');
    expect(component.language()).toBe('en');
    expect(store.activeFormId()).toBe('form-1');
    expect(localStorage.getItem('mockforge-studio-v1')).toBe(stored);
    const oldEpoch = component.scope.epoch();
    fixture.componentRef.setInput('route', { kind: 'form', formId: second });
    fixture.detectChanges();
    TestBed.tick();
    expect(component.scope.epoch()).toBe(oldEpoch + 1);
    fixture.componentRef.setInput('route', { kind: 'missing' });
    fixture.detectChanges();
    TestBed.tick();
    expect(component.target()).toBeNull();
  });
});
