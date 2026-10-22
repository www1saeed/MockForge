# Code quality and test evidence

**112 passing automated tests. 98.40% line coverage. All configured quality gates pass.**

MockForge Studio is developed with documented Clean Code practices and substantial automated regression coverage for its current feature set. Complete local verification passed on **October 22, 2026**. Counts describe this checkpoint; rerun the commands after changes.

## Verification results

| Check                       | Verified result                                  |
| --------------------------- | ------------------------------------------------ |
| Jest unit/component tests   | **83 passed** across **11 suites**               |
| Playwright end-to-end tests | **29 passed**, running in Chromium               |
| Total automated tests       | **112 passed**                                   |
| Statement coverage          | **96.96%**; required minimum 80%                 |
| Branch coverage             | **89.72%**; required minimum 75%                 |
| Function coverage           | **97.16%**; required minimum 80%                 |
| Line coverage               | **98.40%**; required minimum 80%                 |
| ESLint                      | Passed without reported violations               |
| Prettier style check        | All matched files pass                           |
| Runtime translations        | **327 German/English/Persian entries** validated |
| Angular production build    | Passed                                           |

The spec TypeScript check (`npx tsc --noEmit -p tsconfig.spec.json`) also passes. It exposed a pre-existing timer-cleanup callback returning the Jest object despite declaring `void`; the callback now uses a block body.

The production build succeeds with a bundle-size warning: the initial bundle is 794.91 kB against the existing 700 kB warning budget (the 1 MB failure limit is unchanged). No budget was raised. Browser development runs also retain Angular's existing oversized-logo advisory.

New coverage includes session clipboard copying/moving across root/group lists, definition limits, deferred-cut cancellation, seeded native preview filling, unsupported-pattern reporting, answer preservation, localized settings dialogs and live shell identity. The new desktop and Persian mobile screenshots were visually inspected. The complete 29-test Chromium suite passed, including DE/EN/FA guide content, mobile bounds and accessibility scans.

The original edition also passed 337 targeted unit/component tests and four Chromium comparison journeys. Those results are separate from Studio's 112 tests; see [the behavior comparison](FEATURE_COMPARISON.md) for scope, commands and the remaining differences.

Coverage percentages come from Jest's instrumented application source, not E2E coverage. Browser tests include desktop/mobile layout, Persian RTL direction and font loading, the presentation, repeat groups, tooltip behavior, full-width response retention, import/export, persistence, native validation, confirmation and accessibility scans. The total counts executed tests, not assertions or accessibility rules. The suite exceeds every configured coverage threshold and provides extensive regression protection for the implemented scope.

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
