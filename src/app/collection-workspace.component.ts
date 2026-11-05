import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  ViewChild,
  OnDestroy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProjectStore } from './project.store';
import { CollectionSessionStore, RecordContext } from './collection-session.store';
import {
  CollectionList,
  collectionChoice,
  collectionLeaves,
  createCollectionList,
} from './collection.model';
import { CollectionRecord, formatRecordValue, queryCollection } from './collection-query';
import { Field, Locale, Text } from './project.model';
import { CopyKey, translate } from './translations';
import { FeedbackService } from './feedback.service';
import { FormPreviewComponent } from './form-preview.component';
import { ownResponse, ResponseValues } from './response-values';

@Component({
  selector: 'app-collection-workspace',
  standalone: true,
  imports: [FormsModule, FormPreviewComponent],
  templateUrl: './collection-workspace.component.html',
})
export class CollectionWorkspaceComponent implements OnDestroy {
  readonly store = inject(ProjectStore);
  readonly data = inject(CollectionSessionStore);
  readonly feedback = inject(FeedbackService);
  readonly locale = input<Locale>('de');
  readonly contentLanguage = input<Locale | null>(null);
  readonly previewOnly = input(false);
  readonly listId = input<string | null>(null);
  readonly selected = signal('');
  readonly lists = computed(() => this.data.form().lists ?? []);
  readonly list = computed<CollectionList | undefined>(() =>
    this.previewOnly()
      ? this.lists().find((list) => list.id === this.listId())
      : (this.lists().find((list) => list.id === this.selected()) ?? this.lists()[0]),
  );
  readonly leaves = computed(() => collectionLeaves(this.data.form().fields));
  readonly choices = computed(() => this.leaves().filter(collectionChoice));
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
  readonly contentLocale = computed(() =>
    this.store.application().languages.includes(this.contentLanguage() ?? this.locale())
      ? (this.contentLanguage() ?? this.locale())
      : this.store.application().languages[0],
  );
  readonly editing = signal<{
    context: RecordContext;
    record?: CollectionRecord;
    mode: 'new' | 'edit' | 'view';
  } | null>(null);
  @ViewChild('recordDialog') dialog!: ElementRef<HTMLDialogElement>;
  readonly actions = ['create', 'view', 'edit', 'delete'] as const;

  constructor() {
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
  t(key: CopyKey): string {
    return translate(key, this.locale());
  }
  text(value: Text): string {
    return value[this.contentLocale()];
  }
  field(id: string): Field {
    return this.leaves().find((field) => field.id === id)!;
  }
  value(record: CollectionRecord, field: Field): string {
    return formatRecordValue(field, ownResponse(record.values, field.id), this.contentLocale());
  }
  groupRows(record: CollectionRecord, field: Field): ResponseValues[] {
    const rows = ownResponse(record.values, field.id);
    return Array.isArray(rows) ? rows : [];
  }
  patch(change: Partial<CollectionList>): void {
    if (this.previewOnly() || !this.list()) return;
    this.store.updateCollections(
      this.lists().map((list) => (list.id === this.list()!.id ? { ...list, ...change } : list)),
    );
  }
  title(value: string, lang: Locale): void {
    this.patch({ title: { ...this.list()!.title, [lang]: value } });
  }
  add(): void {
    if (this.previewOnly()) return;
    const list = createCollectionList(this.data.form().fields, this.lists());
    if (this.store.updateCollections([...this.lists(), list])) this.selected.set(list.id);
  }
  duplicate(): void {
    if (this.previewOnly()) return;
    const source = this.list();
    if (!source) return;
    const id = createCollectionList(this.data.form().fields, this.lists()).id;
    if (this.store.updateCollections([...this.lists(), { ...source, id }])) this.selected.set(id);
  }
  move(offset: number): void {
    if (this.previewOnly()) return;
    const lists = [...this.lists()],
      index = lists.indexOf(this.list()!),
      target = index + offset;
    if (target < 0 || target >= lists.length) return;
    [lists[index], lists[target]] = [lists[target], lists[index]];
    this.store.updateCollections(lists);
  }
  removeList(): void {
    if (this.previewOnly()) return;
    const list = this.list(),
      context = this.data.context();
    if (!list) return;
    this.feedback.requestDelete(
      this.text(list.title),
      () => {
        if (!this.previewOnly() && this.data.current(context) && this.list() === list)
          this.store.updateCollections(this.lists().filter((item) => item.id !== list.id));
      },
      'listDeleteDescription',
    );
  }
  toggle(kind: 'columns' | 'searchFields' | 'filters', id: string, enabled: boolean): void {
    const values = this.list()![kind];
    this.patch({
      [kind]: enabled ? [...values, id] : values.filter((value) => value !== id),
      ...(kind === 'columns' && !enabled && this.list()?.sort?.fieldId === id
        ? { sort: undefined }
        : {}),
    });
  }
  preset(field: Field, raw: string): void {
    this.patch({
      presets: [
        ...this.list()!.presets.filter((p) => p.fieldId !== field.id),
        ...(raw === ''
          ? []
          : [{ fieldId: field.id, value: field.type === 'checkbox' ? raw === 'true' : raw }]),
      ],
    });
  }
  presetValue(id: string): string {
    return String(this.list()!.presets.find((p) => p.fieldId === id)?.value ?? '');
  }
  action(key: (typeof this.actions)[number], value: boolean): void {
    this.patch({ actions: { ...this.list()!.actions, [key]: value } });
  }
  entries(key: 'count' | 'seed', value: number): void {
    if (this.previewOnly()) return;
    this.store.updateCollections(this.lists(), {
      ...(this.data.form().entries ?? { count: 25, seed: 1 }),
      [key]: value,
    });
  }
  defaultSort(id: string): void {
    this.patch({ sort: id ? { fieldId: id, direction: 'asc' } : undefined });
  }
  order(id: string): void {
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
