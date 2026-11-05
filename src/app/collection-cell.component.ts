import { Component, computed, input } from '@angular/core';
import { Field, Locale } from './project.model';
import { CollectionColumnSetting } from './collection-presentation';
import { collectionValue, formatRecordValue } from './collection-query';
import { ResponseValues, ownResponse } from './response-values';
@Component({
  selector: 'app-collection-cell',
  standalone: true,
  templateUrl: './collection-cell.component.html',
})
export class CollectionCellComponent {
  readonly field = input.required<Field>();
  readonly values = input.required<ResponseValues>();
  readonly locale = input.required<Locale>();
  readonly setting = input<CollectionColumnSetting>();
  readonly mode = computed(
    () => this.setting()?.display ?? (this.field().group ? 'table' : 'text'),
  );
  readonly raw = computed(() => collectionValue(this.values(), this.field().id));
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
