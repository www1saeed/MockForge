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

## E2E organization and selection

All 50 current Chromium journeys carry discovery-time metadata. Register each
`e2e/*.spec.ts` in `e2e/test-catalogue.json`. Use `tagsFor` on every test with a
stable, globally unique case ID, owning suite, one or more functional areas and
the checks actually exercised. Case IDs must stay stable when titles or file
positions change. Suite defaults describe its normal consumers; override areas
for mixed suites such as `studio` and `presentation`.

| Command | Scope |
| --- | --- |
| `npm run e2e` | Full Chromium regression; remains the default |
| `npm run e2e -- --plan` | List the full plan without running browsers |
| `npm run e2e -- --area preview,groups --plan` | Inspect area selection plus smoke |
| `npm run e2e -- --area patterns --check a11y` | Pattern accessibility journeys plus smoke |
| `npm run e2e -- --check responsive,i18n` | Responsive or i18n journeys plus smoke |
| `npm run e2e:smoke` | Five core journeys |
| `npm run e2e:check` | Ten selector tests plus real Playwright discovery/catalogue validation |
| `npm run typecheck:e2e` | Strict typecheck of E2E, helpers and Playwright config |
| `npm run e2e:full -- --grep …` | Raw Playwright command for advanced filtering/debugging |

Areas are `authoring`, `forms`, `lists`, `roles`, `navigation`, `preview`, `groups`,
`transfer`, `persistence`, `review`, `shell`, `guide`, `presentation`, `test-data`
and `patterns`. The `forms` area covers the active multi-form journeys. The `lists` area covers `collections.spec.ts`. The `navigation` area covers `application-navigation.spec.ts`. The future roles area has no tests yet; requesting it fails until its journeys are implemented. Checks
are `a11y`, `keyboard`, `responsive`, `i18n` and `performance`. The performance tag
currently identifies the existing 500-record responsiveness observation; it does
not establish a benchmark or a representative-device guarantee.

Multiple areas form a union; multiple checks form a union. Supplying both takes
their intersection, then adds smoke. A requested empty selection fails even when
smoke could run. Unknown flags/tags, unregistered suites, duplicate case IDs and
missing metadata fail. `--list` is an alias for `--plan`. Discovery imports specs
but starts no browser/dev server and builds no batch harness; keep future
expensive setup in hooks or fixtures, not at module scope.

Smoke is bounded to 3–8 individually tagged journeys and includes i18n. Its five
current cases cover project transfer/reload, native validation, review/handoff,
answer-preserving test data and Persian/RTL. It is a quick regression signal;
run the affected feature journeys as well. These tags describe checks within
existing journeys, not independently selectable browser/locale/theme variants.
No Firefox/WebKit acceptance or full DE/EN/FA/theme cross-product is claimed.

CI validates selectors/catalogue/types and keeps the full browser regression for
pushes and pull requests. Manual runs may choose `full`, `smoke` or `selected`
and provide areas/checks. Publishing requires `full`. Failed tests keep traces
and screenshots; HTML, JUnit and failure artifacts are uploaded even on failure.
Two workers and zero retries remain the baseline. Do not report retries as a
clean first-attempt run. Raw `e2e:full` filtering bypasses catalogue selection,
so run `e2e:check` alongside it. Manual GitHub workflow execution has not been
verified by the local checks.

Selection is currently **explicit**, not inferred from Git changes. Add a
conservative change-impact map after the application store/feature boundaries
are integrated. Domain/store/shared styles must select their dependent journeys;
unknown production paths must widen the run. Keep a full pre-release regression.
New multi-form journeys use `e2e/support/workspace.ts` and `data-step` identities. As workflow steps expand, migrate remaining positional selectors to stable step
identities and introduce shared project/import/navigation fixtures. Add new
feature suites for multiple forms, lists, roles and navigation rather than
extending the mixed `studio.spec.ts` indefinitely. Test state must remain
independent per browser context. When upgrading Playwright, align its pinned
`playwright-core` dependency used by Axe and rerun `typecheck:e2e` and browser
regression; do not suppress cross-version `Page` incompatibilities with casts.

