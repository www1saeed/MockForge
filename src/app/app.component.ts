import {
  Component,
  computed,
  effect,
  ElementRef,
  HostListener,
  inject,
  OnInit,
  signal,
  ViewChild,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormsModule, NgModel } from '@angular/forms';
import {
  BUTTON_ACTIONS,
  BUTTON_VARIANTS,
  createButton,
  createField,
  example,
  Field,
  FieldType,
  FIELD_TYPES,
  FormButton,
  handoff,
  Locale,
  parseProject,
  Project,
  Text,
  validPattern,
  supportsPattern,
  allFields,
  LEAF_FIELD_TYPES,
  RepeatGroup,
  ExampleKind,
} from './project';
import { ProjectStore } from './project.store';
import { copy, CopyKey } from './translations';
import { FieldListComponent } from './field-list.component';
import { FormPreviewComponent } from './form-preview.component';
import { FeedbackComponent } from './feedback.component';
import { FeedbackService } from './feedback.service';
import {
  ACTION_COPY,
  CHECK_COPY,
  NAVIGATION,
  SAMPLES,
  STEP_COPY,
  StudioView,
  THEMES_COPY,
  VARIANT_COPY,
  WORKFLOW,
} from './studio.config';

/**
 * Coordinates navigation, editing and review for the independent Studio application.
 *
 * ProjectStore owns the persisted specification and its invalidation rules. This
 * component keeps editing preferences, selection, modal state and incomplete RegEx
 * drafts. FieldListComponent emits structural edits; FormPreviewComponent owns
 * temporary response values and simulations without writing to the store.
 *
 * Keeping preview language/device preferences here preserves them across show/hide
 * transitions, while destroying a hidden preview discards response values.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormsModule, FieldListComponent, FormPreviewComponent, FeedbackComponent],
  providers: [ProjectStore],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './app.component.html',
})
export class AppComponent implements OnInit {
  @ViewChild('replaceDialog', { static: true }) replaceDialog!: ElementRef<HTMLDialogElement>;
  readonly store = inject(ProjectStore);
  readonly feedback = inject(FeedbackService);
  readonly project = this.store.project;
  readonly locale = signal<Locale>('de');
  readonly view = signal<StudioView>('overview');
  readonly step = signal(0);
  readonly previewVisible = signal(false);
  /** View-only expansion preserves the mounted preview and its unsaved response values. */
  readonly previewFullWidth = signal(false);
  readonly previewLocale = signal<Locale>('de');
  readonly patternDrafts = signal<Partial<Record<string, string>>>({});
  readonly buttonVariants = BUTTON_VARIANTS;
  readonly buttonActions = BUTTON_ACTIONS;
  readonly selectedId = signal('email');
  readonly rootListCollapsed = signal(false);
  readonly groupFieldsOpen = signal(false);
  readonly mobile = signal(false);
  readonly pending = signal<Project | null>(null);
  readonly leafFieldTypes = LEAF_FIELD_TYPES;
  readonly localizedFieldKeys = ['label', 'placeholder', 'help', 'tooltip'] as const;
  readonly navigation = NAVIGATION;
  readonly steps = STEP_COPY;
  readonly checks = CHECK_COPY;
  readonly themes = THEMES_COPY;
  readonly samples = SAMPLES;
  readonly supportsPattern = supportsPattern;
  readonly selected = computed((): Field | undefined =>
    allFields(this.project().fields).find(
      (field: Field): boolean => field.id === this.selectedId(),
    ),
  );
  readonly editingGroup = computed((): Field | undefined =>
    this.project().fields.find(
      (field): boolean =>
        field.type === 'group' &&
        (field.id === this.selectedId() ||
          !!field.group?.fields.some((child): boolean => child.id === this.selectedId())),
    ),
  );
  readonly rootSelectedId = computed((): string => this.editingGroup()?.id ?? this.selectedId());
  readonly childEditorOpen = computed(
    (): boolean => this.groupFieldsOpen() && !!this.editingGroup()?.group,
  );
  readonly availableFieldTypes = computed((): readonly FieldType[] =>
    this.editingGroup() && this.selected()?.type !== 'group' ? LEAF_FIELD_TYPES : FIELD_TYPES,
  );
  readonly canApprove = computed((): boolean => {
    const project = this.project();
    return (
      [
        project.name,
        project.owner,
        project.audience,
        project.goal,
        project.scope,
        project.decisions,
        project.review.reviewer,
      ].every((value: string): boolean => !!value.trim()) &&
      project.languages.every(
        (lang: Locale): boolean =>
          !!project.title[lang].trim() &&
          allFields(project.fields).every(
            (field: Field): boolean =>
              !!field.label[lang].trim() &&
              field.options.every((option: Text): boolean => !!option[lang].trim()),
          ) &&
          project.buttons.every((button: FormButton): boolean => !!button.label[lang].trim()),
      ) &&
      !project.questions.trim() &&
      project.fields.length > 0 &&
      project.buttons.length > 0 &&
      allFields(project.fields).every((field: Field): boolean => !this.patternError(field)) &&
      project.review.checks.every(Boolean)
    );
  });

  constructor() {
    effect((): void => {
      if (this.groupFieldsOpen() && !this.editingGroup()) {
        this.groupFieldsOpen.set(false);
        this.rootListCollapsed.set(false);
      }
    });
    // Signal dependencies emit storage failures on transition, not on every edit.
    effect((): void => {
      if (this.store.storageError()) this.feedback.notify('storageError', 'error');
    });
    effect((): void => {
      if (this.store.restoreError()) this.feedback.notify('restoreError', 'error');
    });
  }

  /** Selecting any main field exits child editing and restores the full main list. */
  selectRootField(id: string): void {
    this.selectedId.set(id);
    this.groupFieldsOpen.set(false);
    this.rootListCollapsed.set(false);
  }

  /** Open a dedicated sibling list/inspector and make space by collapsing the main list. */
  openGroupFields(): void {
    const parent = this.editingGroup();
    const child = parent?.group?.fields[0];
    if (!child) return;
    this.groupFieldsOpen.set(true);
    this.rootListCollapsed.set(true);
    this.selectedId.set(child.id);
  }

  /** Closing returns to the group's own properties rather than an unrelated field. */
  closeGroupFields(): void {
    const id = this.editingGroup()?.id ?? this.selectedId();
    this.selectRootField(id);
  }

  selectChildField(id: string): void {
    this.selectedId.set(id);
    this.groupFieldsOpen.set(true);
    this.rootListCollapsed.set(true);
  }

  /** Restore only validated Studio data, then choose a field and resolve the initial hash view. */
  ngOnInit(): void {
    this.store.restore();
    this.selectedId.set(this.project().fields[0]?.id ?? '');
    this.readLocation();
  }
  /** Honor browser back/forward navigation; unknown hashes safely return to the overview. */
  @HostListener('window:hashchange')
  readLocation(): void {
    const next = window.location.hash.slice(1);
    this.view.set(
      next === 'workspace' || next === 'examples' || next === 'guide' ? next : 'overview',
    );
  }
  /** Keep visible content and shareable hash navigation in agreement. */
  openView(view: StudioView): void {
    this.view.set(view);
    window.location.hash = view;
  }
  /** Use real link destinations for accessibility while coordinating navigation through signals. */
  navigate(event: Event, view: StudioView): void {
    event.preventDefault();
    this.openView(view);
  }
  /** Move keyboard focus directly to the scrolling main region without changing the page. */
  skipToContent(event: Event): void {
    event.preventDefault();
    document.getElementById('main-content')?.focus();
  }
  /** Resolve Studio interface copy without changing the selected form or preview language. */
  t(key: CopyKey): string {
    return copy[key][this.locale() === 'de' ? 0 : 1];
  }
  /** Switch UI copy in place; this is a viewing preference, not a specification change. */
  setLocale(locale: Locale): void {
    this.locale.set(locale);
    document.documentElement.lang = locale;
  }
  /** Retain preview language preference across preview show/hide transitions. */
  setPreviewLocale(locale: Locale): void {
    this.previewLocale.set(locale);
  }
  /** Expand within the Studio shell without changing the selected workflow step. */
  togglePreviewWidth(): void {
    this.previewVisible.set(true);
    this.previewFullWidth.update((expanded): boolean => !expanded);
  }

  togglePreview(): void {
    this.previewFullWidth.set(false);
    this.previewVisible.update((visible): boolean => !visible);
  }

  /** Use preview defaults appropriate to each task; the user can always override visibility. */
  setStep(step: number): void {
    this.previewFullWidth.set(false);
    this.step.set(step);
    this.previewVisible.set(step === WORKFLOW.design || step === WORKFLOW.review);
  }
  /** Retain inactive translations while changing which languages require review. */
  setLanguages(choice: string): void {
    this.update({ languages: choice === 'both' ? ['de', 'en'] : [choice === 'en' ? 'en' : 'de'] });
  }
  /** Use exhaustive, typed maps rather than constructing unchecked translation keys. */
  variantLabel(variant: FormButton['variant']): string {
    return this.t(VARIANT_COPY[variant]);
  }
  /** Describe local simulation behavior explicitly in both interface languages. */
  actionLabel(action: FormButton['action']): string {
    return this.t(ACTION_COPY[action]);
  }
  /** Persist an immutable specification edit and refresh legacy submit-copy compatibility. */
  update(change: Partial<Project>): void {
    this.store.update({
      ...change,
      ...(change.buttons
        ? {
            submit: change.buttons.find((button: FormButton): boolean => button.action === 'submit')
              ?.label ?? { de: '', en: '' },
          }
        : {}),
    });
  }
  /** Update one localized property without overwriting its other translation. */
  projectText(key: 'title' | 'description' | 'submit', locale: Locale, value: string): void {
    const localized = { ...this.project()[key], [locale]: value };
    this.update({
      [key]: localized,
      ...(key === 'submit'
        ? {
            buttons: this.project().buttons.map((button: FormButton): FormButton =>
              button.id === 'submit' ? { ...button, label: localized } : button,
            ),
          }
        : {}),
    });
  }
  /** Replace only the selected field; all changes pass through review invalidation. */
  fieldChange(change: Partial<Field>): void {
    this.updateField(this.selectedId(), change);
  }

  /** Address root or child definitions by stable id, including deferred modal actions. */
  private updateField(id: string, change: Partial<Field>): void {
    this.update({
      fields: this.project().fields.map((field: Field): Field =>
        field.id === id
          ? { ...field, ...change }
          : field.group
            ? {
                ...field,
                group: {
                  ...field.group,
                  fields: field.group.fields.map((child): Field =>
                    child.id === id ? { ...child, ...change } : child,
                  ),
                },
              }
            : field,
      ),
    });
  }
  /** Edit one field translation, leaving structural data and the other locale unchanged. */
  fieldText(
    key: 'label' | 'placeholder' | 'help' | 'tooltip' | 'patternMessage',
    value: string,
    locale: Locale = this.locale(),
  ): void {
    const field = this.selected();
    if (field) this.fieldChange({ [key]: { ...field[key], [locale]: value } });
  }
  /** Keep useful choices when switching between select/radio and clear them for other types. */
  changeType(type: FieldType, control?: NgModel): void {
    const field = this.selected();
    if (!field || field.type === type) return;
    // Restore the visible selection until a destructive conversion is confirmed.
    control?.reset(field.type);
    if (type === 'group' && this.editingGroup()?.id !== field.id && this.editingGroup()) return;
    if (
      type === 'group' &&
      field.type !== 'group' &&
      allFields(this.project().fields).length >= 100
    ) {
      this.feedback.notify('fieldLimit', 'warning');
      return;
    }
    const change: Partial<Field> = {
      type,
      group:
        type === 'group'
          ? (field.group ?? {
              layout: 'cards',
              minItems: 1,
              maxItems: 10,
              fields: [createField('text', this.nextFieldId())],
            })
          : undefined,
      ...(type === 'group' ? { required: true } : {}),
      options:
        type === 'select' || type === 'radio'
          ? field.options.length
            ? field.options
            : createField(type, field.id).options
          : [],
    };
    if (field.type === 'group') {
      this.feedback.requestDelete(
        `${field.label[this.locale()] || field.id} · ${this.t('groupFields')}`,
        (): void => {
          this.updateField(field.id, change);
          this.clearFieldDrafts(field.group?.fields ?? []);
          this.feedback.notify('groupConverted', 'success');
        },
        'deleteGroupFieldsDescription',
      );
    } else this.updateField(field.id, change);
  }
  /** Apply line-based choices by shared row index so both languages describe the same options. */
  changeOptions(value: string, locale: Locale = this.locale()): void {
    const field = this.selected();
    if (!field) return;
    const options = value
      .split('\n')
      .slice(0, 100)
      .map((line: string, index: number): Text => ({
        ...(field.options[index] ?? { de: '', en: '' }),
        [locale]: line,
      }));
    this.fieldChange({ options });
  }
  /** Expose one language of each choice as a separate line in the editor. */
  optionLines(field: Field, locale: Locale = this.locale()): string {
    return field.options.map((option: Text): string => option[locale]).join('\n');
  }
  /** Keep incomplete RegEx edits transient. Valid rules persist; invalid drafts only reset review. */
  changePattern(value: string): void {
    const field = this.selected();
    if (!field) return;
    this.patternDrafts.update(
      (drafts: Partial<Record<string, string>>): Partial<Record<string, string>> => ({
        ...drafts,
        [field.id]: value,
      }),
    );
    if (validPattern(value)) this.fieldChange({ pattern: value });
    else this.store.update({});
  }
  /** Inactive rules cannot block review after switching to a type without pattern support. */
  patternError(field: Field): boolean {
    return (
      this.supportsPattern(field) && !validPattern(this.patternDrafts()[field.id] ?? field.pattern)
    );
  }
  /** Update one button by position while preserving every other immutable action definition. */
  buttonChange(index: number, change: Partial<FormButton>): void {
    this.update({
      buttons: this.project().buttons.map((button: FormButton, position: number): FormButton =>
        position === index ? { ...button, ...change } : button,
      ),
    });
  }
  /** Preserve the other language when editing a button label. */
  buttonText(index: number, locale: Locale, value: string): void {
    this.buttonChange(index, {
      label: { ...this.project().buttons[index].label, [locale]: value },
    });
  }
  /** Accept bounded class tokens only; imported text never becomes a CSS declaration. */
  buttonClasses(index: number, value: string): void {
    this.buttonChange(index, { cssClass: value.replace(/[^a-zA-Z0-9_\s-]/g, '').slice(0, 200) });
  }
  /** Allocate a deterministic unused id and respect the import validator button limit. */
  addButton(): void {
    if (this.project().buttons.length >= 20) {
      this.feedback.notify('buttonLimit', 'warning');
      return;
    }
    let suffix = 1;
    while (
      this.project().buttons.some((button: FormButton): boolean => button.id === `button-${suffix}`)
    )
      suffix++;
    this.update({ buttons: [...this.project().buttons, createButton(`button-${suffix}`)] });
    this.feedback.notify('buttonAdded', 'success');
  }
  /** Remove the addressed action without modifying field data or preview responses. */
  removeButton(index: number): void {
    const button = this.project().buttons[index];
    if (!button) return;
    this.feedback.requestDelete(button.label[this.locale()] || button.id, (): void => {
      this.update({
        buttons: this.project().buttons.filter(
          (item: FormButton): boolean => item.id !== button.id,
        ),
      });
      this.feedback.notify('buttonDeleted', 'success');
    });
  }
  /** Reorder within valid boundaries and leave the original array untouched. */
  moveButton(index: number, direction: -1 | 1): void {
    const buttons = [...this.project().buttons];
    const target = index + direction;
    if (index < 0 || target < 0 || target >= buttons.length) return;
    [buttons[index], buttons[target]] = [buttons[target], buttons[index]];
    this.update({ buttons });
  }
  /** Normalize integer bounds and prevent contradictory minimum/maximum constraints. */
  changeLength(key: 'minLength' | 'maxLength', value: number): void {
    const field = this.selected();
    if (!field) return;
    const length = Math.max(0, Math.min(10000, Math.trunc(Number(value) || 0)));
    const minLength = key === 'minLength' ? length : field.minLength;
    const maxLength = key === 'maxLength' ? length : field.maxLength;
    this.fieldChange({
      minLength: maxLength && minLength > maxLength ? maxLength : minLength,
      maxLength,
    });
  }
  /** Add a fully initialized field with a safe unused id, then select it for immediate editing. */
  addField(type: FieldType = 'text'): void {
    if (allFields(this.project().fields).length + (type === 'group' ? 2 : 1) > 100) {
      this.feedback.notify('fieldLimit', 'warning');
      return;
    }
    const field = createField(type, this.nextFieldId());
    if (field.group) field.group.fields = [createField('text', this.nextFieldId([field.id]))];
    this.update({ fields: [...this.project().fields, field] });
    this.selectRootField(field.id);
    this.feedback.notify('fieldAdded', 'success');
  }
  /** Delete the selected field and retain a valid selection, even when the form becomes empty. */
  removeField(root = false): void {
    const field = root
      ? this.project().fields.find((item): boolean => item.id === this.rootSelectedId())
      : this.selected();
    if (!field) return;
    const parent = this.editingGroup();
    if (parent?.id !== field.id && parent?.group?.fields.length === 1) {
      this.feedback.notify('lastGroupField', 'warning');
      return;
    }
    // Capture stable identity; a later selection change must not change the target.
    this.feedback.requestDelete(field.label[this.locale()] || field.id, (): void => {
      this.update({
        fields: this.project()
          .fields.filter((item): boolean => item.id !== field.id)
          .map((item): Field =>
            item.group
              ? {
                  ...item,
                  group: {
                    ...item.group,
                    fields: item.group.fields.filter((child): boolean => child.id !== field.id),
                  },
                }
              : item,
          ),
      });
      this.selectedId.set(
        parent && parent.id !== field.id
          ? this.groupFieldsOpen()
            ? (this.project().fields.find((item): boolean => item.id === parent.id)?.group
                ?.fields[0]?.id ?? parent.id)
            : parent.id
          : (this.project().fields[0]?.id ?? ''),
      );
      this.feedback.notify('fieldDeleted', 'success');
      this.clearFieldDrafts([field]);
    });
  }
  /** Move the selected field one position, preserving its id, translations and selection. */
  moveField(direction: -1 | 1, root = false): void {
    const parent = this.editingGroup();
    const nested = !root && parent && this.selectedId() !== parent.id;
    const fields = [...(nested ? parent.group!.fields : this.project().fields)];
    const from = fields.findIndex(
      (field: Field): boolean => field.id === (root ? this.rootSelectedId() : this.selectedId()),
    );
    const to = from + direction;
    if (from < 0 || to < 0 || to >= fields.length) return;
    [fields[from], fields[to]] = [fields[to], fields[from]];
    this.update({
      fields: nested
        ? this.project().fields.map((field): Field =>
            field.id === parent.id ? { ...field, group: { ...parent.group!, fields } } : field,
          )
        : fields,
    });
  }

  /** Allocate ids across root and child definitions, keeping label targets globally unique. */
  private nextFieldId(reserved: string[] = []): string {
    const ids = new Set([
      ...allFields(this.project().fields).map((field): string => field.id),
      ...reserved,
    ]);
    let suffix = 1;
    while (ids.has(`field-${suffix}`)) suffix++;
    return `field-${suffix}`;
  }

  /** A deleted id may be reused; its transient RegEx draft must not attach to a new field. */
  private clearFieldDrafts(fields: readonly Field[]): void {
    const removed = new Set(allFields(fields).map((field): string => field.id));
    this.patternDrafts.update((drafts): Partial<Record<string, string>> =>
      Object.fromEntries(Object.entries(drafts).filter(([id]): boolean => !removed.has(id))),
    );
  }

  /** Group limits apply to response rows, not to the number of specification fields. */
  groupChange(change: Partial<RepeatGroup>): void {
    const parent = this.editingGroup();
    if (!parent?.group) return;
    const group = { ...parent.group, ...change };
    group.maxItems = Math.max(1, Math.min(20, Math.trunc(Number(group.maxItems) || 1)));
    group.minItems = Math.max(0, Math.min(group.maxItems, Math.trunc(Number(group.minItems) || 0)));
    this.update({
      fields: this.project().fields.map((field): Field =>
        field.id === parent.id ? { ...field, group, required: group.minItems > 0 } : field,
      ),
    });
  }

  /** Add only leaf controls to a repeat group; all edits still invalidate review. */
  addGroupField(type: FieldType): void {
    const parent = this.editingGroup();
    if (!parent?.group || type === 'group') return;
    if (parent.group.fields.length >= 20) {
      this.feedback.notify('groupFieldLimit', 'warning');
      return;
    }
    if (allFields(this.project().fields).length >= 100) {
      this.feedback.notify('fieldLimit', 'warning');
      return;
    }
    const child = createField(type, this.nextFieldId());
    this.groupChange({ fields: [...parent.group.fields, child] });
    this.selectChildField(child.id);
    this.feedback.notify('fieldAdded', 'success');
  }
  /** Checklist changes cannot retain an earlier acknowledgement timestamp. */
  setCheck(index: number, checked: boolean): void {
    const review = this.project().review;
    const checks = [...review.checks];
    checks[index] = checked;
    this.store.updateReview({ ...review, checks, approvedAt: null });
  }
  /** Changing the named reviewer requires a new acknowledgement of the baseline. */
  setReviewer(reviewer: string): void {
    this.store.updateReview({ ...this.project().review, reviewer, approvedAt: null });
  }
  /** Record a local acknowledgement only when the current specification is ready for review. */
  approve(): void {
    if (this.canApprove()) {
      this.store.updateReview({ ...this.project().review, approvedAt: new Date().toISOString() });
      this.feedback.notify('reviewRecorded', 'success');
    }
  }
  /** Stage a project and use the native modal for focus containment and cancellation. */
  requestReplace(project: Project): void {
    this.pending.set(project);
    this.replaceDialog.nativeElement.showModal();
  }
  /** Discard pending replacement without changing the working specification. */
  cancelReplace(): void {
    this.pending.set(null);
    this.replaceDialog.nativeElement.close();
  }
  /** Treat examples as replacements so an existing working draft is never lost silently. */
  loadExample(kind: ExampleKind): void {
    this.requestReplace(example(kind));
  }
  /** Honor export-first and clear imported reviewer identity before replacing the draft. */
  confirmReplace(saveFirst = false): void {
    const next = this.pending();
    if (!next) return;
    if (saveFirst) this.exportJson();
    // Imported acknowledgements cannot certify a review in this workspace.
    this.store.replace({
      ...next,
      review: { checks: [false, false, false, false, false], reviewer: '', approvedAt: null },
    });
    this.cancelReplace();
    this.patternDrafts.set({});
    this.selectRootField(next.fields[0]?.id ?? '');
    this.openView('workspace');
    this.setStep(WORKFLOW.fields);
    this.feedback.notify('projectReplaced', 'success');
  }
  /** Check file size before parsing, then validate or upgrade before staging replacement. */
  async importFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (file.size > 1024 * 1024) {
      this.feedback.notify('tooLarge', 'error');
      return;
    }
    try {
      const parsed: unknown = JSON.parse(await file.text());
      const imported = parseProject(parsed);
      if (!imported) {
        this.feedback.notify('invalidImport', 'error');
        return;
      }
      this.requestReplace(imported);
    } catch {
      this.feedback.notify('invalidImport', 'error');
    }
  }
  /** Start a local download and release its temporary Blob URL after the browser consumes it. */
  download(content: string, type: string, extension: string): void {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${
      this.project()
        .name.replace(/[^a-z0-9_-]+/gi, '-')
        .toLowerCase() || 'mockforge'
    }.${extension}`;
    anchor.click();
    setTimeout((): void => URL.revokeObjectURL(url), 1000);
  }
  /** Export the saved specification; transient pattern drafts and responses stay private. */
  exportJson(): void {
    this.download(JSON.stringify(this.project(), null, 2), 'application/json', 'json');
    this.feedback.notify('jsonExported', 'info');
  }
  /** Render a framework-independent brief for product-owner and implementation discussions. */
  exportBrief(): void {
    this.download(handoff(this.project()), 'text/markdown', 'md');
    this.feedback.notify('briefExported', 'info');
  }
  /** Open the workspace from the overview without rebuilding the specification. */
  scrollWorkspace(): void {
    this.openView('workspace');
  }
}
