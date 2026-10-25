# Feature behavior comparison

Historical baseline: inspected/tested on October 21, 2026, against original MockForge commit `0b84d116a50327b4ad6c098681bd5abed866f599`. Studio's feature commits are `8b09757` (clipboard), `3bc53dc` (preview data) and `6641712` (shell). The original repository was inspected and tested without source changes. The October 25 milestone also checks current reference commit `cf50030`, as recorded below. This comparison covers the requested feature areas, not the complete applications.

**The implementations are not functionally identical.** Clipboard transfer and live project context share their central behavior. Studio's preview generator is a smaller adaptation; passing the tests below does not establish complete feature parity or identical generated values.

## Behavior matrix

| Area                     | Shared behavior                                                                                                                                                     | Difference / result                                                                                                                                                                                                                                                |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Copy                     | Snapshot configuration, include group children, assign globally unique IDs, allow repeated paste.                                                                   | Equivalent transfer semantics. The original derives IDs from source names; Studio allocates `field-N`. Generated ID strings are not identical.                                                                                                                     |
| Cut                      | Keep source until paste; resolve its latest configuration; move atomically; retain IDs; clear after success. Cancel does not delete the source.                     | Equivalent central behavior. The original moves top-level fields between form/wizard pages. Studio also moves leaf children between root/group lists and enforces its own 100-definition/20-child bounds.                                                          |
| Clipboard lifecycle      | Survive authoring-step changes; clear on project replacement/reload; cancel invalidated cut sources; never serialize clipboard or intercept text shortcuts.         | Equivalent shared lifecycle. The original also handles form-mode/page changes; Studio has one form page and no mode switch.                                                                                                                                        |
| Review after paste       | A successful paste changes the specification.                                                                                                                       | Studio automatically invalidates checks and acknowledgement. The original edition's review model differs; review records and schemas are not interchangeable.                                                                                                      |
| Fill action and settings | Explicit fill outside the mockup; native accessible settings dialog; preserve populated answers unless replacement is selected; generated answers remain transient. | Equivalent central interaction, with different settings and reporting depth. Studio now also preserves a deliberately unchecked checkbox.                                                                                                                          |
| Content profiles         | Content language is independent of UI/form locale. Emails/URLs use illustrative example domains.                                                                    | Not equal: original DE/EN/PL/UK/AR/JA/ZH/KO plus international mix; Studio DE/EN/FA. The small catalogues and generated values differ.                                                                                                                             |
| Semantic values          | Generate examples for native field types and selected recognized labels.                                                                                            | Not equal: original explicit hints/examples, richer bilingual semantic detection and coherent profile identities; Studio uses a small label-based candidate catalogue without persisted hints/examples.                                                            |
| Seed and reference date  | Generation is deterministic for the same full request.                                                                                                              | Not equal in UI: original advances an internal seed per fill and uses today's reference date; Studio exposes a seed, reuses it until edited and uses fixed illustrative January 2026 dates.                                                                        |
| Scenarios | Both support valid, invalid and text-boundary modes with exact minimum/maximum, below/above and required-empty cases. | Shared basic cases now exist in Studio. Candidate selection, pattern support and diagnostics differ; no identical-output or exhaustive parity claim. Studio also retains an explicit empty mode. |
| Repeat groups | Independently addressed child responses, configured bounds and preservation by default. | Studio now offers existing/minimum/maximum rows and protects shrinking unless replacement is enabled. Original has a requested count and wizard scope; Studio remains single-page with a 20-row limit. Neither synthesizes illegal group counts. |
| Pattern validation       | Do not silently claim a usable candidate when constraints cannot be satisfied.                                                                                      | Not equal: original worker-isolated validation, bounded synthesis, known-example fallback, timeout and cancellation; Studio synthesizes only bounded character classes and skips complex expressions. Studio's existing manual pattern validator remains separate. |
| Diagnostics | Per-field expected/observed candidate validity and explicit unavailable cases. | Studio now reports response/group context and reasons, displays the first 20 entries and counts all entries. Original also has semantic/profile/worker/batch diagnostics. Reports and selection policies differ. |
| Unicode                  | Support non-Latin text and suitable native text direction.                                                                                                          | Not equal: original NFC/NFD selection and international/mixed profile diagnostics; Studio has Persian content and auto text direction but no normalization setting or mix mode.                                                                                    |
| Batch API                | No generated answers are persisted as specification data.                                                                                                           | Not equal: original has a bounded 1–500-record API with progress/cancellation and diagnostics; Studio has no batch API or bulk export. The original batch API is not a bulk-list/export UI either.                                                                 |
| Shell identity           | Project name drives navigation; edits/replacement update live; localized form/application title is separate from stable product branding.                           | Equivalent central behavior. Original uses a banner and a DE fallback for missing English title. Studio uses its persistent header and active-form-language fallback, supports FA/RTL, and leaves an empty subtitle empty. Layout/fallback policies differ.        |
| Format and integration   | Each application retains its own project contract.                                                                                                                  | Not equal: Studio JSON 1.3.0 is incompatible with the original edition. Original GitLab integration, wizard pages and organization shell are not part of this adaptation.                                                                                          |

