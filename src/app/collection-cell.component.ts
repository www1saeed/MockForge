import {
  Component,
  computed,
  input,
  signal,
  effect,
  untracked,
  ViewChild,
  ElementRef,
  OnDestroy,
  inject,
  Injector,
  afterNextRender,
} from '@angular/core';
import { Field, Locale } from './project.model';
import { CollectionColumnSetting } from './collection-presentation';
import { collectionValue, formatRecordValue } from './collection-query';
import { NgTemplateOutlet } from '@angular/common';
import { translate, CopyKey } from './translations';
import { ResponseValues, ownResponse } from './response-values';
@Component({
  selector: 'app-collection-cell',
  standalone: true,
  imports: [NgTemplateOutlet],
  templateUrl: './collection-cell.component.html',
})
export class CollectionCellComponent implements OnDestroy {
  readonly field = input.required<Field>();
  readonly values = input.required<ResponseValues>();
  readonly locale = input.required<Locale>();
  readonly uiLocale = input<Locale>('de');
  private readonly injector = inject(Injector);
  readonly detailsOpen = signal(false);
  @ViewChild('detailsDialog') dialog?: ElementRef<HTMLDialogElement>;
  readonly repeated = computed(() => !!this.field().group || this.field().id.includes('/'));
  readonly title = computed(
    () => this.setting()?.label[this.locale()].trim() || this.field().label[this.locale()],
  );
  readonly setting = input<CollectionColumnSetting>();
  readonly mode = computed(() => {
    const mode = this.setting()?.display ?? (this.field().group ? 'table' : 'text');
    return !this.repeated() && (mode === 'chips' || mode === 'count') ? 'text' : mode;
  });
  readonly dialogMode = computed(
    () =>
      (this.field().group && ['table', 'cards', 'count'].includes(this.mode())) ||
      (this.repeated() && this.mode() === 'count'),
  );
  readonly renderMode = computed(() =>
    this.mode() === 'count' && this.detailsOpen()
      ? this.field().group
        ? 'table'
        : 'text'
      : this.mode(),
  );
  constructor() {
    effect(() => {
      this.field();
      this.values();
      this.setting();
      this.locale();
      untracked(() => this.closeDetails());
    });
  }
  t(key: CopyKey): string {
    return translate(key, this.uiLocale());
  }
  openDetails(): void {
    if (!this.dialogMode() || !this.dialog || this.dialog.nativeElement.open) return;
    this.detailsOpen.set(true);
    const dialog = this.dialog.nativeElement;
    dialog.showModal();
    afterNextRender(
      () => {
        if (this.detailsOpen() && dialog.open && dialog.isConnected)
          dialog.querySelector<HTMLButtonElement>('button')?.focus();
      },
      { injector: this.injector },
    );
  }
  closeDetails(): void {
    this.detailsOpen.set(false);
    if (this.dialog?.nativeElement.open) this.dialog.nativeElement.close();
  }
  ngOnDestroy(): void {
    this.closeDetails();
  }
  readonly raw = computed(() => collectionValue(this.values(), this.field().id));
  readonly itemCount = computed(() =>
    this.field().group
      ? this.rows().length
      : Array.isArray(this.raw())
        ? (this.raw() as unknown[]).length
        : this.raw() === undefined || this.raw() === ''
          ? 0
          : 1,
  );
  readonly rows = computed<ResponseValues[]>(() =>
    this.field().group && Array.isArray(this.raw()) ? (this.raw() as ResponseValues[]) : [],
  );
  readonly children = computed(
    () =>
      this.field().group?.fields.filter(
        (child) => !this.setting()?.groupFields || this.setting()!.groupFields!.includes(child.id),
      ) ?? [],
  );
  readonly parts = computed(() => {
    if (this.field().group)
      return this.rows().map((row) =>
        this.children()
          .map((child) => this.format(child, ownResponse(row, child.id)))
          .join(' · '),
      );
    const value = this.raw();
    return (Array.isArray(value) ? value : [value]).map((item) => this.format(this.field(), item));
  });
  format(field: Field, value: unknown): string {
    return formatRecordValue(field, value, this.locale());
  }
  childValue(row: ResponseValues, child: Field): string {
    return this.format(child, ownResponse(row, child.id));
  }
}
