# Three progressive application examples

Open **Business examples** and choose a project. Replacement always asks for
confirmation; export the current draft first or cancel to keep it. The gallery,
JSON-authoring guide, downloadable JSON files and AI authoring kit all use the
same three Studio 2.5.0 application snapshots. Every example includes DE/EN/FA
copy, with German/English initially active and no recorded approval.

| Level | Forms and lists | What to try |
| --- | --- | --- |
| [Contact desk](../src/assets/guides/studio-starter.form.json) | One form, three fields, one CRUD list | Create a name/email record; the message is optional. Edit/delete through the list. |
| [Purchase requests](../src/assets/guides/studio-groups.form.json) | One form, three views of its records, one repeated table | Add 1–8 line items inside the request. Compare All requests, the fixed New preset and the read-only overview. |
| [Procurement workspace](../src/assets/guides/studio-workspace.form.json) | Two forms, seven lists, line-item table and optional contact cards | Keep requests and suppliers separate, combine status/priority presets, use active-supplier and read-only views, then export the complete application. |

The middle example's table repeats fields **inside the form**. Each saved request
owns its positions. Its lists show whole requests; there is no flattened list over
child rows. The extensive example also has 0–4 optional contact cards. The two
forms have separate datasets; there is no automatic supplier/request relation.
Numeric positivity, prices, totals and approval routing remain requirements to agree
for production. The native numeric fields do not pretend those rules are enforced.

Use **Application preview** for connected form/list navigation. A normal form's
**Check responses** button simulates validation; use **Create record** in its list
to retain a session record. Generate test records when useful: configured counts
are 8 contacts, 12 requests in the middle example, and 18 requests/10 suppliers in
the extensive example. They start empty and generated values remain session-only.
JSON/Markdown retain configuration; offline HTML starts with fresh record sessions.

## Simulated roles and remaining policy questions

The workspace now demonstrates three active simulated roles: Coordinator (all enabled actions), Purchasing (edit without delete and supplier creation), and Observer (read requests, supplier screens blocked). Select a role in application preview or the offline export. All three examples also include the standard Visitor/User/Admin profiles. See [role inheritance and limits](ROLE_ACCESS.md). Existing overview/directory action switches remain effective for every role. Presets do not enforce ownership; field policies also constrain record details. Contact responsibility fields remain business labels.

Field visibility/read-only rules are configurable. Record ownership, authenticated identity, status transitions and production server authorization remain future decisions. No credentials or selected actor are stored.

## Source and verification

`application-examples.ts` provides the catalogue and returns validated, detached
copies. The canonical data lives in the three linked JSON files. Gallery loading
uses whole-application replacement, preserving both forms and every list. The
legacy `example()` single-form fixtures remain for renderer/import regressions and
the existing initial draft; they no longer define the gallery.

Run `npm run authoring:build` after editing assets; `npm run authoring:check`
detects stale kit content. Unit cases validate all projects/translations, detached
nested definitions and the capability/planning boundary. The `examples` E2E suite
covers the actual gallery, CRUD, repeated row restoration, presets/read-only views,
independent form datasets, offline export/theme and Persian mobile accessibility.
The authoring-guide journeys download/import all three assets and inspect the kit.

The intermediate/extensive examples also demonstrate table, cards and accordion list layouts, badges, selected group subfields and group/child column paths. The repeated items still belong to their form's records. Switch preview/data language or choose Mixed to generate the supported active-language profiles.

All three current examples include Visitor, User and Admin demo users. They start with Visitor; choose Admin for full CRUD walkthroughs. The workspace also retains its business roles and demonstrates hidden contact information and protected repeated item codes. These are simulated policies, without ownership or server authorization.
