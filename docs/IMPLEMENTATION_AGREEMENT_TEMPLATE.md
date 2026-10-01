# Form implementation agreement

Copy this template for the actual customer project. It extends the exported brief with decisions beyond the preview. Complete bracketed placeholders with the product owner.

## People and baseline

- Project: [name]
- Product owner: [name/responsibility]
- Developer/team: [name]
- Agreement date: [date]
- MockForge Studio JSON/brief: [files]
- Baseline identifier: [filename, commit or document version]
- Actual approval channel: [agreed process]

## Business outcome and scope

Audience: [who uses the form]

Objective and success criterion: [desired result and how to evaluate it]

Included implementation: [explicit scope]

Excluded/deferred work: [explicit boundaries]

## UI decisions

| Detail | Agreed requirement | Verification/owner |
| --- | --- | --- |
| Labels and guidance | [exact wording in every language] | [reviewer/check] |
| Fields and order | [necessary inputs and sequence] | [reviewer/check] |
| Required data | [mandatory/optional and reason] | [reviewer/check] |
| Choices and rules | [values, limits and error messages] | [reviewer/check] |
| Design library | [actual production library and visual direction] | [engineering owner] |
| Responsive behavior | [columns, mobile order and devices] | [checks] |
| Accessibility | [keyboard, labels, feedback and target] | [verification approach] |
| Button text | [exact action and promise] | [reviewer/check] |

## Behavior beyond the preview

| Situation | Agreed behavior | Dependency/owner |
| --- | --- | --- |
| Valid submission | [action/API/data contract] | [system/team] |
| In progress | [loading and duplicate prevention] | [team] |
| Success | [message, next step and timing promise] | [team] |
| Field/server error | [feedback and data retention] | [team] |
| Network failure | [retry/escalation] | [team] |
| Privacy/consent | [approved wording, link and handling] | [reviewer] |
| Notifications/routing | [recipient, information and timing] | [system/team] |

These are production requirements. MockForge Studio simulates submission and does not verify external systems.

## Decision register

| Question | Agreed decision | Reason | Owner/date |
| --- | --- | --- | --- |
| [question] | [decision] | [business reason] | [person/date] |

Preserve resolved answers here or in MockForge Studio decisions before clearing the open-question box.

## Acceptance criteria

1. Given [starting condition], when [action], then [observable result].
2. Given [invalid input], when [action], then [specific feedback and preserved state].
3. Given [mobile/language condition], when [action], then [agreed presentation].

## Development readiness

- [ ] The owner has checked experience and exact copy.
- [ ] Included requirements have a decision or an explicit agreed assumption.
- [ ] Technical dependencies, privacy and feasibility have owners.
- [ ] Acceptance criteria cover success and relevant failure paths.
- [ ] JSON and brief match the agreed baseline.
- [ ] Questions are resolved or explicitly excluded from this implementation scope.
- [ ] Owner and developer confirmed the agreement through the actual approval channel.

The app's review requires an empty question box. Preserve resolved/deferred decisions rather than deleting their meaning.

## Change after agreement

Request and reason: [description]

Affected baseline requirement: [reference]

Estimated impact: [work, tests, dependencies, schedule and budget]

Owner/team decision: [include, defer or investigate]

Updated baseline/review: [reference/date]
