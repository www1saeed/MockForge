# Product requirements

## Objective

Help product owners and developers reach a concrete shared understanding of a form before implementation. Make both visible UI details and unresolved behavior questions reviewable.

## Commercial communication

The open-source introduction, documentation and presentation must explain why the owner benefits: exact expectations can be agreed before production work, which can reduce avoidable refinement during implementation. Demonstrate the developer's attention to small details with commercial examples and actual editable requirements. Provide an implementation-agreement template and a customer demo script. Do not invent savings metrics or imply all technical discovery is complete when the UI is reviewed.

## Functional scope

| Area            | Requirement                                                                                                                                                                                                                                                       |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Product brief   | Name, owner, audience, goal and scope are editable and exported.                                                                                                                                                                                                  |
| Navigation      | Overview first; full-width workspace with narrow icon links, persistent header and footer linking Saeed and 1saeed.com.                                                                                                                                           |
| Copy            | Support German, English and Persian while allowing one or two active form languages. Title, introduction, field/choice/tooltip and button copy are editable in each selected language. Switching retains inactive copy.                                           |
| Design          | Bootstrap plus Material, Carbon and Fluent inspired previews. Explicit integration limitations.                                                                                                                                                                   |
| Fields          | Text, email, number, URL, date, textarea, select, radio, checkbox and repeatable group. Add, edit, delete and move by buttons; group children have the same leaf-field editor.                                                                                    |
| Repeat groups   | Cards or semantic tables with individually validated native controls. Configure a minimum of 0–20 and a maximum of 1–20 entries, and up to 20 child definitions. No nested groups. Add responses locally; confirm row deletion. Reset restores the minimum count. |
| Complex example | A bilingual Atlas project/procurement request with every field type, stakeholder cards, line-item table, pattern/length rules, tooltips and multiple actions. Fictional, with explicit production questions.                                                      |
| Rules           | Required constraints, native type validation, optional text length limits and full-value Unicode-v RegEx patterns for text/email/URL/textarea with localized messages. Invalid pattern edits cannot replace a saved rule.                                         |
| Detail          | Editable label, placeholder, helper text, accessible expandable tooltip, choices and developer note per field.                                                                                                                                                    |
| Buttons         | Add, remove and reorder up to 20 buttons; localized labels, four appearance variants, local behavior simulations, CSS classes and developer notes.                                                                                                                |
| Preview         | Show/hide on every step; initially hidden for brief/copy/form editing. Independent selected-language switch, one/two columns and desktop/mobile width.                                                                                                            |
| Persistence     | Store the specification locally after each edit. Report failures. Do not store preview responses.                                                                                                                                                                 |
| Transfer        | Validate JSON, confirm replacement, support cancel/export first and export readable Markdown brief.                                                                                                                                                               |
| Review          | Five checklist items, named reviewer, resolved questions and timestamp. Changes invalidate prior review.                                                                                                                                                          |
| Examples        | Fictional SaaS, commerce and agency scenarios contain actual product questions.                                                                                                                                                                                   |

## Review acceptance

A review can be recorded only when the brief contains a name, owner, audience, goal and scope, the form title and every field/choice/button label are present in every selected language, at least one field and one button exist, active pattern edits are valid, all checklist items are checked, a reviewer is named, decisions are documented and open questions have been cleared. The author must copy resolved questions into decisions before clearing them. This is a local record, not verification of who reviewed the form.

## Implementation boundary

Form mockups have no network submission, code generation, backend, CRM, payments, refunds, cloud collaboration or multiple concurrent projects. The tool documents intended behavior as notes and decisions. Production implementation requires separate requirements for APIs, security, accessibility, error handling and operational behavior.

## Nonfunctional requirements

- Follow the documented Clean Code conventions and pass every configured quality gate. Maintain behavior-focused unit/component and E2E regression coverage, with minimum Jest coverage of 80% statements, 75% branches, 80% functions and 80% lines. See the [quality report](docs/QUALITY.md) for measured results and analysis scope.

- Every explicit field/button deletion and simulated delete action requires a modal confirmation with a named target, safe cancellation and keyboard focus containment.
- Shared, dismissible DE/EN/FA toast feedback covers information, successes, warnings and errors. Errors remain longer than ordinary notifications; hover/focus pauses expiry.

- Public npm dependencies and static deployment.
- Strict TypeScript and schema 1.3.0 validation with a one-megabyte import limit, at most two selected languages, 100-definition limit including group children, 20-button limit and 500-character pattern limit. Bound repeat rows/children, reject nesting and duplicate ids across the entire form. Upgrade this Studio's own 1.0.0, 1.1.0 and 1.2.0 files; preserve rejection of foreign editions.
- Responsive shell without horizontal page overflow on mobile.
- Visible labels, keyboard-operable actions and native modal focus management.
- Selected-field reorder and trash actions beside the field list; a sticky, internally scrollable desktop preview during long editor sessions. Narrow screens use normal stacked flow.
- Organized domain/components/styles, explanatory English comments and enforced Prettier formatting for open-source contributions.
- German and English base copy with a complete Persian runtime catalog. English documentation.
- WCAG 2.1 AA as the accessibility target, verified with automated axe checks and manual keyboard review.
- No unsupported claims about development time saved.

## Group editing refinements

