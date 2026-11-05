import { CollectionActionComponent } from './collection-action.component';
import {
  CollectionColumnSetting,
  CollectionActionKind,
  CollectionActionSetting,
  DEFAULT_ACTION_ICONS,
  DEFAULT_ACTION_VARIANTS,
} from './collection-presentation';
import {
  Component,
  computed,
  effect,
  ElementRef,
  signal,
  ViewChild,
  OnDestroy,
  input,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CollectionDefinitionController } from './collection-definition.controller';
import { CollectionList } from './collection.model';
import { RecordContext } from './collection-session.store';
import { CollectionRecord, formatRecordValue, queryCollection } from './collection-query';
import { Field } from './project.model';
import { FormPreviewComponent } from './form-preview.component';
import { ownResponse, ResponseValues } from './response-values';
@Component({
  selector: 'app-collection-workspace',
  standalone: true,
  imports: [FormsModule, FormPreviewComponent, CollectionActionComponent],
  templateUrl: './collection-workspace.component.html',
})
export class CollectionWorkspaceComponent
  extends CollectionDefinitionController
  implements OnDestroy
{
  readonly standalone = input(false);
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
  button(kind: CollectionActionKind): CollectionActionSetting {
    return (
      this.list()?.actionSettings?.[kind] ?? {
        label: { de: '', en: '', fa: '' },
        variant: DEFAULT_ACTION_VARIANTS[kind],
        icon: DEFAULT_ACTION_ICONS[kind],
        display: 'text',
      }
    );
  }
  buttonLabel(kind: CollectionActionKind): string {
    return (
      this.button(kind).label[this.contentLocale()].trim() ||
      this.t(
        kind === 'create'
          ? 'recordNew'
          : kind === 'view'
            ? 'recordView'
            : kind === 'edit'
              ? 'recordEdit'
              : 'recordDelete',
      )
    );
  }
  rowActions(): CollectionActionKind[] {
    return [...(this.list()?.actionOrder ?? this.actions)].filter(
      (kind) => kind !== 'create' && this.list()?.actions[kind],
    );
  }
  readonly search = signal('');
  readonly filters = signal<ReadonlyMap<string, string | boolean>>(new Map());
  readonly sort = signal<CollectionList['sort']>(undefined);
  readonly page = signal(0);
  readonly selection = signal<ReadonlySet<string>>(new Set());
  readonly matches = computed(() =>
    this.list()
      ? queryCollection(
          this.data.form(),
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
      this.list();
      this.data.dataset();
      this.locale();
      this.search.set('');
      this.filters.set(new Map());
      this.sort.set(undefined);
      this.page.set(0);
      this.selection.set(new Set());
      this.close();
    });
  }
  value(record: CollectionRecord, field: Field): string {
    return formatRecordValue(field, ownResponse(record.values, field.id), this.contentLocale());
  }
  groupRows(record: CollectionRecord, field: Field): ResponseValues[] {
    const rows = ownResponse(record.values, field.id);
    return Array.isArray(rows) ? rows : [];
  }
  order(id: string): void {
    if (this.columnSetting(id)?.sortable === false) return;
    const effective = this.sort() ?? this.list()?.sort;
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
    const context = this.data.context();
    if (!this.data.records().length) {
      void this.data.regenerate(context);
      return;
    }
    this.feedback.requestDelete(
      this.t('listGenerate'),
      () => {
        void this.data.regenerate(context);
      },
      'listRegenerateDescription',
    );
  }
  clear(): void {
    const context = this.data.context();
    this.feedback.requestDelete(
      this.t('listClear'),
      () => {
        this.data.clear(context);
      },
      'listClearDescription',
    );
  }
  remove(ids: string[]): void {
    const context = this.data.context(),
      list = this.list();
    this.feedback.requestDelete(
      `${ids.length} ${this.t('listRecords')}`,
      () => {
        if (this.list() === list && list?.actions.delete && this.data.current(context))
          this.data.remove(ids, context);
      },
      'listDeleteRecordsDescription',
    );
  }
  open(mode: 'new' | 'edit' | 'view', record?: CollectionRecord): void {
    const action = mode === 'new' ? 'create' : mode;
    if (!this.list()?.actions[action] || this.data.stale() || this.data.busy()) return;
    this.editing.set({ mode, record, context: this.data.context() });
    this.dialog.nativeElement.showModal();
  }
  save(values: ResponseValues): void {
    const editor = this.editing();
    if (!editor || editor.mode === 'view') return;
    if (
      this.list()?.actions[editor.mode === 'new' ? 'create' : 'edit'] &&
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
