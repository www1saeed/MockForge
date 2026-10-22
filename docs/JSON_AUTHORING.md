# Design a form in a text editor

Open **Design a form in a text editor** in Studio's navigation, or use `/#guide-json`. The page provides a DE/EN/FA reference, selectable complete JSON, and downloads. The format is **MockForge Studio 1.3.0**; files from the original MockForge edition are incompatible.

## Working sequence

1. Export your current draft as a backup. Start from that export or one of the complete examples below.
2. Edit a working copy in a text editor. Save UTF-8 JSON with a `.form.json` extension. Keep every required property, empty arrays and inactive translations. Use real numbers/booleans, no comments, trailing commas or Markdown fences.
3. Open the workspace, choose **Import JSON** and select the file. Studio validates before staging replacement. Confirm replacement, export the old draft first, or cancel.
4. Check each active language, native validation, pattern messages, repeat rows and mobile layout. Refine visually and re-export. Imports clear reviewer identity and acknowledgement; conduct a new review with the owner.

## Complete files

- [Contact request](../src/assets/guides/studio-starter.form.json): text, email, select, checkbox, a submit simulation and reset.
- [Team cards and line-item table](../src/assets/guides/studio-groups.form.json): the contact request plus required team cards and an optional continuous table. Children have unique IDs; the item-code pattern demonstrates a localized error message.

These are fictional examples, not customer projects. Both files include all required root and field keys, DE/EN/FA text objects, selected DE/EN form languages and an unacknowledged review record. Inactive Persian copy is retained and can be selected in Studio.

## Contract reference

The in-app reference groups the properties below. The authoritative types live in [project.model.ts](../src/app/project.model.ts) and import checks in [project.validation.ts](../src/app/project.validation.ts).

| Object  | Required properties and bounds                                                                                                                                                                                                       |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Project | `schemaVersion: "1.3.0"`; string `name`, `owner`, `audience`, `goal`, `scope`, `decisions`, `questions`; `title`, `description`, `submit` as Text; `theme`, `columns`, `languages`, `buttons`, `fields`, `review`.                   |
| Text    | `{ "de": "...", "en": "...", "fa": "..." }`. All three keys are required. Activate one or two distinct languages. Empty inactive translations are allowed.                                                                           |
| Field   | `id`, `type`, `label`, `placeholder`, `help`, `required`, `options`, `note`, `minLength`, `maxLength`, `tooltip`, `pattern`, `patternMessage`. Optional `tooltipPlacement` and, only for groups, `group`.                            |
| Group   | `layout: "cards"` or `"table"`, integer `minItems` 0–20, `maxItems` 1–20, `minItems <= maxItems`, and 1–20 leaf definitions in `fields`. Optional boolean `gapless`. No nested groups. Set the group's `required` to `minItems > 0`. |
| Button  | `id`, Text `label`, `variant`, `action`, `cssClass`, `note`. At most 20. Keep the legacy root `submit` equal to the first submit-button label, or empty Text when none exists.                                                       |
| Review  | `checks: [false,false,false,false,false]`, `reviewer: ""`, `approvedAt: null` for a new externally authored draft. A file cannot establish authenticated approval.                                                                   |

Field types: `text`, `email`, `number`, `url`, `date`, `textarea`, `select`, `radio`, `checkbox`, `group`. Select/radio choices are an array of Text objects, not `{value,label}` pairs; at least one is required and at most 100 are allowed. A checkbox is one boolean answer.

Field IDs match `^[a-z][a-z0-9_-]{0,63}$` and must be globally unique across root/group children. Button IDs follow the same syntax and are unique within the button list. The total limit of 100 definitions includes groups and children. Preserve IDs when moving or editing; assign fresh IDs to copies.

Length rules are integers 0–10000; maximum 0 means unlimited. Minimum cannot exceed a nonzero maximum. These are text-length rules, not numeric ranges. Patterns apply to text/email/url/textarea, match the whole value with Unicode-v semantics and contain no slash delimiters. Double backslashes in JSON. Empty pattern disables it; the maximum is 500 characters. Tooltip placement is `title`, `icon` or `info`, defaulting to the question icon when omitted.

Themes: `bootstrap`, `material`, `carbon`, `fluent`; columns: 1 or 2. Button variants: `primary`, `secondary`, `ghost`, `danger`. Actions: `submit`, `validate`, `save`, `reset`, `cancel`, `delete`, `next`, `back`, `none`. Existing CSS class tokens use only letters, digits, underscore, whitespace or hyphen, at most 200 characters. Styles and actions never implement a backend. Next/back simulate navigation within this single-page edition.

## Troubleshooting and boundaries

Files above 1 MiB, wrong versions, malformed Text objects, duplicate IDs, unsupported enums, invalid patterns and out-of-range groups are rejected. Studio currently reports a general import failure, not detailed JSON paths. Compare the file with a complete example and check syntax in the editor. Older Studio files use the existing migration path; do not relabel a foreign-edition file as 1.3.0.

Keep preview answers, test-data settings and field-clipboard state out of the file. Extra keys do not add conditional visibility, uploads, wizard pages, numeric min/max validation or integrations. Record production requirements in the brief and notes. For assisted drafting, use [the AI guide](AI_AUTHORING.md).
