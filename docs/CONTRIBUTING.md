# Contributing to MockForge Studio

Read the [architecture](ARCHITECTURE.md) before changing behavior. Keep this project independent of private packages and other repositories.

## Code organization

- `project.model.ts` defines the framework-independent specification and factories.
- `project.examples.ts`, `project.validation.ts` and `project.handoff.ts` own fictional examples, unknown-input validation and Markdown export respectively. `project.ts` is their public entry point.
- `authoring-guide.component.*` owns the read-only JSON/AI help views. `authoring-guide.reference.ts` reuses JSON examples and shared rules from `src/assets/guides`. `scripts/build-authoring-kit.mjs` derives the downloadable kit from the real model and those assets; regenerate it with `npm run authoring:build` and verify with `npm run authoring:check`.
- `ProjectStore` owns immutable specification changes, persistence, review invalidation and the session-only field clipboard. Clipboard state must never enter project JSON.
- `AppComponent` coordinates navigation and editing. `FieldListComponent` emits selection and structural actions; `FormPreviewComponent` owns temporary native form responses and local simulations.
- `studio.config.ts` holds typed navigation and workflow configuration. All visible copy belongs in the typed German/English base catalog and complete Persian catalog.
- `FeedbackService` owns deletion requests and toast timers; `FeedbackComponent` owns the native confirmation modal and live notification region. Deletion handlers capture stable ids and mutate the specification only inside the confirmed callback.
- `preview-test-data.ts` generates bounded candidates and fills mounted responses. Test data must preserve intentional unchecked answers unless replacement is requested; generated events must not mark answers as user edits. Unsupported patterns are skipped without execution.
- `PreviewFieldComponent` renders native leaf controls; `RepeatGroupComponent` owns transient repeat rows. Keep row identities distinct from definition ids, validate each instance and never persist responses. Group definitions support one level only.
- `src/styles.css` imports styles by responsibility: foundation, shell, workspace, preview, presets and content. Change the owning rule rather than adding another override at the bottom.

Use strict TypeScript and explicit return types. Document public responsibilities and non-obvious constraints in English: explain state ownership, validation boundaries and why browser behavior matters. Avoid comments that merely repeat an assignment. Keep imports flowing from presentation to domain; domain modules do not depend on Angular.

The header and footer frame one scrolling main area. On wide screens the preview sticks inside that area and scrolls internally when needed. Workspace containers use `overflow: clip` so they do not accidentally replace the sticky scrolling ancestor. On narrow screens the preview returns to normal document flow.

Use CSS logical properties for inline spacing and borders so RTL remains a first-class layout rather than an override. Keep technical values such as RegEx patterns, URLs, email addresses and CSS class tokens LTR. Studio direction follows the UI locale; preview direction follows its independently selected form language.

## Local verification

The [quality report](QUALITY.md) records verified test counts, coverage and Clean Code conventions. Keep quality claims tied to actual results. Sonar analysis is not configured; ESLint success is not a Sonar quality-gate result.

Run `npm run format` after editing. CI checks formatting with `npm run format:check`. Before handing off behavior changes, run:

```sh
npm run format:check
npm run lint
npx tsc --noEmit -p tsconfig.spec.json
npm run test:coverage
npm run extract-i18n
npm run authoring:check
npm run build
npm run e2e
```

Tests should protect user behavior and specification boundaries. Inspect responsive screenshots after layout changes. Never persist preview responses or accept an imported acknowledgement as authenticated approval.
`bootstrap-tooltip.directive.ts` owns Bootstrap tooltip setup and disposal for the collapsible main-field rail. Keep imported labels plain text and dispose floating nodes when a trigger changes or disappears. Group-list visibility belongs to AppComponent; saved table spacing belongs to the domain model and ProjectStore.
`field-title.component.ts` renders the shared form title and tooltip trigger. Repeat containers determine tooltip ownership: once in each table header or only in the first current card. Preserve native label/control association, independent checkbox behavior and plain localized tooltip text when changing the markup.

## Documentation and feature comparisons

Keep [authoring tools](AUTHORING_TOOLS.md), [the workshop](PRODUCT_OWNER_WORKSHOP.md), [the demo](SALES_DEMO.md) and the application's DE/EN/FA guide aligned with user-facing behavior. Update README and QUALITY test counts only from completed runs. Reference-repository comparison tests are separate evidence and must never be added to Studio's test total. The [comparison report](FEATURE_COMPARISON.md) records shared behavior and deliberate differences; do not infer full parity from similarly named features.
