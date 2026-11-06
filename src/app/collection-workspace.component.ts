import { CollectionCellComponent } from './collection-cell.component';
import { Locale } from './project.model';
import { CollectionActionComponent } from './collection-action.component';
import { CollectionColumnSetting, CollectionActionKind } from './collection-presentation';
import {
  Component,
  computed,
  effect,
  ElementRef,
  signal,
  ViewChild,
  OnDestroy,
  input,
  output,
  linkedSignal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CollectionDefinitionController } from './collection-definition.controller';
import { CollectionList } from './collection.model';
import { RecordContext } from './collection-session.store';
import {
  CollectionRecord,
  formatRecordValue,
  queryCollection,
  collectionValue,
} from './collection-query';
import { Field } from './project.model';
import { FormPreviewComponent } from './form-preview.component';
import { ownResponse, ResponseValues } from './response-values';
@Component({
  selector: 'app-collection-workspace',
  standalone: true,
  imports: [
    NgTemplateOutlet,
    FormsModule,
    FormPreviewComponent,
    CollectionActionComponent,
    CollectionCellComponent,
  ],
  templateUrl: './collection-workspace.component.html',
})
export class CollectionWorkspaceComponent
  extends CollectionDefinitionController
  implements OnDestroy
{
  readonly standalone = input(false);
  readonly showToolbar = input(true);
  readonly selectedLanguage = signal<Locale | null>(null);
  readonly mobile = signal(false);
  readonly fixtureLanguage = signal<Locale | 'mixed' | null>(null);
  readonly syncFixtureCount = input(false);
  readonly fixtureCountChange = output<number>();
  private readonly generationDefaults = computed(
    () => ({
      count: this.data.form().entries?.count ?? 25,
      epoch: this.data.viewSession(),
      session: this.store.projectSession(),
    }),
    { equal: (a, b) => a.count === b.count && a.epoch === b.epoch && a.session === b.session },
  );
  readonly generationCount = linkedSignal({
    source: this.generationDefaults,
    computation: (value): number | null => value.count,
  });
  setGenerationCount(value: number | null): void {
    this.generationCount.set(value);
    if (this.syncFixtureCount() && this.generationValid()) this.fixtureCountChange.emit(value!);
  }
  readonly settingsOpen = signal(false);
  readonly generationValid = computed(() => {
    const count = this.generationCount();
    return (
      count !== null &&
      Number.isInteger(count) &&
      count >= 1 &&
      count <= this.data.limits.recordsPerForm
    );
  });
  override readonly contentLocale = computed(() =>
    this.selectedLanguage() && this.store.application().languages.includes(this.selectedLanguage()!)
      ? this.selectedLanguage()!
      : this.store.application().languages.includes(this.contentLanguage() ?? this.locale())
        ? (this.contentLanguage() ?? this.locale())
        : this.store.application().languages[0],
  );
  dataLanguages(): Locale[] {
    const value = this.fixtureLanguage();
    const languages = this.store.application().languages;
    return value === 'mixed'
      ? [...languages]
      : [value && languages.includes(value) ? value : this.contentLocale()];
  }
  appendOne(): void {
    if (!this.fixturesAllowed()) return;
    void this.data.regenerate(this.data.context(this.list()?.id), this.dataLanguages(), 1, true);
  }
  columnHeading(id: string): string {
    return (
      this.list()
        ?.columnSettings?.find((column) => column.fieldId === id)
        ?.label[this.contentLocale()]?.trim() ||
      this.text(this.field(id).label) ||
      id
    );
  }
  columnSetting(id: string): CollectionColumnSetting | undefined {
    return this.list()?.columnSettings?.find((column) => column.fieldId === id);
  }
  allowed(action: CollectionActionKind): boolean {
    return !!this.list()?.actions[action] && this.data.allowed(action, this.list()?.id);
  }
  fixturesAllowed(replace = false): boolean {
    return (
      this.data.allowed('create', this.list()?.id) &&
      (!replace || !this.data.records().length || this.data.allowed('delete', this.list()?.id))
    );
  }
  rowActions(): CollectionActionKind[] {
    return [...(this.list()?.actionOrder ?? this.actions)].filter(
      (kind) => kind !== 'create' && this.allowed(kind),
    );
  }
  readonly search = signal('');
  readonly filters = signal<ReadonlyMap<string, string | boolean>>(new Map());
  readonly sort = signal<CollectionList['sort'] | null>(undefined);
  readonly effectiveSort = computed(() =>
    this.sort() === undefined ? this.list()?.sort : this.sort(),
  );
  readonly page = signal(0);
  readonly selection = signal<ReadonlySet<string>>(new Set());
  readonly matches = computed(() =>
    this.list()
      ? queryCollection(
          this.data.renderForm(),
          this.list()!,
          this.data.records(),
          {
            search: this.search(),
            filters: this.filters(),
            sort: this.sort(),
          },
          this.contentLocale(),
        )
      : [],
  );
  readonly pages = computed(() =>
    Math.max(1, Math.ceil(this.matches().length / (this.list()?.pageSize ?? 10))),
  );
  readonly currentPage = computed(() => Math.min(this.page(), this.pages() - 1));
  readonly visible = computed(() =>
    this.matches().slice(
      this.currentPage() * this.list()!.pageSize,
      (this.currentPage() + 1) * this.list()!.pageSize,
    ),
  );
  readonly selectedIds = computed(() =>
    this.matches()
      .filter((record) => this.selection().has(record.id))
      .map((record) => record.id),
  );
  readonly pageSelected = computed(
    () =>
      !!this.visible().length && this.visible().every((record) => this.selection().has(record.id)),
  );
  readonly editing = signal<{
    context: RecordContext;
    record?: CollectionRecord;
    mode: 'new' | 'edit' | 'view';
  } | null>(null);
  @ViewChild('recordDialog') dialog!: ElementRef<HTMLDialogElement>;

  constructor() {
    super();
    effect(() => {
      this.data.viewSession();
      void this.data.context(this.list()?.id).accessKey;
      this.list();
      this.data.dataset();
      this.contentLocale();
      this.search.set('');
      this.filters.set(new Map());
      this.sort.set(undefined);
      this.page.set(0);
      this.selection.set(new Set());
      this.close();
    });
  }
  value(record: CollectionRecord, field: Field): string {
    return formatRecordValue(
      field,
      collectionValue(record.values, field.id),
      this.contentLocale(),
      this.columnSetting(field.id)?.groupFields,
    );
  }
  groupRows(record: CollectionRecord, field: Field): ResponseValues[] {
    const rows = ownResponse(record.values, field.id);
    return Array.isArray(rows) ? rows : [];
  }
  order(id: string): void {
    if (this.columnSetting(id)?.sortable === false) return;
    const effective = this.effectiveSort();
    this.sort.set({
      fieldId: id,
      direction: effective?.fieldId === id && effective.direction === 'asc' ? 'desc' : 'asc',
    });
  }
  filter(field: Field, value: string): void {
    const filters = new Map(this.filters());
    if (value === '') filters.delete(field.id);
    else filters.set(field.id, field.type === 'checkbox' ? value === 'true' : value);
    this.filters.set(filters);
    this.page.set(0);
    this.selection.set(new Set());
  }
  searchFor(value: string): void {
    this.search.set(value);
    this.page.set(0);
    this.selection.set(new Set());
  }
  select(id: string, checked: boolean): void {
    const ids = new Set(this.selection());
    if (checked) ids.add(id);
    else ids.delete(id);
    this.selection.set(ids);
  }
  selectPage(checked: boolean): void {
    for (const record of this.visible()) this.select(record.id, checked);
  }
  selectAll(): void {
    this.selection.set(new Set(this.matches().map((record) => record.id)));
  }
  regenerate(): void {
    if (!this.generationValid() || !this.fixturesAllowed(true)) return;
    const context = this.data.context(this.list()?.id),
      count = this.generationCount()!,
      languages = this.dataLanguages();
    const generate = (): void => {
      void this.data.regenerate(context, languages, count);
    };
    if (!this.data.records().length) {
      generate();
      return;
    }
    this.feedback.requestDelete(
      this.t('listGenerate'),
      () => {
        generate();
      },
      'listRegenerateDescription',
    );
  }
  clear(): void {
    if (!this.data.allowed('delete', this.list()?.id)) return;
    const context = this.data.context(this.list()?.id);
    this.feedback.requestDelete(
      this.t('listClear'),
      () => {
        this.data.clear(context);
      },
      'listClearDescription',
    );
  }
  remove(ids: string[]): void {
    if (!this.allowed('delete')) return;
    const context = this.data.context(this.list()?.id),
      list = this.list();
    this.feedback.requestDelete(
      `${ids.length} ${this.t('listRecords')}`,
      () => {
        if (this.list() === list && this.allowed('delete') && this.data.current(context))
          this.data.remove(ids, context);
      },
      'listDeleteRecordsDescription',
    );
  }
  open(mode: 'new' | 'edit' | 'view', record?: CollectionRecord): void {
    const action = mode === 'new' ? 'create' : mode;
    if (!this.allowed(action) || this.data.stale() || this.data.busy()) return;
    this.editing.set({ mode, record, context: this.data.context(this.list()?.id) });
    this.dialog.nativeElement.showModal();
  }
  save(values: ResponseValues): void {
    const editor = this.editing();
    if (!editor || editor.mode === 'view') return;
    if (
      this.allowed(editor.mode === 'new' ? 'create' : 'edit') &&
      this.data.save(values, editor.context, editor.record?.id)
    )
      this.close();
    else this.feedback.notify('listSaveFailed', 'warning');
  }
  close(): void {
    this.editing.set(null);
    this.dialog?.nativeElement.close();
  }
  ngOnDestroy(): void {
    this.close();
    this.data.cancel();
    this.feedback.cancelDelete();
  }
}
