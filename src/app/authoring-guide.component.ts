import { ChangeDetectionStrategy, Component, effect, input, signal } from '@angular/core';
import { Locale } from './project.model';
import { CopyKey, translate } from './translations';
import {
  AUTHORING_EXAMPLES,
  AUTHORING_KIT,
  AUTHORING_PROMPTS,
  AUTHORING_REFERENCE,
  AUTHORING_RULES,
} from './authoring-guide.reference';

/** Read-only authoring help. It never applies a draft or sends prompts to an external service. */
@Component({
  selector: 'app-authoring-guide',
  standalone: true,
  templateUrl: './authoring-guide.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  host: { class: 'content-page authoring-guide' },
})
export class AuthoringGuideComponent {
  readonly locale = input<Locale>('de');
  readonly mode = input<'json' | 'ai'>('json');
  readonly examples = AUTHORING_EXAMPLES;
  readonly reference = AUTHORING_REFERENCE;
  readonly prompts = AUTHORING_PROMPTS;
  readonly kit = AUTHORING_KIT;
  readonly status = signal('');
  readonly kitUrl = new URL(AUTHORING_KIT, document.baseURI).href;

  constructor() {
    effect((): void => {
      this.locale();
      this.mode();
      this.status.set('');
    });
    effect((): void => {
      this.mode();
      const main = document.getElementById('main-content');
      if (main) main.scrollTop = 0;
    });
  }
  t(key: CopyKey): string {
    return translate(key, this.locale());
  }
  json(value: unknown): string {
    return JSON.stringify(value, null, 2);
  }
  prompt(brief: CopyKey): string {
    return `${this.t(brief)}\n\n${AUTHORING_RULES}`;
  }

  /** A readable, selectable fallback also works when clipboard permission is unavailable. */
  async copy(value: string, source: HTMLTextAreaElement): Promise<void> {
    try {
      await navigator.clipboard.writeText(value);
      this.status.set(this.t('authoringCopied'));
    } catch {
      source.focus();
      source.select();
      this.status.set(this.t('authoringCopyFallback'));
    }
  }
}
