# Simulated roles and inherited rights

Open **Roles & rights** in the workflow. Add up to ten roles, give each an active-language name and set its default rights. New roles can open screens and view records; create/edit/delete start disabled. With no roles configured, preview remains unrestricted, subject to the list's existing action switches.

The matrix edits overrides for the selected role. Forms inherit defaults from the role; lists inherit from their own form. **Inherit** removes the override, **Allow** sets true and **Deny** sets false. Each cell shows the effective result. A denied form gates every list below it, even if a list explicitly allows opening. A disabled list action stays disabled for every role. Form menu visibility still controls navigation presentation independently of access.

| Right | Effect |
| --- | --- |
| Open | Reach the form/list through its menu or direct link. A denied screen has an explicit blocked state. |
| Create | Create list records and append generated records; run normal-form Submit simulations. |
| View | Open a list record's read-only details with authorized fields. List cells remain visible when Open is allowed. |
| Edit | Save edits to existing list records; run normal-form Save simulations. |
| Delete | Delete/clear list records; run normal-form Delete simulations. Replacing a nonempty dataset also requires Create. |

Normal validation, reset/cancel and navigation simulations remain available on an allowed form. Field controls and record details follow the effective hidden/readonly/editable rules. Column selection, presets and menu hiding are not field or record permissions.

## Preview and standalone behavior

The application sidebar offers **Simulated role** when roles exist. With no demo users configured, the first role is the initial choice; otherwise the first demo user supplies its role. Selection is temporary and resets on project replacement or reload; it is not written into project JSON, storage or HTML captures. An exported offline application carries the role definitions and policies and starts its own fresh role/record session.

Role/policy changes retire open editors, unsaved responses, global confirmations and pending validation/generation. Accepted session records remain shared and intact. Handler and store checks reject obsolete saves, deletions and staged batches even if an old callback is invoked. Label-only role edits keep the active scope stable. Removing a role also removes its assigned demo users and form/list/field overrides; removing the last role requires confirmation and returns the application to unrestricted preview.

The Studio authoring workspace remains unrestricted so authors can inspect and configure the whole prototype. Returning to the editor retains session records. The role picker simulates requirements: it supplies no identity, credentials, ownership checks, real sign-in, backend or server authorization.

## Studio 2.5 contract

`roles?: ApplicationRole[]` contains safe unique IDs, localized `label` and complete boolean `rights` for open/create/view/edit/delete. Each form/list can have `access?: AccessPolicy`, keyed only by existing role IDs and containing partial rights. Unknown roles/rules, non-booleans, duplicate IDs, malformed/oversized Text objects and more than ten roles are rejected. Empty role-name translations are valid draft copy. Activating a language preserves the empty value rather than rejecting the language change or inventing a translation. The editor persists every draft and shows a field-level error; Review requires a nonempty trimmed name for every active language. Pickers and deletion confirmations fall back to the role ID when the selected translation is blank. Existing form/list/resource limits stay unchanged.

Supported 2.4 and earlier Studio files migrate with approval cleared and no invented roles. New role policies and badge colors cannot be relabelled as older formats. JSON, Markdown handoff, examples and the generated authoring kit retain role definitions and overrides; generated answers and the selected role never belong to the specification. The renderer/batch projection remains 1.3.0.

The extensive workspace example includes Coordinator (full rights), Purchasing (edit without delete, with supplier creation) and Observer (read requests, blocked suppliers). Read-only list action switches still restrict Coordinator.

## Verification

Pure/unit tests cover bounded imports/migration, inheritance and parent gates, disabled actions, role authoring/deletion, direct store operations, stale callbacks and late generation. Browser cases in `e2e/roles.spec.ts` cover the actual editor/matrix, persistence, direct routes, shared records, role switching, badge/chip presentation, offline storage/network isolation and Persian mobile Axe/layout. Run `npm run e2e -- --area roles`; full Chromium regression remains the default.

Policy lookup uses only own JSON entries, including for role IDs such as constructor. A role with no available menu screens sees the blocked state at application home; a genuinely empty application menu retains its empty state. Access edits detach incoming roles/policy maps while sharing unchanged, store-owned form and field definitions.

## Demo users and field policies

Install the predefined profiles with the presets button. Visitor can read, User can create and edit, and Admin has full screen and field rights. Admin bypasses form/list access overrides and field policies; explicitly disabled list actions still apply. Preset IDs are reserved only when installed with their matching preset marker. Existing custom roles are never silently promoted. Conflicting IDs prevent installation atomically.

Optional `users` contains at most 20 fictional, passwordless definitions (`id`, localized `name`, existing `roleId`). The sidebar starts with the first configured user and also permits free role selection. Switching users invalidates pending editors even when both users share a role. User names are draft copy, with all active translations required for review. Definitions are exported; the selected actor is transient. This is a requirements simulator without authenticated identity or server enforcement.

A role's optional `fieldMode` defaults to editable. A form's `fieldDefaults` maps role IDs to default modes; `fieldAccess` maps up to 100 existing root or `group/child` references to role-specific overrides. Modes are hidden, readonly and editable. The form default caps root overrides, and group modes cap their children. Omitted rules inherit. Admin always resolves editable.

Hidden fields disappear from forms, list columns, search/filter/sort projections and record details. A group column whose explicitly selected children are all hidden disappears rather than showing other children. Readonly controls are disabled and do not block native validation. Hidden and readonly required fields do not prevent creating a record. Protected saved values, including false checkboxes, survive edits; forged submitted values cannot overwrite them. A repeated group containing protected children locks its row structure so edits cannot delete protected rows. Existing missing groups remain missing.

Session records retain their complete data for authorized views and later role changes. Fixture generation only generates editable fields for the active actor. Authoring stays unrestricted. Standalone exports use the same resolver and start a fresh Visitor session for the progressive examples; choose Admin for a complete walkthrough. Older imports receive no invented demo users or preset markers. Renderer and batch inputs remain schema 1.3.0.

The four journeys in `e2e/field-access.spec.ts` cover preset installation, inheritance, protected native controls and store values, hidden queries/details, same-role actor changes, Admin limits and offline Persian mobile accessibility.
