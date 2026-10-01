# Contributing to MockForge Studio

Read the [architecture](ARCHITECTURE.md) before changing behavior. Keep this project independent of private packages and other repositories.

## Code organization

- `project.model.ts` defines the framework-independent specification and factories.
- `project.examples.ts`, `project.validation.ts` and `project.handoff.ts` own fictional examples, unknown-input validation and Markdown export respectively. `project.ts` is their public entry point.
- `ProjectStore` owns immutable specification changes, persistence and review invalidation.
- `AppComponent` coordinates navigation and editing. `FieldListComponent` emits selection and structural actions; `FormPreviewComponent` owns temporary native form responses and local simulations.
- `studio.config.ts` holds typed navigation and workflow configuration. All visible copy belongs in the paired German/English catalog.
- `FeedbackService` owns deletion requests and toast timers; `FeedbackComponent` owns the native confirmation modal and live notification region. Deletion handlers capture stable ids and mutate the specification only inside the confirmed callback.
- `PreviewFieldComponent` renders native leaf controls; `RepeatGroupComponent` owns transient repeat rows. Keep row identities distinct from definition ids, validate each instance and never persist responses. Group definitions support one level only.
- `src/styles.css` imports styles by responsibility: foundation, shell, workspace, preview, presets and content. Change the owning rule rather than adding another override at the bottom.

Use strict TypeScript and explicit return types. Document public responsibilities and non-obvious constraints in English: explain state ownership, validation boundaries and why browser behavior matters. Avoid comments that merely repeat an assignment. Keep imports flowing from presentation to domain; domain modules do not depend on Angular.

The header and footer frame one scrolling main area. On wide screens the preview sticks inside that area and scrolls internally when needed. Workspace containers use `overflow: clip` so they do not accidentally replace the sticky scrolling ancestor. On narrow screens the preview returns to normal document flow.

## Local verification

The [quality report](QUALITY.md) records verified test counts, coverage and Clean Code conventions. Keep quality claims tied to actual results. Sonar analysis is not configured; ESLint success is not a Sonar quality-gate result.

Run `npm run format` after editing. CI checks formatting with `npm run format:check`. Before handing off behavior changes, run:

```sh
npm run format:check
npm run lint
npm run test:coverage
npm run extract-i18n
npm run build
npm run e2e
```

Tests should protect user behavior and specification boundaries. Inspect responsive screenshots after layout changes. Never persist preview responses or accept an imported acknowledgement as authenticated approval.
`bootstrap-tooltip.directive.ts` owns Bootstrap tooltip setup and disposal for the collapsible main-field rail. Keep imported labels plain text and dispose floating nodes when a trigger changes or disappears. Group-list visibility belongs to AppComponent; saved table spacing belongs to the domain model and ProjectStore.
`field-title.component.ts` renders the shared form title and tooltip trigger. Repeat containers determine tooltip ownership: once in each table header or only in the first current card. Preserve native label/control association, independent checkbox behavior and plain localized tooltip text when changing the markup.
