import {
  Component,
  effect,
  inject,
  input,
  output,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FeedbackService } from './feedback.service';
import { Field, Locale, Text } from './project.model';
import { PatternInput, PreviewFieldComponent } from './preview-field.component';
import { CopyKey, translate } from './translations';
import { FieldTitleComponent } from './field-title.component';
import { BootstrapTooltipDirective } from './bootstrap-tooltip.directive';

interface PreviewRow {
  id: number;
}

/**
 * Owns temporary repeat-row identities, never persisted specification or responses.
 * Monotonic identities keep surviving entries and radio selections stable after a
 * middle row is deleted. Bounds and child definitions come from validated JSON.
 * A changed specification or explicit reset starts fresh rows; locale changes only
 * change copy, so switching preview language preserves current response controls.
 */
@Component({
  selector: 'app-repeat-group',
  standalone: true,
  imports: [PreviewFieldComponent, FieldTitleComponent, BootstrapTooltipDirective],
  templateUrl: './repeat-group.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  host: { class: 'repeat-group full-width' },
})
export class RepeatGroupComponent {
  readonly feedback = inject(FeedbackService);
  readonly field = input.required<Field>();
  readonly locale = input.required<Locale>();
  readonly resetToken = input(0);
  readonly patternInput = output<PatternInput>();
  readonly responsesChanged = output<void>();
  readonly rows = signal<PreviewRow[]>([]);
  private sequence = 0;

  constructor() {
    effect((): void => {
      const group = this.field().group;
      this.resetToken();
      this.rows.set(
        Array.from({ length: group?.minItems ?? 0 }, (): PreviewRow => ({ id: ++this.sequence })),
      );
    });
  }

  text(value: Text): string {
    return value[this.locale()];
  }
  t(key: CopyKey): string {
    return translate(key, this.locale());
  }
  controlId(row: number, child: Field): string {
    // Colons cannot occur in definition ids, preventing collisions with root controls.
    return `preview-${this.field().id}:${row}:${child.id}`;
  }

  addEntry(): void {
    const group = this.field().group;
    if (!group || this.rows().length >= group.maxItems) return;
    this.rows.update((rows): PreviewRow[] => [...rows, { id: ++this.sequence }]);
    this.responsesChanged.emit();
    this.feedback.notify('entryAdded', 'info');
  }

  /** Confirm removal of response values; the shared child definitions remain intact. */
  removeEntry(row: number): void {
    const group = this.field().group;
    const position = this.rows().findIndex((entry): boolean => entry.id === row) + 1;
    if (!group || this.rows().length <= group.minItems || !position) return;
    this.feedback.requestDelete(
      `${this.text(this.field().label)} · ${this.t('entry')} ${position}`,
      (): void => {
        if (
          this.rows().length <= (this.field().group?.minItems ?? 0) ||
          !this.rows().some((entry): boolean => entry.id === row)
        )
          return;
        this.rows.update((rows): PreviewRow[] => rows.filter((entry): boolean => entry.id !== row));
        this.responsesChanged.emit();
        this.feedback.notify('entryDeleted', 'success');
      },
      'deleteEntryDescription',
    );
  }
}
