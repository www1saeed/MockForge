# MockForge Studio

<img src="src/assets/brand/logo.png" alt="MockForge Studio logo" width="96" height="96">

An **open-source form prototyping studio**, licensed under MIT.

**Built with documented Clean Code practices and backed by 281 passing automated tests: 205 unit/component tests and 76 end-to-end tests.** Verified on November 5, 2026, with **97.41% line coverage**. Ten E2E selector checks pass separately. Formatting, ESLint, translation validation and the production build also pass. See the [quality report](docs/QUALITY.md) for reproducible checks and their scope.

**Your requirements shape the product before the first implementation sprint.**

MockForge Studio helps product owners and developers agree on a form before production development starts. Review the exact experience, resolve the small details and export the specification the developer should implement.

**My commitment as a developer:** "Your wishes guide my implementation, including the small details. Before coding the production form, I want us to agree on what your users should see and what each action should do. I document those decisions so you can see exactly what I plan to deliver."

![MockForge Studio alignment workspace](docs/images/workspace.png)

## CRUD list previews

Use the dedicated **Lists and entries** workflow tab to configure table, card and accordion views per form, including group/child columns, badges and configurable group details. Share session-only records across views, search/filter/sort/page, select matching rows and create/view/edit/delete with native form validation. Regeneration requires confirmation and replaces records only on complete success. Configuration persists; record values never do. See [the walkthrough and limits](docs/COLLECTIONS.md). Use **Application preview** to navigate forms and lists with direct links and browser history while retaining editor selection. See [navigation and session lifetime](docs/APPLICATION_PREVIEW.md). Download a single offline HTML application preview with the same forms, lists and validation. See [standalone export](docs/STANDALONE_PREVIEW.md). Roles follow later.

## Why agree before implementation?

"Build a demo request form" sounds clear until sales asks for a different team-size range, the owner expects personal email addresses to be blocked, or the button promises an instant trial rather than a conversation. Clarifying that after coding begins may mean changing validation, translations, layout, integrations and tests.

MockForge Studio puts those decisions in front of the owner while the form is still a mockup. Early clarification can reduce avoidable rework during actual implementation. A documented baseline also makes later scope and budget discussions clearer. The alignment session takes time, and actual savings depend on the project.

## What the owner receives before production development

| Deliverable              | Purpose                                                                 |
| ------------------------ | ----------------------------------------------------------------------- |
| Interactive form         | Check the experience, wording, required inputs and mobile layout        |
| Documented decisions     | Preserve exact rules, expected behavior and implementation boundaries   |
| JSON plus readable brief | Give the team a concrete specification to implement and test            |
| Implementation agreement | Confirm scope, acceptance criteria and unresolved technical assumptions |

The [agreement template](docs/IMPLEMENTATION_AGREEMENT_TEMPLATE.md) extends the exported brief for APIs, failure behavior and the team's actual approval channel. Changes to the form reset its local review so a previous acknowledgement does not cover an altered specification.

## Commercial conversations

| Example | What to agree with the owner |
| --- | --- |
| Contact desk | Three fields and one list: which data is needed, who follows up, and who may change it later? |
| Purchase requests | One form, three list views and a repeatable item table: which limits, statuses and processing actions matter? |
| Procurement workspace | Two forms and seven lists: how do request handling, supplier maintenance and later role responsibilities differ? |

These three progressive projects share the same files in the gallery, JSON reference and authoring kit. See [example walkthroughs and future-role planning](docs/EXAMPLES.md). They are fictional examples for customer discussions. See [positioning and arguments](docs/POSITIONING.md), the [15-minute demo](docs/SALES_DEMO.md) and the [fifteen-slide presentation](src/assets/presentation.html).

**Bring one form idea. Agree on the details together before committing implementation effort.**

## Run locally

Requires Node.js 22 or newer. All dependencies come from the public npm registry.

```sh
git clone https://github.com/www1saeed/MockForge.git
cd MockForge
npm ci
npm start
```

Open `http://localhost:4300`. The production build is static:

```sh
npm run build
```

Deploy the contents of `dist/studio/browser/`. The relative base URL supports GitHub Pages project paths. This directory is a self-contained new project: copy **only its contents** into the new GitHub repository.

The directory can be moved beside the original mockforge workspace. Start a new session in the moved project root for the complete implementation handoff and relocation instructions. No dependency on the original directory is required.

## What works

- Several independent single-page forms per project: add, name, duplicate, reorder, delete with confirmation and switch the active editor. Switching discards preview answers and cancels pending work. JSON, Markdown and review cover every form; project brief, languages and theme are shared.

