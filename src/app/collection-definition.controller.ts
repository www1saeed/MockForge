import { computed, Directive, inject, input, signal } from '@angular/core';
import { ProjectStore } from './project.store';
import { CollectionSessionStore } from './collection-session.store';
import {
  CollectionList,
  collectionFields,
  collectionChoice,
  createCollectionList,
} from './collection.model';
import { Field, Locale, Text } from './project.model';
import { CopyKey, translate } from './translations';
import {
  CollectionActionKind,
  CollectionActionSetting,
  DEFAULT_ACTION_ICONS,
  DEFAULT_ACTION_VARIANTS,
} from './collection-presentation';
import { FeedbackService } from './feedback.service';

/** Shared definition mutations keep editor controls and renderer callback guards consistent. */
@Directive()
export class CollectionDefinitionController {
  readonly store = inject(ProjectStore);
  readonly data = inject(CollectionSessionStore);
  readonly feedback = inject(FeedbackService);
  readonly locale = input<Locale>('de');
  readonly contentLanguage = input<Locale | null>(null);
  readonly previewOnly = input(false);
  readonly listId = input<string | null>(null);
  readonly selected = signal('');
  readonly lists = computed(() => this.data.displayLists());
  readonly list = computed<CollectionList | undefined>(() =>
    this.previewOnly()
      ? this.lists().find((list) => list.id === this.listId())
      : (this.lists().find((list) => list.id === this.selected()) ?? this.lists()[0]),
  );
  readonly leaves = computed(() => collectionFields(this.data.renderForm().fields));
  readonly choices = computed(() =>
    this.leaves().filter((field) => !field.id.includes('/') && collectionChoice(field)),
  );
  readonly contentLocale = computed(() =>
    this.store.application().languages.includes(this.contentLanguage() ?? this.locale())
      ? (this.contentLanguage() ?? this.locale())
      : this.store.application().languages[0],
  );
  readonly actions = ['create', 'view', 'edit', 'delete'] as const;
  t(key: CopyKey): string {
    return translate(key, this.locale());
  }
  text(value: Text): string {
    return value[this.contentLocale()];
  }
  field(id: string): Field {
    return this.leaves().find((field) => field.id === id)!;
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
  buttonTitle(kind: CollectionActionKind): string {
    const keys: Record<CollectionActionKind, CopyKey> = {
      create: 'recordNew',
      view: 'recordView',
      edit: 'recordEdit',
      delete: 'recordDelete',
    };
    return this.t(keys[kind]);
  }
  actionLabel(kind: CollectionActionKind): string {
    return this.button(kind).label[this.contentLocale()].trim() || this.buttonTitle(kind);
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
      ...(kind === 'columns' && !enabled && this.list()?.columnSettings
        ? { columnSettings: this.list()!.columnSettings!.filter((column) => column.fieldId !== id) }
        : {}),
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
}
