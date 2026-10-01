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
| Copy            | Support German, English and Persian while allowing one or two active form languages. Title, introduction, field/choice/tooltip and button copy are editable in each selected language. Switching retains inactive copy.                                                  |
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