- Empty optional group tables omit their column header and restore it when the first entry is added. Removing the last entry hides it again. Enabled row delete buttons expose localized Bootstrap tooltips and retain confirmation dialogs.

- Users can expand the preview across the Studio workspace and return to the current editor. Header, navigation, footer and preview language/device controls remain available. Width transitions preserve responses; expansion is transient and does not affect review or exports.

- Tooltip circles offer question and information symbols with subtle theme tint, hover/focus states and reduced-motion support. `tooltipPlacement: 'info'` selects the information circle; existing `'icon'` selects the question circle.

- Form tooltips use Bootstrap and allow field-title or adjacent question-mark-circle placement per field, including groups and children.
- Repeat tables show child tooltips once in headers; cards show child tooltips only in the first current card. Group tooltips appear once in the group legend.
- Tooltip triggers support hover, keyboard focus and Escape. Missing `tooltipPlacement` defaults to `icon` in existing schema 1.2.0 files; unknown values are rejected.

- Table groups support comfortable spacing or a continuous field grid, persisted as optional boolean `group.gapless` under schema 1.2.0.
- Child definitions appear beside their property inspector on wide screens, with responsive stacking on narrow screens.
- Opening child editing automatically collapses the main field list into a narrow type-icon rail. Bootstrap tooltips expose index, active-language name and type through hover or focus.
- Closing child editing or selecting a main field restores the full main list. Users can also toggle the main list manually.
- Visibility state remains transient. Specification edits, including table spacing, invalidate review.

## Authoring tools — October 21, 2026

- Copy/cut/paste works for root fields and leaf children, preserving all localized configuration. Complete groups may be copied at root level. Cut is deferred until a successful atomic paste, uses the latest source and retains IDs. Copies receive unique IDs. Failed pastes preserve both specification and clipboard. All field/group limits remain enforced.
- The internal clipboard survives workflow changes and is cleared on replacement, restore/reload or explicit cancellation. Removing a cut source cancels that cut. It never accesses the operating-system clipboard or intercepts text-editing shortcuts. Only a successful paste invalidates review.
- Test-data tools sit outside the mockup. Session settings include DE/EN/FA content profile, explicit seed, valid/empty/invalid/boundary scenarios and explicit replacement. Text boundaries cover exact minimum/maximum, one unit below/above and required-empty. Required/type and shared explicit text-length validation verify expected candidate outcomes. Per-field diagnostics report rule, expected/observed validity and skipped reasons; mismatches restore prior responses. Arbitrary RegEx synthesis, numeric/date bounds and bulk generation are not included.
- Every mounted root and group response can be filled independently. Preserve existing responses, including deliberately unchecked checkboxes. Group rows can stay mounted (adding one to an empty group), use the configured minimum or maximum; shrinking requires replacement. Counts include response instances and explicitly requested group checks. The report displays the first 20 entries. Preview data/settings/reports are not saved or exported. Reset clears responses, validity, reports and edit history and restores group minima.
- Workspace navigation uses the current project name with a localized fallback; the header also exposes the active localized form title. Renaming, replacement, reload and UI-language changes refresh identity without losing the current route.

- The in-app guide explains clipboard, test-data settings and dynamic project context in all three UI languages. README, workshop, demo and contributor instructions must reflect these features.
- Feature comparisons must report differences rather than claim parity from shared names. The original edition's extra profiles, scenario/worker/batch engines and wizard flow are not implemented in Studio; see docs/FEATURE_COMPARISON.md.

## Text-editor and AI authoring help

- Provide separate navigable DE/EN/FA guides for manually authored JSON and AI-assisted form drafting. The existing methodology guide links to both; direct hashes, browser history and reload work.
- Document the Studio 1.3.0 contract, all required root/field/group/button properties, supported enums, localized Text shape, IDs, constraints and import limitations. Do not imply compatibility with other MockForge editions or detailed JSON-path diagnostics.
- Supply two complete importable JSON examples and selectable copy/download controls. Demonstrate ordinary fields, actions, cards and an optional continuous table.
- Supply a downloadable UTF-8 authoring kit with the actual type contract, shared rules and both complete examples. Generate it from maintained sources and reject stale output in CI. Explain attachment versus publicly accessible URL and localhost restrictions.
- Offer localized creation, targeted revision and repair briefs with shared format constraints. Do not automatically invoke an external model. Copy failures select text for manual copying; help never changes the current draft.
- Generated JSON still requires actual import and product-owner review. Never invent reviewer identity, approval, production integrations, test-data persistence or unsupported schema features.

### Coherent synthetic records

- Recognized root identity/address fields share one synthetic record; each repeat row has its own DE/EN/FA record. Native technical types precede exact normalized label, placeholder and help phrases. Conflicting recognized translations use generic text and report ambiguity. Report meaning/source and constraint/scenario adjustments.
- Seed/profile/reference date and physical response structure reproduce data, including after reset/reload. Reordering definitions or preserving unrelated responses must not change identity values. Do not reconstruct generated identities from manual responses.
- Expose a strict calendar reference date from 1000-01-01 to 9999-12-31, default 2026-01-01. Date fields receive it unchanged; no system-clock or relative-date dependency. Invalid settings block filling. Settings and diagnostics remain transient; schema remains 1.3.0.
- Do not imply population realism, unique identities, real-world address correctness, persisted hints/examples or complete original-edition parity. Existing length/pattern and native validation rules still take precedence over record relationships.
