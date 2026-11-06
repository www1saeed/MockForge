import { TestBed } from '@angular/core/testing';
import { AccessEditorComponent } from './access-editor.component';
import { ProjectStore } from './project.store';
import { FeedbackService } from './feedback.service';
import { createCollectionList } from './collection.model';

describe('Role authoring', () => {
  it('persists inherited overrides, detaches edits, invalidates review and cleans removed role references', () => {
    TestBed.configureTestingModule({ providers: [ProjectStore] });
    const f = TestBed.createComponent(AccessEditorComponent),
      c = f.componentInstance;
    c.store.updateCollections([createCollectionList(c.store.project().fields, [])]);
    c.add();
    f.detectChanges();
    const role = c.role()!,
      form = c.store.activeFormId(),
      list = c.rows()[1].listId!;
    expect(role.rights).toMatchObject({ create: false, view: true });
    c.label('de', 'Lesend');
    c.defaultRight('create', true);
    c.override(form, undefined, 'edit', 'allow');
    c.override(form, list, 'edit', 'deny');
    expect(c.effective(form, undefined, 'edit')).toBe(true);
    expect(c.effective(form, list, 'edit')).toBe(false);
    c.override(form, list, 'edit', 'inherit');
    expect(c.effective(form, list, 'edit')).toBe(true);
    c.override(form, undefined, 'open', 'deny');
    c.override(form, list, 'open', 'allow');
    expect(c.effective(form, list, 'open')).toBe(false);
    expect(c.store.application().review.approvedAt).toBeNull();
    expect(role.label.de).not.toBe('Lesend');
    c.remove();
    TestBed.inject(FeedbackService).confirmDelete();
    expect(c.roles()).toEqual([]);
    expect(c.store.application().forms[0].access?.[role.id]).toBeUndefined();
    expect(c.store.application().forms[0].lists![0].access?.[role.id]).toBeUndefined();
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('uneingeschränkt');
  });
  it('does not apply a role deletion confirmation to a replaced project', () => {
    TestBed.configureTestingModule({ providers: [ProjectStore] });
    const f = TestBed.createComponent(AccessEditorComponent),
      c = f.componentInstance;
    c.add();
    c.remove();
    c.store.replace(c.store.application());
    TestBed.inject(FeedbackService).confirmDelete();
    expect(c.roles()).toHaveLength(1);
    f.destroy();
    expect(TestBed.inject(FeedbackService).deletion()).toBeNull();
  });
});