## Documentation and feature comparisons

Keep [authoring tools](AUTHORING_TOOLS.md), [the workshop](PRODUCT_OWNER_WORKSHOP.md), [the demo](SALES_DEMO.md) and the application's DE/EN/FA guide aligned with user-facing behavior. Update README and QUALITY test counts only from completed runs. Reference-repository comparison tests are separate evidence and must never be added to Studio's test total. The [comparison report](FEATURE_COMPARISON.md) records shared behavior and deliberate differences; do not infer full parity from similarly named features.

## Extending preview data

Use `response-constraints.ts` for length semantics shared with native response validation. Assert expected versus observed browser validity, not only candidate strings; native tooShort/tooLong is unreliable for assigned values. Add cases to `preview-test-data.spec.ts` and `e2e/preview-test-data.spec.ts`. Preserve unchecked edits, stable group rows, rollback on mismatch and unchanged LocalStorage/review. Keep unsupported expressions outside candidate evaluation and construction bounded. Update [the tools guide](AUTHORING_TOOLS.md), [roadmap](TEST_DATA_GENERATOR_PLAN.md), [comparison](FEATURE_COMPARISON.md), current test/coverage figures and the actual HTML deck after verified changes.

For coherent records, extend `preview-data-record.ts` with independently authored fixtures and conservative phrases. Keep technical email values ASCII/example.org, keep original scripts in native text, report ambiguity and preserve source precedence. Test relationships between fields and actual preview reset rather than merely matching fixture snapshots. Do not key record data by transient DOM ids, infer a new identity from manual answers or depend on the system clock. Persisted hints/examples require a separate contract change; do not silently append them to Studio 1.3.0.

For pattern work, keep `preview-pattern.ts` admission conservative: static bounds must apply before native matching. Deferred expressions belong only in `assets/preview-pattern.worker.js`, through the component-scoped `PatternCheckService`. Never restore an uncertain native pattern attribute or synchronous renderer evaluation. Preserve worker cleanup, per-job late-event guards, queue/input/deadline budgets, cancellation and request/interaction snapshots. Test with real Chromium workers for catastrophic input and a controlled stalled worker for cancellation; unit doubles alone do not establish isolation. Update worker assets and source together for deployments.

For batch changes, read [the API contract](TEST_DATA_BATCH_API.md). Keep native validation shared with the preview, output omission for skipped answers, bounded setup before DOM allocation, snapshots, complete-record cancellation and honest observed diversity. Do not use record IDs/seeds to manufacture diversity. Run `preview-data-batch.spec.ts` in Jest and Chromium; the latter bundles the developer API only into its test harness, without adding a debug global or API screen to the production app. Timing is a local smoke observation, not a cross-device acceptance guarantee.

Preserve worker backpressure at callers: large-table Submit must pass on its first attempt without increasing queue limits. Keep pending requests stable across copy-only edits and resolve current rules/messages at completion. Do not regress single-input radio checked state, optional undefined defaults or the shared scope/reason/ID helpers. Finite matchers may be cached only after bounded admission; arbitrary expressions still belong exclusively in workers.

## Standalone preview changes

`npm start` and `npm run build` regenerate the separate AOT preview runtime before serving/packaging Studio. Restart the dev server after changing shared preview code to refresh exports. Never commit generated bundles; test the downloaded file offline rather than testing an HTML template alone. The `standalone-preview` suite belongs to transfer/navigation/lists/preview; selection discovery remains build-free. See [the runtime contract](STANDALONE_PREVIEW.md).

## Updating examples

Edit the canonical JSON in `src/assets/guides`; `application-examples.ts` supplies gallery and authoring metadata and validated copies. Preserve stable form/list IDs so future rights can target those scopes. Keep planned roles in brief/questions instead of inventing schema properties or permission guarantees. Regenerate the authoring kit and run the `examples` and authoring-guide browser suites. See [example intent and boundaries](EXAMPLES.md).