## Executed evidence

Studio (updated October 25, 2026): **92 unit/component tests across 11 suites**, **32 Chromium end-to-end tests**, **349 DE/EN/FA catalog entries** and **98.54% line coverage**. Formatting, ESLint, spec TypeScript checking and the production build pass. The initial bundle is 808.26 kB, above the unchanged 700 kB warning budget and below the 1 MB failure limit. [QUALITY.md](QUALITY.md) records the full checkpoint.

Original repository: **337 targeted unit/component tests across 18 suites** passed. The selection covers the form store, banner/header/menu, candidate generation, semantic profiles, scenarios, pattern isolation and batch APIs. An additional **four Chromium E2E tests** passed: DE/EN copy/move/persistence journeys and DE/EN preservation/valid/invalid/boundary-generation journeys. These are targeted comparison runs, not a fresh full-suite or full-browser certification. They are excluded from Studio's total of 124 tests.

The comparison found one actionable shared-behavior gap: Studio initially treated every unchecked checkbox as empty. Studio now records user answer edits separately from generated events and preserves an intentional unchecked answer unless replacement is requested. A regression test protects this behavior.

Reproduce Studio checks from its root:

```sh
npm run format:check
npm run lint
npx tsc --noEmit -p tsconfig.spec.json
npm run test:coverage
npm run extract-i18n
npm run build
npm run e2e
```

Reproduce the targeted original checks from that repository's root (these commands create local test output and the browser command builds its localized test application):

```sh
node node_modules/jest/bin/jest.js --runInBand --coverage=false --reporters=default --testPathPatterns='form-config.store.spec|layout/components/(banner|header|menu)/.*spec|shared/test-data/.*spec'
node node_modules/@playwright/test/cli.js test --config e2e/playwright.config.ts e2e/field-clipboard.spec.ts e2e/preview-test-data.spec.ts --project chromium --grep "copies and moves|preserves manual answers" --workers 1
```

Ignored local evidence from this run is under `reports/reference-feature-tests.json`, `reports/reference-browser/` and the Studio screenshot/test-report directories. Source review was used alongside executed tests to distinguish shared behavior from unsupported features. Equal test results alone would not prove identical behavior.

## Work required for full generator parity

Full parity would require the missing profiles/mix and normalization settings, richer semantic hints/examples, coherent record identity, arbitrary requested group counts and wizard page scope, worker-backed validation/cancellation and richer semantic/profile diagnostics, followed by the separate batch API. It would also require an explicit decision on Studio's Persian support, public JSON schema, fixed-seed behavior and single-page boundary. These capabilities were not silently added to Studio or described as implemented.

## Text-editor and AI authoring adaptation - October 22, 2026

Studio now follows the original edition's separate JSON-reference and AI-authoring workflows: dedicated navigable pages, complete copyable/downloadable examples, a downloadable type-contract kit, a deployment-relative kit URL, reusable task briefs and a manual copy fallback. Studio localizes the pages and briefs in DE/EN/FA and derives the kit from its own current model, rules and examples.

The supplied files and prompts are deliberately specific to Studio 1.3.0. They describe Text objects with all three language keys, the one-page form, Studio groups and automatic import-review reset. Studio offers creation, targeted revision and import-repair briefs, rather than reproducing the original edition's domain-specific prompt library, wizard instructions or incompatible project contract. Both downloaded Studio examples pass the real import flow. These shared workflows do not imply cross-edition JSON compatibility or a live AI integration. The original repository was not changed or retested for this documentation adaptation; its earlier comparison evidence remains dated above.

## Boundary milestone - October 25, 2026

Studio now verifies expected versus observed required/type/text-length failures, shares explicit programmatic length validation with the renderer and protects group shrink operations. Nine added unit/component tests and three added browser journeys cover the milestone, including correction/reset, seed reproducibility, safe-pattern skips, impossible candidates, unchanged stored specification and Persian mobile accessibility. The reference repository has since moved to commit `cf500304e4b919a7359218bbfc6ee900011596e2` and reorganized its renderer under `libs/renderer`. At this commit, 18 targeted scenario/preview tests in two suites passed on October 25; the original working tree remained unchanged. This is additional targeted evidence, not a repeat of the historical 337-test or browser audit. Studio prioritizes required-empty in invalid mode; the original tries type/length mutations first. Studio permits 10,001-unit overflow samples against its 10,000-unit authoring limit; the original scenario constructor caps at 4,096. Both verify basic required/type/text-boundary outcomes, but candidate priorities and values differ. Full feature parity is still absent. See [the roadmap](TEST_DATA_GENERATOR_PLAN.md) for remaining scope.

Reproduce the current targeted reference check from its root (cache output stays under ignored Studio reports):

```sh
node node_modules/jest/bin/jest.js --selectProjects renderer --runInBand --coverage=false --cacheDirectory C:/git/mockforge-studio/reports/reference-jest-cache --testPathPatterns="test-data-scenarios.spec|preview-test-data.spec"
```
