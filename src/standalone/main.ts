import {
  Component,
  HostListener,
  inject,
  signal,
  DestroyRef,
  provideZoneChangeDetection,
} from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { ApplicationPreviewComponent } from '../app/application-preview.component';
import { FeedbackComponent } from '../app/feedback.component';
import { ProjectStore } from '../app/project.store';
import { CollectionSessionRegistry } from '../app/collection-session.registry';
import { PATTERN_WORKER_FACTORY } from '../app/pattern-check.service';
import { parseApplicationRoute, ApplicationRoute } from '../app/application-navigation';
import { Locale, LOCALES } from '../app/project.model';
import { capturePreview, PreviewPayload } from '../app/preview-export';
import { translate } from '../app/translations';

/** Standalone previews never read or write the Studio workspace. */
export class PreviewProjectStore extends ProjectStore {
  override restore(): void {}
  override persist(): void {}
}
function workerFactory(): () => Worker | null {
  const source: unknown = JSON.parse(document.getElementById('preview-worker')!.textContent!);
  if (typeof source !== 'string') throw new Error('Invalid preview worker');
  const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
  inject(DestroyRef).onDestroy(() => URL.revokeObjectURL(url));
  return () => (typeof Worker === 'undefined' ? null : new Worker(url));
}
@Component({
  selector: 'app-standalone-preview',
  standalone: true,
  imports: [ApplicationPreviewComponent, FeedbackComponent],
  providers: [
    { provide: ProjectStore, useClass: PreviewProjectStore },
    CollectionSessionRegistry,
    { provide: PATTERN_WORKER_FACTORY, useFactory: workerFactory },
  ],
  template: ` <header class="standalone-header">
      <strong>MockForge</strong>
      <span>{{ hint() }}</span>
      <nav [attr.aria-label]="languageLabel()">
        @for (language of languages; track language) {
          <button
            type="button"
            class="secondary-button"
            [attr.aria-pressed]="locale() === language"
            (click)="setLocale(language)"
          >
            {{ language.toUpperCase() }}
          </button>
        }
      </nav>
    </header>
    <main>
      <app-application-preview [standalone]="true" [locale]="locale()" [route]="route()" />
    </main>
    <app-feedback [locale]="locale()" />`,
})
export class StandalonePreviewComponent {
  readonly store = inject(ProjectStore);
  readonly languages = LOCALES;
  readonly locale = signal<Locale>('en');
  readonly route = signal<ApplicationRoute>({ kind: 'home' });
  readonly languageLabel = (): string => translate('interfaceLanguage', this.locale());
  readonly hint = (): string => translate('standaloneHint', this.locale());
  constructor() {
    const value = JSON.parse(
      document.getElementById('preview-payload')!.textContent!,
    ) as PreviewPayload;
    if (value.version !== 1) throw new Error('Unsupported preview');
    const payload = capturePreview(value.project, value.locale);
    this.store.replace(payload.project);
    this.setLocale(payload.locale);
    this.onHash();
  }
  setLocale(locale: Locale): void {
    this.locale.set(locale);
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'fa' ? 'rtl' : 'ltr';
  }
  @HostListener('window:hashchange')
  onHash(): void {
    this.route.set(
      location.hash
        ? (parseApplicationRoute(location.hash) ?? { kind: 'missing' })
        : { kind: 'home' },
    );
  }
}
void bootstrapApplication(StandalonePreviewComponent, {
  providers: [provideZoneChangeDetection()],
});
