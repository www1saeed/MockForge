import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { Field, Locale, supportsPattern, Text } from './project.model';
import { CopyKey, translate } from './translations';
import { FieldTitleComponent } from './field-title.component';

export interface PatternInput {
  event: Event;
  field: Field;
}

/**
 * Render one native leaf control using a unique response-instance id.
 * Repeated rows share a field definition, but never a label id or radio name.
 * Values stay in the DOM; pattern events are validated by the owning form preview.
 */
@Component({
  selector: 'app-preview-field',
  standalone: true,
  imports: [FieldTitleComponent],
  templateUrl: './preview-field.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  host: { class: 'preview-field' },
})
export class PreviewFieldComponent {
  readonly field = input.required<Field>();
  readonly locale = input.required<Locale>();
  readonly controlId = input.required<string>();
  readonly showTooltip = input(true);
  readonly patternInput = output<PatternInput>();
  readonly supportsPattern = supportsPattern;
  text(value: Text): string {
    return value[this.locale()];
  }
  t(key: CopyKey): string {
    return translate(key, this.locale());
  }
}
