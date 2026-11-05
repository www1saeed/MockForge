# Code quality and test evidence

## List designer and independent shell checkpoint — November 5, 2026

**269 Studio tests pass: 196 Jest unit/component cases in 27 suites and 73 Chromium journeys.** Ten E2E selector checks pass separately. Coverage: 95.65% statements, 90.37% branches, 96.25% functions and 97.55% lines (src/app/*.ts; standalone bootstrap is covered in Chromium). Format/lint/app+spec+E2E types, 534 translations, synchronized authoring kit, local documentation targets and build pass.

The four workflow tabs combine Project & design and separate form fields, detailed list configuration and review. Five new unit cases cover 2.1 migration, bounded presentation, pruning, disabled sorting, persisted configuration and confirmation disposal. Two new registered browser journeys cover the merged page, saved column/design/action settings, accessible icon-only actions, matching offline output, Persian mobile layout/Axe and keyboard menu/focus behavior. Existing journeys use semantic workflow identities and preserve their regression assertions. Full evidence: reports/pr8-list-designer-final-e2e.json. The final run has no retries/skips/flaky/unexpected results; CI still needs its own run after push.

Studio JSON is now 2.2.0; 2.1.0 and earlier supported inputs migrate with old approval retired. The configurator is deferred until its tab opens; the standalone build reuses only record interaction/rendering. Four finite table designs, bounded column settings and built-in action icons require no new dependency or arbitrary CSS. Worker/generation/storage resource limits and existing bundle budgets remain unchanged. Production initial bundle is 987.32 kB against the unchanged 700 kB warning / 1 MB failure; the deferred configurator is 18.43 kB. The HTML app has its own project header/sidebar/mobile disclosure and omits Studio form toolbars and fake browser chrome. Configurator, standalone desktop/mobile and changed fifteen-slide deck content were visually inspected. The old ignored PDF remains a separate export.

## Progressive examples checkpoint — November 5, 2026

**262 Studio tests pass: 191 Jest unit/component tests in 25 suites and 71 Chromium journeys.** Ten E2E selector Node checks pass separately. Jest coverage is 95.93% statements, 90.60% branches, 96.67% functions and 97.78% lines. Format/lint/app+spec+E2E types, 484 translations, authoring-kit synchronization, 131 local documentation targets and production build pass. Schema, dependencies, worker/generation limits and build budgets remain unchanged.

The current three-level gallery, JSON guide, downloads and authoring kit share the same canonical 2.1.0 assets. Three unit cases cover valid progressive configurations/translations, detached nested data and the planned-role/current-capability boundary. Four permanent examples journeys exercise real gallery replacement, simple CRUD, repeated position save/restoration, presets/read-only views, independent datasets for two forms, complete offline export with Fluent styles and Persian mobile Axe/layout. Existing authoring journeys now download/import all three files and validate the expanded kit. Full browser evidence: `reports/pr8-examples-final-e2e.json`; 206.53 seconds with two workers, no retries/skips/flaky/unexpected results. CI requires its own run after push.

[Example intent and future-role planning](EXAMPLES.md) distinguish business responsibility from actual authorization. Roles, own-record restrictions and hidden-field security are not implemented. All current viewers share the same configured list capabilities. The separate legacy seed is retained for existing behavior and compatibility tests. Gallery cards and updated slides were inspected desktop/mobile. The current fifteen-slide HTML deck and narration are updated; the older ignored PDF remains a separate export.

Studio initial bundle is **958.43 kB**, above the existing 700 kB warning and below the unchanged 1 MB failure budget. The separately loaded runtime is 1,138,219 serialized UTF-16 units and includes the same theme styles as Studio. Generated and production-copied runtime assets match.

## Previous standalone HTML checkpoint — November 5, 2026

**255 Studio tests pass: 188 Jest unit/component tests in 24 suites and 67 Chromium journeys.** Ten E2E selector Node checks pass separately. Jest coverage of `src/app/*.ts` is 95.94% statements, 90.64% branches, 96.65% functions and 97.77% lines. The standalone bootstrap is exercised in Chromium, outside that Jest coverage scope. Formatting, lint, application/spec/E2E types, 475 translations, authoring-kit synchronization, 121 local documentation links and build pass.

Three permanent offline export journeys download actual HTML and exercise file:// without HTTP or Studio storage, source record/answer exclusion, CRUD/history/reload, hostile author text, worker timeout/recovery, repeat rows through locale changes and Persian mobile Axe/layout. Capture/service cases cover private metadata stripping, import-extension pruning, escaping, invalid/oversized inputs, stale snapshots, retry and disposal. Full evidence: `reports/pr8-standalone-preview-e2e.json`; final run takes 214.96 seconds with two workers and no retries/skips/flaky results. CI requires its own run after push.

Studio initial bundle is **934.42 kB**, above the unchanged 700 kB warning and below 1 MB failure. The standalone runtime is a separately loaded generated asset, approximately 1.13 million serialized UTF-16 units, excluded from that initial total. No schema, dependency or worker/generation-budget change. See [export/session/build limits](STANDALONE_PREVIEW.md). The fifteen-slide HTML deck and narration explain offline sharing and updated evidence. Desktop/mobile exports and changed slides were visually inspected. The older ignored PDF remains a separate export and must be regenerated before sharing. These are local Chromium results, not cross-browser certification or original-edition parity.

## Previous application navigation checkpoint — November 5, 2026

**245 Studio tests pass: 181 Jest unit/component tests in 22 suites and 64
Chromium journeys.** Ten E2E-selection Node tests pass separately. Coverage is
95.96% statements, 90.71% branches, 96.90% functions and 97.72% lines against
unchanged thresholds. Formatting, lint, spec/E2E types, 469 translations,
authoring-kit synchronization, local documentation links and build pass.

Seven navigation journeys cover independent editor/preview selection and drafts,
shared CRUD for identical local IDs, hash reload/history, menu hiding/direct links,
missing/empty routes, worker and generation cancellation, obsolete dialogs and
Persian mobile Axe/keyboard focus. Component/domain cases cover route validation,
shared revisions/owner guards, cursor-specific cancellation and menu persistence.
Full browser evidence: `reports/pr7-review-fixes-e2e.json` plus the
normal HTML/JUnit/JSON reports. The run has no retries, skips or flaky results.
CI requires its own run after eventual push.

The initial bundle is **927.59 kB**, above the existing 700 kB warning and below
the unchanged 1 MB failure limit. No dependencies, schema or resource budgets were
increased. Studio JSON stays 2.1.0; routing state and records remain transient.
The actual fifteen-slide HTML deck and narration include application navigation;
changed desktop/mobile content was visually inspected. The separate ignored PDF
is an older export and must be regenerated before sharing.

See [application behavior](APPLICATION_PREVIEW.md) for exact boundaries. This is
in-app navigation; standalone application export, roles and wizard pages remain
future increments. No original-edition tests or functional parity are claimed.

PR #7 review correction retires shared normal-form and repeat-row confirmations
on screen/project changes and application-preview disposal. Stale confirmation
delivery cannot invoke the previous form action. Language, copy and same-screen
updates retain current requests. One component and two browser regressions cover
Back navigation, missing routes, editor return, project replacement and valid
fresh confirmations. The original isolated reproduction failed against f3914c2.

## Previous CRUD lists checkpoint — November 5, 2026

**231 Studio tests pass: 174 Jest unit/component tests in 20 suites and 57
Chromium journeys.** Ten Node E2E-selection checks pass separately. Coverage is
95.74% statements, 90.69% branches, 96.34% functions and 97.62% lines, above the
unchanged thresholds. Coverage measures Jest; native record restoration is also
exercised in real Chromium, including repeated values and pattern validation.

Formatting, ESLint, spec/E2E types, 458 DE/EN/FA translations, synchronized
authoring kit, local documentation targets and production build pass. The initial
bundle is **913.08 kB**, above the unchanged 700 kB warning and below the 1 MB failure
budget. No dependency or worker/batch-budget increase was introduced.

Seven `collections` browser journeys cover shared CRUD, response-persistence
isolation, search/filter/presets, sorting/paging/selection, cancellation/staleness,
group editing and Persian mobile Axe/bounds. Unit/component cases cover schema
migration, reference pruning, callback ownership, limits and atomic generation.
The full evidence is `reports/pr6-review-fixes-e2e.json`, with the normal
HTML/JUnit/JSON reports described in the contributor guide. Current CI still
requires its own run after push. There is no new original-edition test claim.

[Collections documentation](COLLECTIONS.md) describes session lifetime and exact
bounds. The actual 15-slide HTML deck and narration include CRUD and updated
figures. The ignored PDF remains a separate older export; regenerate it from the
current HTML before sharing. Existing historical evidence below is retained with
its original scope.

PR #6 review corrections preserve explicitly saved false checkbox and empty radio
answers through record-editor test-data filling, including group children. Missing
answers remain fillable and explicit replacement still works. Heading clicks now
toggle the effective configured sort immediately. Two component and two browser
regressions cover these cases; the review reproductions originally failed against
228ff4f.

## Previous multi-form checkpoint — November 5, 2026

**205 Studio tests pass: 155 Jest unit/component tests in 16 suites and all
50 Chromium E2E journeys.** The final browser run uses two workers with zero
retries, skipped, unexpected or flaky results. Ten Node selector checks pass
separately; repeated smoke/focused runs do not increase the 205-test total.
Coverage is 97.06% statements, 92.43% branches, 98.80% functions and 98.52% lines.
ESLint, formatting, application/spec and E2E typechecks, 398 DE/EN/FA catalogue
entries, authoring-kit synchronization and the production build pass.

The initial bundle is **853.61 kB**, above the unchanged 700 kB warning and below
the unchanged 1 MB failure budget. The full browser report is
`reports/e2e/results.json`; HTML/JUnit/failure evidence uses the paths described
in the contributor guide. The new multi-form browser journeys cover complete
JSON round-trip, duplication/deletion, clipboard, all-form review and drafts,
worker/generation disposal and Persian mobile accessibility. Desktop/Persian
mobile workspace captures and revised desktop/mobile slides 13/14 were visually
inspected. The current workspace image is refreshed in this increment.

An initial full run exposed group-row resets caused by cloning unchanged form
definitions during unrelated brief edits, plus an outdated standalone-deck
expectation. The store now snapshots caller changes while reusing unchanged
form/field identities, preserving the 36-response deferred-check regression.
The initial corrected multi-form checkpoint passed its focused 19-test and full
48-test runs. PR #5 CI subsequently passed at `68d7e2a`; the review corrections
below are verified locally and require their own PR CI run after push.

PR #5 review corrections add three component cases and two browser journeys.
Drafts use nested immutable Map snapshots, so valid form/field IDs such as
`constructor` cannot read inherited properties. Successful cross-form cuts
transfer current drafts, including group children added after clipboard capture,
and clean the source scope. Rejected cuts and copies leave source drafts intact.
Unrelated drafts survive; reallocated source IDs start clean. The final 155-case
unit suite and all 50 browser journeys pass. The full browser report is retained
as `reports/pr5-review-fixes-e2e.json`. Revised quality figures/narration were
visually checked at desktop and mobile widths; the deck remains fifteen slides.

## Historical checkpoint — October 25, 2026

**175 passing automated tests. 98.24% line coverage. All configured quality gates pass.**

MockForge Studio is developed with documented Clean Code practices and substantial automated regression coverage for its current feature set. Complete local verification passed on **October 25, 2026**. Counts describe this checkpoint; rerun the commands after changes.

## Verification results

| Check                       | Verified result                                  |
| --------------------------- | ------------------------------------------------ |
| Jest unit/component tests   | **131 passed** across **14 suites**               |
| Playwright end-to-end tests | **44 passed**, running in Chromium               |
| Total automated tests       | **175 passed**                                   |
| Statement coverage          | **96.71%**; required minimum 80%                 |
| Branch coverage             | **91.67%**; required minimum 75%                 |
| Function coverage           | **97.66%**; required minimum 80%                 |
| Line coverage               | **98.24%**; required minimum 80%                 |
| ESLint                      | Passed without reported violations               |
| Prettier style check        | All matched files pass                           |
| Runtime translations        | **381 German/English/Persian entries** validated |
| Angular production build    | Passed                                           |

The spec TypeScript check (`npx tsc --noEmit -p tsconfig.spec.json`) also passes. It exposed a pre-existing timer-cleanup callback returning the Jest object despite declaring `void`; the callback now uses a block body.

The production build succeeds with a bundle-size warning: the initial bundle is 834.58 kB against the existing 700 kB warning budget (the 1 MB failure limit is unchanged). No budget was raised. Browser development runs also retain Angular's existing oversized-logo advisory.

New coverage includes session clipboard copying/moving across root/group lists, definition limits, deferred-cut cancellation, seeded native preview filling, unsupported-pattern reporting, answer preservation, localized settings dialogs and live shell identity. The new desktop and Persian mobile screenshots were visually inspected. The complete 44-test Chromium suite passed, including DE/EN/FA guide content, mobile bounds and accessibility scans.

The original edition also passed 337 targeted unit/component tests and four Chromium comparison journeys. Those results are separate from Studio's 175 tests; see [the behavior comparison](FEATURE_COMPARISON.md) for scope, commands and the remaining differences.

Coverage percentages come from Jest's instrumented application source, not E2E coverage. Browser tests include desktop/mobile layout, Persian RTL direction and font loading, the presentation, repeat groups, tooltip behavior, full-width response retention, import/export, persistence, native validation, confirmation and accessibility scans. The total counts executed tests, not assertions or accessibility rules. The suite exceeds every configured coverage threshold and provides extensive regression protection for the implemented scope.

## Incremental foundation verification — November 5, 2026

The staged application-domain increment passes **143 Jest unit/component tests
in 16 suites**, including 12 new cases for legacy migration, multi-form JSON
round-trip, aggregate budgets, owned snapshots, immutable form operations and
review invalidation. Coverage is 97.04% statements, 92.26% branches, 97.80%
functions and 98.38% lines; both new domain modules reach 100% in these metrics.
Coverage establishes exercised paths, not complete behavioral correctness.

Formatting, ESLint, spec TypeScript, authoring-kit synchronization, all 381
translations and production build pass. The bundle remains 834.58 kB, with the
same 700 kB warning and 1 MB failure budgets. The application-domain APIs are
staged; no editor/template/styles, active storage or file-transfer behavior
changed. Browser tests were not rerun for this increment. The 44 Chromium results
and the combined 175-test figures above remain the dated October 25 checkpoint;
they are not a newly executed combined result. Runtime activation requires new
multi-form browser journeys as described in the architecture.

## E2E organization verification — November 5, 2026

The catalogue/selection increment passed all **44 Chromium journeys** with two
workers, no retries and no skipped or flaky results, plus a separate **5/5 smoke
run** through the selection runner. The smoke cases are a subset, not five new
tests. Ten Node selector tests and real Playwright discovery validate suite
registration, stable case identities, area/check metadata, selection semantics,
empty-selection errors and bounded smoke. E2E TypeScript, ESLint, formatting and
diff whitespace checks pass. The Axe/Playwright core dependency mismatch exposed
by strict E2E typing is resolved at 1.61.1. The batch harness now builds in a
test hook so listing/catalogue validation does not compile it.

Full local evidence is `reports/e2e/results.json`, with JUnit in
`reports/e2e/results.xml` and an HTML report in `playwright-report/`. CI now
retains these reports and failure traces/screenshots and supports manual
full/smoke/selected profiles; those workflow changes have not been executed on
GitHub. Automatic runs remain full regression. Product source is unchanged by
this increment; the prior 143-case Jest run remains the unit/component evidence.
Do not combine the 10 selector checks or repeated smoke cases with the historical
175-test presentation figures. Change-based selection and an expanded browser
matrix remain future work.

## Clean Code conventions

- **Explicit types:** TypeScript strict mode, explicit function return types, no explicit `any`, no implicit returns and no switch fallthrough. Angular templates and injection parameters are checked strictly.
- **Clear responsibilities:** Separate domain model, examples, import validation, Markdown handoff, state store and presentation components. Domain modules remain independent of Angular.
- **Predictable state:** Immutable updates through `ProjectStore`; specification edits invalidate review. Preview responses and navigation state remain transient.
- **Controlled boundaries:** Validate unknown imports before replacement, bound untrusted structures and preserve cancellation/export-first behavior. Imported text is rendered as plain text.
- **Consistent style:** Pinned Prettier configuration, two-space indentation, LF endings and EditorConfig. Styles are organized by responsibility and UI copy lives in typed DE/EN/FA catalogs.
- **Meaningful regression tests:** Protect user behavior, malformed input, storage failures, review invalidation and response identity.

ESLint enforces the TypeScript recommended rules plus explicit return types and the prohibition of explicit `any`. Prettier checks the paths listed in `package.json`, including TypeScript, templates, CSS and the presentation. EditorConfig expresses editing conventions; it is not a separate automated gate. Module responsibility, naming clarity and explanatory comments still require human review. There is no separate CSS Stylelint or Angular template-lint ruleset configured.

## Sonar status

The project has **no configured SonarQube/SonarCloud analysis, Sonar rule profile or Sonar quality-gate result**. A dependency's own Sonar configuration does not configure this application. CI runs Prettier, ESLint, Jest coverage, translation validation, the production build and Playwright.

The verified claim is: **developed according to the project's documented Clean Code conventions, with all configured checks passing and extensive automated tests**. Compliance with every possible Clean Code or Sonar rule is not established. A future Sonar integration needs a selected rule profile and an actual analysis result before publishing findings or a quality-gate badge.

## Reproduce the checkpoint

Use Node.js 22 or newer and the committed lockfile:

```sh
npm ci
npm run format:check
npm run lint
npm run test:coverage
npm run extract-i18n
npm run authoring:check
npm run build
npx playwright install chromium
npm run e2e
```

The [verification workflow](../.github/workflows/verify.yml) runs the same gates for pushes and pull requests. Local success does not establish that the workflow has run on GitHub. Passing tests and high coverage support confidence in the tested scope; automated accessibility scans supplement manual review and do not establish complete accessibility compliance.

## Earlier presentation maintenance - October 22, 2026

The HTML presentation now has fifteen slides, including dedicated clipboard, preview-data and dynamic-shell explanations. Its quality slide records the then-current October 21 checkpoint: 103 tests and 98.32% line coverage. All five existing presentation/responsive Chromium tests were rerun after strengthening their assertions for the new content and narration. The actual PDF export was renewed and all fifteen pages were rendered and visually inspected, alongside the new mobile slides. ESLint, spec TypeScript checking, formatting and production build passed; the unchanged bundle warning remains. No tests were added, so that earlier suite inventory remained 78 unit/component plus 25 E2E tests. This focused verification does not claim a fresh full-suite run on October 22.

## Text-editor and AI guides - October 22, 2026

Five new unit/component tests and four new browser tests bring the inventory to 112. They validate the complete downloadable examples against the actual import validator, compare the generated kit with the real model/rules/examples, exercise localized prompts and clipboard success/denial, download the actual kit/examples and import both JSON files through Studio. DE/EN/FA help pages pass accessibility scans and mobile horizontal bounds, and their screenshots were visually inspected. The full 83-test Jest and 29-test Chromium suites pass; final focused checks cover the updated guides and presentation. No external chatbot was invoked, so arbitrary model outputs are not certified. `npm run authoring:check` now runs in CI and rejects a stale kit.

## Boundary diagnostics milestone - October 25, 2026

Nine new unit/component cases and three new Chromium journeys bring Studio to 92 + 32 = 124 tests. Checks cover exact/under/over text lengths, required/type failures, inapplicable and unsafe-pattern skips, rollback, maximum-plus-one allocation, shared renderer validity, correction/reset and protected group shrink with stable row identities. LocalStorage/specification/review remain unchanged. The Persian mobile report passes axe after correcting its code-label contrast. The full suites pass, with the unchanged build warning at 808.26 kB. The 18 current-reference unit tests in two suites are separate evidence and do not enter Studio totals.

## Coherent records milestone - October 25, 2026

Eight new unit/component cases and two browser journeys bring Studio to 100 tests in twelve Jest suites and 34 Chromium tests, 134 total. Checks cover DE/EN/FA record consistency, native ASCII emails, company/address fields, conservative source precedence, ambiguous translations, seed/scope determinism, strict reference-date validation, root/row alignment, unchanged storage/review, adjustment reporting and reproduction after actual preview reset. Persian mobile settings/report accessibility and responsive screenshots pass. The full suites and configured gates pass. The independent original-edition comparison adds 44 targeted renderer tests in three suites at cf50030; these are excluded from Studio totals.

## Bounded-pattern and worker milestone - October 25, 2026

Twelve new unit/component cases and three browser journeys bring Studio to 112 tests in thirteen Jest suites plus 37 Chromium cases, 149 total. They exercise finite synthesis, static rejection, the real worker protocol, worker termination/late replies, timeout/input/queue/preparation budgets, cancellation, stale-result suppression, atomic group preparation, pending submit, native representation and unavailable checks. A real catastrophic RegEx input times out while the browser settings dialog remains usable; a controlled stalled worker verifies cancellation/edit behavior and Persian mobile diagnostics/accessibility. The complete configured suites and gates pass. Coverage remains above every threshold; percentages reflect newly instrumented responsibilities and are not a claim that all branches are tested. Original-edition evidence is separate: 75 targeted tests in four pattern/worker/generator suites pass at cf50030.

## Browser batch milestone - October 25, 2026

Eleven new unit cases and three Chromium journeys bring Studio to 123 tests in fourteen Jest suites plus 40 browser cases, 163 total. They cover snapshots, coherent reproducibility, all native types, bounded/optional group rows, represented choice/checkbox values, invalid/boundary outcomes, pattern checks, observed finite duplicates, cancellation/progress and setup/output/time limits. Chromium verifies 500 records yield to browser tasks and never change visible UI or storage. Its timing attachment is a local smoke observation, not representative device performance acceptance. No batch UI, export or dependency was added. All configured gates pass; the bundle warning budget remains unchanged. Separately, 39 current-reference tests in three batch/performance suites pass and are excluded from Studio totals.

## PR review corrections - October 25, 2026

All nine reported source findings are addressed. Six additional Jest cases and three Chromium journeys bring Studio to 129 unit/component plus 43 browser tests, 172 total. Regression coverage exercises first-submit validation of a 12-row, three-pattern table without overflowing the unchanged worker queue, preservation of pending checks across copy/locale edits with current error messages, cancellation on changed constraints and stale submit suppression, single-option radio checked state in output/statistics, explicitly undefined optional defaults and cached bounded matchers. Existing clipboard/group tests cover shared ID allocation and row planning. Shared response scopes and worker reason/message mappings remove duplicated logic. This is targeted correction and automated verification, not a claim of a complete audit of every documentation, translation or asset change in the PR.

## Reactive refresh backpressure - October 25, 2026

Two additional unit cases and one Chromium journey bring Studio to 131 unit/component tests in fourteen suites plus 44 E2E cases, 175 total. Locale/project refreshes of 36 pending responses now share one manual dispatch sequence instead of exhausting the service queue. Tests verify pending validity without transient limit errors, current verdicts, stale-action suppression, cache reuse and reset cancellation before queued jobs create workers. The browser case records every custom-validity assignment, changes UI language and project identity while workers are pending, and completes all 36 checks without a retry. The existing service queue/input/deadline limits remain unchanged.
