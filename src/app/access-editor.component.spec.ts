import { TestBed } from '@angular/core/testing';
import { AccessEditorComponent } from './access-editor.component';
import { ProjectStore } from './project.store';
import { FeedbackService } from './feedback.service';
import { createCollectionList } from './collection.model';
import { ALLOW_RIGHTS } from './application-access';

describe('Role authoring', () => {
  it('keeps blank and whitespace role inputs synchronized with storage and exposes a field-level error', async () => {
    TestBed.configureTestingModule({ providers: [ProjectStore] });
    const f = TestBed.createComponent(AccessEditorComponent),
      c = f.componentInstance;
    c.add();
    f.detectChanges();
    await f.whenStable();
    const input = f.nativeElement.querySelector(
      'input[aria-label="Rollenname DE"]',
    ) as HTMLInputElement;
    input.value = '';
    input.dispatchEvent(new Event('input'));
    f.detectChanges();
    await f.whenStable();
    expect(c.role()!.label.de).toBe('');
    expect(input.value).toBe('');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(f.nativeElement.querySelector('#role-name-error-de').textContent).toContain('Review');
    expect(JSON.parse(localStorage.getItem('mockforge-studio-v1')!).roles[0].label.de).toBe('');
    c.label('de', '   ');
    f.detectChanges();
    expect(c.role()!.label.de).toBe('   ');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    c.label('de', 'Einkauf');
    f.detectChanges();
    await f.whenStable();
    expect(input.value).toBe('Einkauf');
    expect(input.hasAttribute('aria-invalid')).toBe(false);
  });
  it('treats constructor as an ordinary own role ID for inheritance, explicit overrides and deletion labels', () => {
    TestBed.configureTestingModule({ providers: [ProjectStore] });
    const f = TestBed.createComponent(AccessEditorComponent),
      c = f.componentInstance;
    c.store.updateCollections([createCollectionList(c.store.project().fields, [])]);
    const roles = [
      {
        id: 'constructor',
        label: { de: 'Konstruktor', en: 'Constructor', fa: '' },
        rights: { ...ALLOW_RIGHTS, create: false },
      },
      { id: 'other', label: { de: 'Andere', en: 'Other', fa: '' }, rights: { ...ALLOW_RIGHTS } },
    ];
    c.store.configureAccess(
      roles,
      c.store.application().forms.map((form) => ({
        ...form,
        access: { other: { open: true } },
        lists: form.lists?.map((list) => ({ ...list, access: { other: { open: true } } })),
      })),
    );
    const form = c.store.activeFormId(),
      list = c.rows()[1].listId!;
    expect(c.choice(c.rows()[0].policy, 'create')).toBe('inherit');
    expect(c.choice(c.rows()[1].policy, 'create')).toBe('inherit');
    expect(c.effective(form, list, 'create')).toBe(false);
    c.override(form, list, 'create', 'allow');
    expect(c.choice(c.rows()[1].policy, 'create')).toBe('allow');
    expect(c.effective(form, list, 'create')).toBe(true);
    c.override(form, list, 'create', 'inherit');
    expect(c.choice(c.rows()[1].policy, 'create')).toBe('inherit');
    expect(c.effective(form, list, 'create')).toBe(false);
    expect(Object.hasOwn(c.rows()[1].policy!, 'constructor')).toBe(false);
    f.componentRef.setInput('locale', 'fa');
    c.remove();
    expect(TestBed.inject(FeedbackService).deletion()?.label).toBe('constructor');
  });
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
