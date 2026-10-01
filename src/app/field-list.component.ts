import { Component, computed, input, output, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Field, FIELD_TYPES, FieldType, Locale, Text } from './project.model';
import { CopyKey, translate } from './translations';
import { BootstrapTooltipDirective } from './bootstrap-tooltip.directive';
import { FIELD_ICONS } from './studio.config';

/**
 * Presents field selection and structural actions in one compact, accessible list.
 *
 * This component does not mutate fields or persist anything. Its parent owns the
 * specification and handles every emitted action through ProjectStore, so moving or
 * deleting a field still invalidates the reviewed implementation baseline.
 *
 * Actions apply to the selected row. Keeping one toolbar beside the list avoids
 * repeating three controls on every row and keeps the long inspector uncluttered.
 */
@Component({
  selector: 'app-field-list',
  standalone: true,
  imports: [FormsModule, BootstrapTooltipDirective],
  templateUrl: './field-list.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  host: { class: 'field-list', '[class.field-list-collapsed]': 'collapsed()' },
})
export class FieldListComponent {
  readonly fields = input.required<readonly Field[]>();
  readonly selectedId = input.required<string>();
  readonly locale = input.required<Locale>();
  readonly languages = input.required<readonly Locale[]>();
  readonly collapsible = input(false);
  readonly collapsed = input(false);
  readonly collapsedChange = output<boolean>();
  readonly icons = FIELD_ICONS;

  readonly selected = output<string>();
  readonly moved = output<-1 | 1>();
  readonly removed = output<void>();
  readonly added = output<FieldType>();

  readonly newType = signal<FieldType>('text');
  readonly fieldTypes = input(FIELD_TYPES);
  readonly controlId = input('new-type');
  readonly selectedIndex = computed((): number =>
    this.fields().findIndex((field: Field): boolean => field.id === this.selectedId()),
  );

  /** The list uses an active form language even when the Studio UI uses another one. */
  label(value: Text): string {
    const language = this.languages().includes(this.locale()) ? this.locale() : this.languages()[0];
    return value[language];
  }

  /** Include index, active-language name and type even when only the type icon is visible. */
  tooltipLabel(field: Field, index: number): string {
    return `${(index + 1).toString().padStart(2, '0')} · ${this.label(field.label) || field.id} · ${this.t(field.type)}`;
  }

  t(key: CopyKey): string {
    return translate(key, this.locale());
  }
}