- An overview introduces the approach before opening the full-width workspace. Four workflow tabs separate Project & design, Fields/actions, Lists/entries and Review. A narrow icon rail, persistent header and footer keep navigation available.
- German, English and Persian form copy, with one or two languages active at a time so field and button editors stay readable. Inactive translations remain stored.
- Nine native field types plus repeatable groups with card/table layouts, editable child fields and minimum/maximum entry counts. Required rules, text length constraints, localized tooltips and full-value RegEx patterns have localized messages.
- Show or hide the interactive preview on every step; it starts hidden for the brief, copy and form editor. Choose its language and desktop/mobile width separately.
- Internal field clipboard: copy or defer a cut, then paste into the root list or a group, including another form. Cross-form cuts reject conflicting IDs instead of overwriting fields. Copies receive fresh IDs; moves retain IDs and use the latest source. Complete groups can be copied. The clipboard stays local to the session.
- Seeded synthetic preview data in German, English or Persian, independently of UI/form language. Preserve existing answers or replace explicitly; inspect filled/preserved/skipped counts. Settings and generated answers never enter JSON or the review record. See [authoring tools](docs/AUTHORING_TOOLS.md) for supported constraints and usage.
- The header shows the current project and active form title; the workspace navigation name follows project renaming and replacement immediately.
- Configurable buttons: localized labels, primary/secondary/ghost/danger appearance, behavior, CSS classes, developer notes and order. Validation, submission, saving, cancellation, deletion and next/back actions are local simulations; reset clears preview inputs.
- Real Bootstrap form styling plus Material, Carbon and Fluent inspired visual presets.
- German, English and Persian UI with instant switching. Persian uses RTL layout and the bundled IranSans webfont; the Studio UI and form preview can use different directions.
- Progressive examples: a simple contact form/list, requests with three views and repeated positions, and two forms with seven lists and planned role responsibilities.
- LocalStorage persistence, JSON import/export and a Markdown implementation brief.
- Review checklist with reviewer name and timestamp. Specification edits invalidate the review.
- Native modal replacement confirmation with export-before-replace and cancel options.
- An [English presentation](src/assets/presentation.html) with a concrete sprint/rework example, spoken explanations, browser voice selection, transcripts, standalone HTML saving and an A4 landscape PDF layout. See the [presentation guide](docs/PRESENTATION.md).

Material, Carbon and Fluent presets are **visual approximations**, not integrations of their official component libraries. Choose the real production library with the product owner and engineering team. Brand names identify the design references and imply no endorsement.

See [authoring instructions](docs/AUTHORING_TOOLS.md) for copy/cut/paste and seeded preview data, and [the feature comparison](docs/FEATURE_COMPARISON.md) for verified similarities and differences from the original edition. The in-app **How it works** page also explains the tools in all three UI languages.

## Author forms in a text editor or with AI

The navigation provides separate **Design a form in a text editor** (`/#guide-json`) and **Design a form with AI** (`/#guide-ai`) pages in DE/EN/FA. The text-editor guide explains Studio JSON 2.3.0 and offers the same three progressive contact/request/workspace projects to copy or download. The AI guide supplies a format kit and reusable creation, revision and repair prompts. Import and review the result locally; Studio never uploads your project to an AI service automatically.

See [text-editor instructions](docs/JSON_AUTHORING.md) and [AI prompts and format kit](docs/AI_AUTHORING.md). The original MockForge edition uses a different JSON contract.

## A practical conversation

1. Open the SaaS example and agree on the business goal and scope.
2. Discuss whether a personal email is allowed and which team-size options sales needs.
3. Inspect each selected language, validation and the mobile preview.
4. Document the expected response after submission and the future CRM integration.
5. Resolve the open questions, complete the review and export the JSON together with the brief.

The review record is local and unauthenticated. It supports an actual conversation and explicit agreement outside the app. Imports reset review status. Preview inputs are not persisted or submitted. Backend integration, email delivery, refunds and CRM workflows are outside this mockup tool.

JSON exports use Studio schema **2.3.0** with `format: "mockforge-studio"` and `forms[]`. Studio 2.0.0, 2.1.0 and 2.2.0 applications migrate with review cleared; existing Studio 1.0.0–1.3.0 drafts become one-form applications on restore/import; missing Persian values start empty and 1.0.0 also receives a submit button from its old label. Upgraded acknowledgements are cleared. Files from the original MockForge edition remain incompatible. One or two of the three supported form languages can be active, while inactive copy remains stored. Invalid RegEx edits remain in the editor until corrected; the last valid rule stays in the saved specification.

