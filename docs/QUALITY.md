# Code quality and test evidence

**84 passing automated tests. 98.16% line coverage. All configured quality gates pass.**

MockForge Studio is developed with documented Clean Code practices and substantial automated regression coverage for its current feature set. Complete local verification passed on **October 1, 2026**. Counts describe this checkpoint; rerun the commands after changes.

## Verification results

| Check                       | Verified result                        |
| --------------------------- | -------------------------------------- |
| Jest unit/component tests   | **64 passed** across **8 suites**      |
| Playwright end-to-end tests | **20 passed**, running in Chromium     |
| Total automated tests       | **84 passed**                          |
| Statement coverage          | **96.59%**; required minimum 80%       |
| Branch coverage             | **88.22%**; required minimum 75%       |
| Function coverage           | **97.48%**; required minimum 80%       |
| Line coverage               | **98.16%**; required minimum 80%       |
| ESLint                      | Passed without reported violations     |
| Prettier style check        | All matched files pass                 |
| Runtime translations        | **232 German/English pairs** validated |
| Angular production build    | Passed                                 |

Coverage percentages come from Jest's instrumented application source, not E2E coverage. Browser tests include desktop/mobile layout, the presentation, repeat groups, tooltip behavior, full-width response retention, import/export, persistence, native validation, confirmation and accessibility scans. The total counts executed tests, not assertions or accessibility rules. The suite exceeds every configured coverage threshold and provides extensive regression protection for the implemented scope.

## Clean Code conventions

- **Explicit types:** TypeScript strict mode, explicit function return types, no explicit `any`, no implicit returns and no switch fallthrough. Angular templates and injection parameters are checked strictly.
- **Clear responsibilities:** Separate domain model, examples, import validation, Markdown handoff, state store and presentation components. Domain modules remain independent of Angular.
- **Predictable state:** Immutable updates through `ProjectStore`; specification edits invalidate review. Preview responses and navigation state remain transient.
- **Controlled boundaries:** Validate unknown imports before replacement, bound untrusted structures and preserve cancellation/export-first behavior. Imported text is rendered as plain text.
- **Consistent style:** Pinned Prettier configuration, two-space indentation, LF endings and EditorConfig. Styles are organized by responsibility and UI copy lives in the typed DE/EN catalog.
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
npm run build
npx playwright install chromium
npm run e2e
```

The [verification workflow](../.github/workflows/verify.yml) runs the same gates for pushes and pull requests. Local success does not establish that the workflow has run on GitHub. Passing tests and high coverage support confidence in the tested scope; automated accessibility scans supplement manual review and do not establish complete accessibility compliance.
