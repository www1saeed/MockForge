import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { createButton, createField, example, FieldType } from './project';

describe('Alignment workspace', (): void => {
  test('full-width preview is transient and step changes or hiding restore the editor', (): void => {
    const app = TestBed.createComponent(AppComponent).componentInstance;
    app.togglePreviewWidth();
    expect(app.previewVisible()).toBe(true);
    expect(app.previewFullWidth()).toBe(true);
    app.togglePreviewWidth();
    expect(app.previewVisible()).toBe(true);
    expect(app.previewFullWidth()).toBe(false);
    app.togglePreviewWidth();
    app.togglePreview();
    expect(app.previewFullWidth()).toBe(false);
    expect(app.previewVisible()).toBe(false);
    app.togglePreviewWidth();
    app.setStep(3);
    expect(app.previewFullWidth()).toBe(false);
  });
  beforeEach(async (): Promise<void> => {
    window.location.hash = '';
    localStorage.clear();
    await TestBed.configureTestingModule({ imports: [AppComponent] }).compileComponents();
  });
  test('edits group children immutably, normalizes row bounds and confirms child deletion', (): void => {
    const app = TestBed.createComponent(AppComponent).componentInstance;
    app.addField('group');
    const groupId = app.selectedId();
    const original = app.project();
    expect(app.selected()?.group?.fields).toHaveLength(1);
    app.groupChange({ layout: 'table', minItems: -4, maxItems: 50 });
    expect(app.selected()?.group).toMatchObject({ layout: 'table', minItems: 0, maxItems: 20 });
    expect(original.fields.at(-1)?.group?.layout).toBe('cards');
    app.addGroupField('email');
    const childId = app.selectedId();
    expect(app.rootSelectedId()).toBe(groupId);
    app.fieldText('label', 'Kontakt', 'de');
    app.changeType('textarea');
    app.changePattern('[A-Z]+');
    app.changePattern('[');
    expect(app.selected()?.type).toBe('textarea');
    expect(app.selected()?.label.de).toBe('Kontakt');
    app.changeType('group');
    expect(app.selected()?.type).toBe('textarea');
    app.moveField(-1);
    expect(app.editingGroup()?.group?.fields[0].id).toBe(childId);
    app.removeField();
    expect(app.selected()?.id).toBe(childId);
    app.feedback.confirmDelete();
    expect(app.childEditorOpen()).toBe(true);
    expect(app.selectedId()).toBe(app.editingGroup()?.group?.fields[0].id);
    app.closeGroupFields();
    expect(app.selectedId()).toBe(groupId);
    expect(app.patternDrafts()[childId]).toBeUndefined();
    expect(app.selected()?.group?.fields).toHaveLength(1);
    app.selectedId.set(app.selected()!.group!.fields[0].id);
    app.removeField();
    expect(app.feedback.deletion()).toBeNull();
    expect(app.feedback.toasts().some((toast): boolean => toast.key === 'lastGroupField')).toBe(
      true,
    );
    app.removeField(true);
    app.feedback.confirmDelete();
    expect(app.project().fields.some((field): boolean => field.id === groupId)).toBe(false);
  });

  test('child editing collapses the root rail and restores it on close or root selection', (): void => {
    const app = TestBed.createComponent(AppComponent).componentInstance;
    app.store.replace(example('complex'));
    app.selectRootField('team-members');
    app.openGroupFields();
    expect(app.childEditorOpen()).toBe(true);
    expect(app.rootListCollapsed()).toBe(true);
    app.rootListCollapsed.set(false);
    expect(app.childEditorOpen()).toBe(true);
    app.closeGroupFields();
    expect(app.selectedId()).toBe('team-members');
    expect(app.childEditorOpen()).toBe(false);
    app.openGroupFields();
    app.selectRootField(app.project().fields[0].id);
    expect(app.rootListCollapsed()).toBe(false);
    expect(app.childEditorOpen()).toBe(false);
  });

  test('review includes group child translations, and child changes invalidate acknowledgement', (): void => {
    const app = TestBed.createComponent(AppComponent).componentInstance;
    app.store.replace(example('complex'));
    app.update({ questions: '' });
    app.setReviewer('Reviewer');
    for (let index = 0; index < 5; index++) app.setCheck(index, true);
    expect(app.canApprove()).toBe(true);
    app.approve();
    expect(app.project().review.approvedAt).not.toBeNull();
    app.selectedId.set('member-email');
    app.fieldText('label', '', 'en');
    expect(app.project().review.approvedAt).toBeNull();
    for (let index = 0; index < 5; index++) app.setCheck(index, true);
    expect(app.canApprove()).toBe(false);
  });

  test('group definitions obey child and total field limits and top-level type conversion', (): void => {
    const app = TestBed.createComponent(AppComponent).componentInstance;
    app.selectedId.set('name');
    app.changeType('group');
    expect(app.selected()?.group?.fields).toHaveLength(1);
    app.groupChange({ maxItems: 2, minItems: 10 });
    expect(app.selected()?.group?.minItems).toBe(2);
    app.addGroupField('group');
    for (let index = 0; index < 25; index++) app.addGroupField('text');
    expect(app.editingGroup()?.group?.fields).toHaveLength(20);
    expect(app.feedback.toasts().some((toast): boolean => toast.key === 'groupFieldLimit')).toBe(
      true,
    );
    app.selectedId.set('name');
    app.changeType('text');
    expect(app.selected()?.type).toBe('group');
    app.feedback.cancelDelete();
    expect(app.selected()?.group?.fields).toHaveLength(20);
    app.changeType('text');
    app.feedback.confirmDelete();
    expect(app.selected()?.group).toBeUndefined();
    app.update({
      fields: Array.from({ length: 100 }, (_, index) => createField('text', `f-${index}`)),
    });
    app.selectedId.set('f-0');
    app.changeType('group');
    expect(app.selected()?.type).toBe('text');
    app.addField('group');
    expect(app.project().fields).toHaveLength(100);
  });
  test('opens an overview, keeps preview independent and reviews only selected languages', (): void => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const app = fixture.componentInstance;
    expect(app.view()).toBe('overview');
    expect(fixture.nativeElement.querySelector('.workspace')).toBeNull();
    window.location.hash = 'guide';
    app.readLocation();
    expect(app.view()).toBe('guide');
    window.location.hash = '';
    app.readLocation();
    expect(app.view()).toBe('overview');
    app.navigate(new Event('click'), 'workspace');
    app.setStep(0);
    expect(app.previewVisible()).toBe(false);
    app.setStep(2);
    expect(app.previewVisible()).toBe(true);
    app.setStep(3);
    expect(app.previewVisible()).toBe(false);
    app.setLanguages('en');
    expect(app.project().languages).toEqual(['en']);
    app.setPreviewLocale('en');
    app.setLocale('de');
    expect(app.previewLocale()).toBe('en');
    app.setLanguages('de');
    app.update({ owner: 'PO', questions: '', title: { de: 'Titel', en: '', fa: '' } });
    app.selectedId.set('name');
    app.fieldText('label', '', 'en');
    app.setReviewer('Reviewer');
    for (let index = 0; index < 5; index++) app.setCheck(index, true);
    expect(app.canApprove()).toBe(true);
    app.setLanguages('both');
    for (let index = 0; index < 5; index++) app.setCheck(index, true);
    expect(app.canApprove()).toBe(false);
  });
  test('keeps invalid patterns out of persistence and checks full values with localized messages', (): void => {
    const app = TestBed.createComponent(AppComponent).componentInstance;
    app.selectedId.set('name');
    app.changePattern('[A-Z]{3}');
    app.fieldText('tooltip', 'Use your reference', 'en');
    app.changePattern('[');
    expect(app.selected()?.pattern).toBe('[A-Z]{3}');
    expect(app.patternError(app.selected()!)).toBe(true);
    expect(JSON.parse(localStorage.getItem('mockforge-studio-v1')!).fields[0].pattern).toBe(
      '[A-Z]{3}',
    );
    app.changePattern('[A-Z]{3}');
    expect(app.patternError(app.selected()!)).toBe(false);
    app.selectedId.set('missing');
    app.changePattern('ignored');
  });
  test('configures buttons immutably, reorders them and preserves bilingual labels', (): void => {
    const app = TestBed.createComponent(AppComponent).componentInstance;
    const previous = app.project();
    app.addButton();
    app.addButton();
    expect(app.project().buttons[2].id).toBe('button-2');
    expect(previous.buttons).toHaveLength(1);
    app.buttonText(1, 'de', 'Zurücksetzen');
    app.buttonChange(1, { action: 'reset', variant: 'secondary', note: 'Clear entries only.' });
    app.buttonClasses(1, 'w-100 <bad>');
    expect(app.project().buttons[1].cssClass).toBe('w-100 bad');
    expect(app.project().buttons[1].label.en).toBe('Submit');
    app.moveButton(1, -1);
    expect(app.project().buttons[0].action).toBe('reset');
    app.moveButton(0, -1);
    app.moveButton(-1, 1);
    app.moveButton(2, 1);
    app.removeButton(0);
    expect(app.project().buttons).toHaveLength(3);
    app.feedback.confirmDelete();
    expect(app.project().buttons).toHaveLength(2);
    app.update({
      buttons: Array.from({ length: 20 }, (_value: unknown, index: number) =>
        createButton(`button-${index}`),
      ),
    });
    app.addButton();
    expect(app.project().buttons).toHaveLength(20);
    app.update({ buttons: [] });
    expect(app.project().submit).toEqual({ de: '', en: '', fa: '' });
  });
  test('adds, edits, reorders and removes a field', (): void => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const app = fixture.componentInstance;
    app.addField();
    const id = app.selectedId();
    app.fieldText('label', 'Neuer Name');
    expect(app.selected()?.label.de).toBe('Neuer Name');
    app.moveField(-1);
    expect(app.project().fields.at(-2)?.id).toBe(id);
    app.removeField();
    expect(app.project().fields.some((f): boolean => f.id === id)).toBe(true);
    app.feedback.cancelDelete();
    expect(app.project().fields.some((f): boolean => f.id === id)).toBe(true);
    app.removeField();
    app.feedback.confirmDelete();
    expect(app.project().fields.some((f): boolean => f.id === id)).toBe(false);
  });
  test('locale switch updates preview and preserves the specification', (): void => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const app = fixture.componentInstance;
    app.view.set('workspace');
    app.previewVisible.set(true);
    app.setPreviewLocale('en');
    app.setLocale('en');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Your next workflow starts here.');
    expect(app.project().title.de).toContain('Workflow');
  });
  test('requires a complete brief and resolved questions before review', (): void => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const app = fixture.componentInstance;
    app.approve();
    expect(app.project().review.approvedAt).toBeNull();
    app.update({ owner: 'Product owner', questions: '' });
    app.setReviewer('Alex');
    for (let index = 0; index < 5; index++) app.setCheck(index, true);
    expect(app.canApprove()).toBe(true);
    app.approve();
    expect(app.project().review.approvedAt).not.toBeNull();
    app.fieldText('label', 'Changed');
    expect(app.project().review.approvedAt).toBeNull();
  });
  test('updates bilingual copy and choices without overwriting the other language', (): void => {
    const app = TestBed.createComponent(AppComponent).componentInstance;
    app.projectText('title', 'de', 'Neuer Titel');
    expect(app.project().title.en).toContain('workflow');
    app.selectedId.set('team');
    app.setLocale('en');
    app.changeOptions('Small\nLarge');
    expect(app.selected()?.options[0].de).toBe('1–10 Personen');
    expect(app.optionLines(app.selected()!)).toBe('Small\nLarge');
    app.changeType('text');
    expect(app.selected()?.options).toEqual([]);
    app.changeType('radio');
    expect(app.selected()?.options).toHaveLength(2);
    app.changeType('select');
    expect(app.selected()?.options).toHaveLength(2);
  });
  test('bounds length rules and safely ignores edits without a selection', (): void => {
    const app = TestBed.createComponent(AppComponent).componentInstance;
    app.selectedId.set('name');
    app.changeLength('maxLength', 10);
    app.changeLength('minLength', 30);
    expect(app.selected()?.minLength).toBe(10);
    app.changeLength('maxLength', -5);
    expect(app.selected()?.maxLength).toBe(0);
    app.changeLength('minLength', NaN);
    expect(app.selected()?.minLength).toBe(0);
    app.changeLength('maxLength', 100000);
    expect(app.selected()?.maxLength).toBe(10000);
    app.selectedId.set('missing');
    app.fieldText('label', 'ignored');
    app.changeType('radio');
    app.changeOptions('ignored');
    app.changeLength('minLength', 4);
    expect(app.selected()).toBeUndefined();
  });
  test('preserves order at movement boundaries and limits the form size', (): void => {
    const app = TestBed.createComponent(AppComponent).componentInstance;
    app.selectedId.set('name');
    app.moveField(-1);
    expect(app.project().fields[0].id).toBe('name');
    app.selectedId.set('privacy');
    app.moveField(1);
    expect(app.project().fields.at(-1)?.id).toBe('privacy');
    app.selectedId.set('missing');
    app.moveField(-1);
    app.update({
      fields: Array.from({ length: 100 }, (_value: unknown, index: number) =>
        createField('text', `field-${index + 1}`),
      ),
    });
    app.addField();
    expect(app.project().fields).toHaveLength(100);
    app.update({ fields: [createField('text', 'field-1')] });
    app.addField();
    expect(app.selectedId()).toBe('field-2');
  });
  test.each([
    'text',
    'email',
    'number',
    'url',
    'date',
    'textarea',
    'select',
    'radio',
    'checkbox',
  ] as FieldType[])('renders a %s field', (type): void => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const app = fixture.componentInstance;
    app.view.set('workspace');
    app.previewVisible.set(true);
    app.update({ fields: [createField(type, 'control')] });
    app.selectedId.set('control');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.preview-field')).not.toBeNull();
    if (type === 'radio')
      expect(fixture.nativeElement.querySelectorAll('input[type=radio]')).toHaveLength(2);
    else expect(fixture.nativeElement.querySelector('#preview-control')).not.toBeNull();
  });
  test('exports the current specification and brief in separate portable formats', (): void => {
    const app = TestBed.createComponent(AppComponent).componentInstance;
    const download = jest.spyOn(app, 'download').mockImplementation((): void => {
      /* Capture the handoff without navigation. */
    });
    app.exportJson();
    expect(JSON.parse(download.mock.calls[0][0]).name).toBe(app.project().name);
    expect(download.mock.calls[0][2]).toBe('json');
    app.exportBrief();
    expect(download.mock.calls[1][0]).toContain('Open questions');
    expect(download.mock.calls[1][2]).toBe('md');
  });
  test('download releases its object URL after initiating a file save', (): void => {
    jest.useFakeTimers();
    const create = jest.fn((): string => 'blob:mockforge');
    const revoke = jest.fn();
    Object.defineProperty(URL, 'createObjectURL', { value: create, configurable: true });
    Object.defineProperty(URL, 'revokeObjectURL', { value: revoke, configurable: true });
    const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation((): void => {
      /* Suppress test DOM navigation. */
    });
    const app = TestBed.createComponent(AppComponent).componentInstance;
    app.download('content', 'text/plain', 'txt');
    expect(click).toHaveBeenCalled();
    jest.runAllTimers();
    expect(revoke).toHaveBeenCalledWith('blob:mockforge');
    click.mockRestore();
    jest.useRealTimers();
  });
  test('confirmed replacement resets imported review, while cancelling preserves state', (): void => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const app = fixture.componentInstance;
    const dialog: HTMLDialogElement = fixture.nativeElement.querySelector('dialog');
    dialog.showModal = jest.fn();
    dialog.close = jest.fn();
    app.loadExample('commerce');
    expect(app.project().name).toContain('Orbit');
    app.cancelReplace();
    expect(app.pending()).toBeNull();
    const incoming = example('agency');
    incoming.review.approvedAt = new Date().toISOString();
    app.requestReplace(incoming);
    const exportSpy = jest.spyOn(app, 'exportJson').mockImplementation((): void => {
      /* Preserve the export-first action in the flow. */
    });
    app.confirmReplace(true);
    expect(exportSpy).toHaveBeenCalled();
    expect(app.project().name).toContain('Forma');
    expect(app.project().review.approvedAt).toBeNull();
    app.confirmReplace();
    expect(app.project().name).toContain('Forma');
  });
  test('valid import awaits replacement, and invalid, unreadable or oversized files preserve state', async (): Promise<void> => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const app = fixture.componentInstance;
    const dialog: HTMLDialogElement = fixture.nativeElement.querySelector('dialog');
    dialog.showModal = jest.fn();
    dialog.close = jest.fn();
    const input = document.createElement('input');
    const event = new Event('change');
    Object.defineProperty(event, 'target', { value: input });
    const file = (content: string, size = 30): void => {
      Object.defineProperty(input, 'files', {
        value: [{ size, text: async (): Promise<string> => content }],
        configurable: true,
      });
    };
    file(JSON.stringify(example('commerce')));
    await app.importFile(event);
    expect(app.pending()?.name).toContain('Northline');
    expect(app.project().name).toContain('Orbit');
    app.cancelReplace();
    file('{}');
    await app.importFile(event);
    expect(app.feedback.toasts().some((toast): boolean => toast.key === 'invalidImport')).toBe(
      true,
    );
    file('{broken');
    await app.importFile(event);
    expect(app.feedback.toasts().some((toast): boolean => toast.key === 'invalidImport')).toBe(
      true,
    );
    file('{}', 2 * 1024 * 1024);
    await app.importFile(event);
    expect(app.feedback.toasts().some((toast): boolean => toast.key === 'tooLarge')).toBe(true);
    Object.defineProperty(input, 'files', { value: [], configurable: true });
    await app.importFile(event);
    expect(app.project().name).toContain('Orbit');
  });
  test('review readiness rejects incomplete translated options and missing fields', (): void => {
    const app = TestBed.createComponent(AppComponent).componentInstance;
    app.update({ owner: 'PO', questions: '' });
    app.setReviewer('Alex');
    app.selectedId.set('team');
    app.fieldChange({ options: [{ de: 'Klein', en: '', fa: '' }] });
    for (let index = 0; index < 5; index++) app.setCheck(index, true);
    expect(app.canApprove()).toBe(false);
    app.update({ fields: [] });
    expect(app.canApprove()).toBe(false);
  });
  test('workspace navigation preserves the specification', (): void => {
    const app = TestBed.createComponent(AppComponent).componentInstance;
    app.view.set('examples');
    app.scrollWorkspace();
    expect(app.view()).toBe('workspace');
    app.update({ columns: 1 });
    expect(app.project().columns).toBe(1);
  });
});