Repeat groups support one level of up to 20 child fields and 0–20 entries, with at least one child definition. Each form allows 100 definitions counting groups and children together; the application allows 500 definitions across at most 20 forms. Preview entries validate independently and use distinct radio groups. Removing an entry asks for confirmation; resetting responses returns groups to their minimum count. Response values are never persisted or exported. The extensive application example has 24 definitions across two forms, including a 1–8-item table and optional 0–4 contact cards. Pricing, totals and finance approval remain production requirements to agree separately.

## Verify

```sh
npm run format:check
npm run lint
npm test
npm run test:coverage
npm run extract-i18n
npm run build
npx playwright install chromium
npm run e2e
```

Unit/component tests exercise import validation, immutable persistence, review invalidation and editor behavior. Playwright covers export/import, restore, native validation, cancellation and axe checks for both locales, all workflow steps and the design presets. Automated scans supplement manual keyboard and usability review.

## Documentation

- [Code quality and verified test results](docs/QUALITY.md)

- [Product requirements](REQUIREMENTS.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Contributing and code conventions](docs/CONTRIBUTING.md)
- [Product owner workshop](docs/PRODUCT_OWNER_WORKSHOP.md)
- [Positioning and commercial examples](docs/POSITIONING.md)
- [Customer demo and portfolio copy](docs/SALES_DEMO.md)
- [Implementation agreement template](docs/IMPLEMENTATION_AGREEMENT_TEMPLATE.md)
- [GitHub publication guide](docs/PUBLISHING.md)
- [Logo and GitHub brand assets](docs/BRANDING.md)

## License

The newly authored source in this project is licensed under [MIT](LICENSE). Third-party dependencies and bundled fonts retain their own licenses. Confirm that your IranSans license permits public redistribution before publishing the font files; otherwise replace or omit them. The release workflow preserves Angular's generated dependency license notices.

## Group editing and table spacing

Empty optional group tables show no column header until an entry is added. Row delete buttons in cards and tables expose Bootstrap tooltips with the entry index and still require confirmation.

**Full-width preview** opens the form across the Studio workspace while retaining the header, icon navigation and footer. **Back to editor** restores the current editing step. Switching width preserves entered preview responses; hiding the preview discards them as before. Language and desktop/mobile preview controls remain available.

Form tooltips use Bootstrap. Each field can place its tooltip on the title or on a question-mark or information circle beside it. The circles use compact vector symbols, a subtle tinted background and clear hover/focus states. Repeated table children expose it once in the column header; card children expose it only in the first card. The group title has its own single trigger. All modes support keyboard focus and Escape dismissal.

Open **Edit child fields** to work with a child list beside its properties. The main field list becomes a narrow type-icon rail with Bootstrap tooltips showing each field's index, name and type. Closing child editing or selecting a main field restores the full list. The main list can also be collapsed or expanded manually; these view choices do not alter the specification.

Table groups offer **Table fields without gaps** for a continuous grid. This boolean setting is saved and exported, participates in review invalidation and appears in the Markdown handoff. Migrated schema 1.2.0 files without the optional `group.gapless` property retain comfortable spacing.

### Preview boundary scenarios

Test valid, empty and deliberately invalid responses, exact text limits, one character below/above and required-empty cases. Choose existing/minimum/maximum group rows; shrinking requires explicit replacement. Per-field results compare expected and observed candidate validity and explain skipped cases. Answers and reports stay local and transient. A separate developer-only browser batch API generates 1-500 records with progress, cancellation and observed diversity. Numeric/date bounds and bulk UI/export remain separate work. See the [batch API guide](docs/TEST_DATA_BATCH_API.md). See [authoring tools](docs/AUTHORING_TOOLS.md) and the [generator roadmap](docs/TEST_DATA_GENERATOR_PLAN.md).

### Coherent preview records

First/last/full name, email, company and address components now share one fictional record per root form or group row. Conservative DE/EN/FA label recognition falls back to exact placeholder/help phrases; the report identifies sources, conflicting translations and constraint adjustments. Choose a seed and reference date to reproduce a walkthrough, including after reset. Existing manual answers remain protected and are not used to reconstruct identities. The browser batch API continues to accept a legacy 1.3.0 selected-form projection; application JSON is 2.3.0. Persisted semantic hints/examples remain future work. See [the tools guide](docs/AUTHORING_TOOLS.md).

### Bounded pattern examples and isolated checks

Generate finite identifier patterns, or verify a known fixture against a deferred pattern in a disposable local worker. Manual uncertain patterns use the same isolation. Time/size limits stay visible; pending or failed checks cannot submit successfully. Cancel or edit to discard pending generation before answers/rows change. No arbitrary pattern synthesis or schema change is introduced. See [the exact limits](docs/AUTHORING_TOOLS.md).
