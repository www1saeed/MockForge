import {
  afterRenderEffect,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { ApplicationPreviewSession } from './application-preview.session';
import {
  ApplicationRoute,
  ApplicationTarget,
  applicationHref,
  applicationMenu,
  resolveApplicationTarget,
} from './application-navigation';
import { ProjectStore } from './project.store';
import { CollectionSessionStore } from './collection-session.store';
import { COLLECTION_VIEW } from './collection-view';
import { CollectionWorkspaceComponent } from './collection-workspace.component';
import { FormPreviewComponent } from './form-preview.component';
import { PatternCheckService } from './pattern-check.service';
import { Locale } from './project.model';
import { CopyKey, translate } from './translations';

@Component({
  selector: 'app-application-preview',
  standalone: true,
  imports: [FormPreviewComponent, CollectionWorkspaceComponent],
  providers: [
    ApplicationPreviewSession,
    CollectionSessionStore,
    PatternCheckService,
    { provide: COLLECTION_VIEW, useExisting: ApplicationPreviewSession },
  ],
  templateUrl: './application-preview.component.html',
})
export class ApplicationPreviewComponent {
  readonly store = inject(ProjectStore);
  readonly scope = inject(ApplicationPreviewSession);
  readonly data = inject(CollectionSessionStore);
  readonly locale = input<Locale>('de');
  readonly route = input<ApplicationRoute>({ kind: 'home' });
  readonly selectedLocale = signal<Locale | null>(null);
  readonly mobile = signal(false);
  readonly language = computed(() => {
    const requested = this.selectedLocale() ?? this.locale();
    return this.store.application().languages.includes(requested)
      ? requested
      : this.store.application().languages[0];
  });
  readonly target = computed(() =>
    resolveApplicationTarget(this.store.application(), this.route()),
  );
  readonly menu = computed(() => applicationMenu(this.store.application()));
  readonly sessions = computed(() => [
    { id: `${this.store.projectSession()}:${this.scope.epoch()}` },
  ]);
  readonly heading = viewChild<ElementRef<HTMLHeadingElement>>('screenTitle');
  readonly href = applicationHref;
  constructor() {
    effect(() => {
      const target = this.target();
      untracked(() => this.scope.select(target));
    });
    effect(() => {
      this.locale();
      this.selectedLocale.set(null);
    });
    afterRenderEffect(() => {
      this.scope.epoch();
      this.store.projectSession();
      this.heading()?.nativeElement.focus();
    });
  }
  t(key: CopyKey): string {
    return translate(key, this.locale());
  }
  title(target: ApplicationTarget): string {
    const form = this.store.application().forms.find((form) => form.id === target.formId)!;
    return (
      (target.kind === 'form'
        ? form.title
        : form.lists!.find((list) => list.id === target.listId)!.title)[this.language()] ||
      (target.kind === 'form' ? target.formId : target.listId)
    );
  }
  active(item: ApplicationTarget): boolean {
    return JSON.stringify(this.target()) === JSON.stringify(item);
  }
}
