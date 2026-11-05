import { Component, ElementRef, inject, signal, OnDestroy, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CollectionDefinitionController } from './collection-definition.controller';
import { CollectionWorkspaceComponent } from './collection-workspace.component';
import {
  CollectionAppearance,
  CollectionColumnSetting,
  CollectionActionKind,
  CollectionActionSetting,
  DEFAULT_APPEARANCE,
  DEFAULT_ACTION_ICONS,
  DEFAULT_ACTION_VARIANTS,
  TABLE_DESIGNS,
  ACTION_ICONS,
} from './collection-presentation';
import { Locale } from './project.model';
@Component({
  selector: 'app-collection-configurator',
  standalone: true,
  imports: [FormsModule, CollectionWorkspaceComponent],
  templateUrl: './collection-configurator.component.html',
})
export class CollectionConfiguratorComponent
  extends CollectionDefinitionController
  implements OnDestroy
{
  readonly previewVisible = input(true);
  readonly previewFullWidth = input(false);
  readonly formSelected = output<string>();
  readonly host: ElementRef<HTMLElement> = inject(ElementRef);
  readonly activeSection = signal('basics');
  readonly designs = TABLE_DESIGNS;
  readonly icons = ACTION_ICONS;
  readonly variants = ['primary', 'secondary', 'ghost', 'danger'] as const;
  readonly sections = [
    'basics',
    'appearance',
    'columns',
    'filters',
    'actions',
    'fixtures',
  ] as const;
  ngOnDestroy(): void {
    this.feedback.cancelDelete();
    this.data.cancel();
  }
  scroll(section: string): void {
    this.activeSection.set(section);
    const element = this.host.nativeElement.querySelector<HTMLElement>(
      section === 'live-preview' ? '#live-preview' : '#list-config-' + section,
    );
    element?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    element?.focus({ preventScroll: true });
  }
  appearance(): CollectionAppearance {
    return this.list()?.appearance ?? DEFAULT_APPEARANCE;
  }
  look(change: Partial<CollectionAppearance>): void {
    this.patch({ appearance: { ...this.appearance(), ...change } });
  }
  column(id: string): CollectionColumnSetting {
    return (
      this.list()?.columnSettings?.find((c) => c.fieldId === id) ?? {
        fieldId: id,
        label: { de: '', en: '', fa: '' },
        align: 'start',
        sortable: true,
      }
    );
  }
  columnPatch(id: string, change: Partial<CollectionColumnSetting>): void {
    this.patch({
      columnSettings: [
        ...(this.list()?.columnSettings ?? []).filter((c) => c.fieldId !== id),
        { ...this.column(id), ...change },
      ],
      ...(change.sortable === false && this.list()?.sort?.fieldId === id
        ? { sort: undefined }
        : {}),
    });
  }
  groupField(id: string, child: string, enabled: boolean): void {
    const selected =
      this.column(id).groupFields ?? this.field(id).group!.fields.map((field) => field.id);
    const groupFields = enabled
      ? [...selected, child]
      : selected.filter((value) => value !== child);
    if (groupFields.length) this.columnPatch(id, { groupFields });
  }
  columnLabel(id: string, lang: Locale, value: string): void {
    this.columnPatch(id, { label: { ...this.column(id).label, [lang]: value } });
  }
  moveColumn(id: string, offset: number): void {
    const columns = [...this.list()!.columns],
      index = columns.indexOf(id),
      target = index + offset;
    if (target < 0 || target >= columns.length) return;
    [columns[index], columns[target]] = [columns[target], columns[index]];
    this.patch({ columns });
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
  buttonPatch(kind: CollectionActionKind, change: Partial<CollectionActionSetting>): void {
    this.patch({
      actionSettings: {
        ...this.list()?.actionSettings,
        [kind]: { ...this.button(kind), ...change },
      },
    });
  }
  buttonLabel(kind: CollectionActionKind, lang: Locale, value: string): void {
    this.buttonPatch(kind, { label: { ...this.button(kind).label, [lang]: value } });
  }
  buttonTitle(kind: CollectionActionKind): string {
    return this.t(
      kind === 'create'
        ? 'recordNew'
        : kind === 'view'
          ? 'recordView'
          : kind === 'edit'
            ? 'recordEdit'
            : 'recordDelete',
    );
  }
  moveAction(kind: CollectionActionKind, offset: number): void {
    const order = [...(this.list()?.actionOrder ?? this.actions)],
      index = order.indexOf(kind),
      target = index + offset;
    if (target < 0 || target >= order.length) return;
    [order[index], order[target]] = [order[target], order[index]];
    this.patch({ actionOrder: order });
  }
}
