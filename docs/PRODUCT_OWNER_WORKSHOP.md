# Product owner alignment workshop

## The developer's commitment

I want to implement what you actually need. Before we start production development, we use a working mockup to check how your users will experience the form. We record decisions at the level of detail that affects the implementation, including the small details that are easy to overlook in a ticket.

The meeting should end with an implementation agreement the owner and developer can both explain. A polished preview alone is insufficient: the scope, behavior behind the buttons and acceptance criteria must also be settled for the work about to begin.

## Suggested agenda

| Time | Discussion | Output |
| --- | --- | --- |
| 0–10 min | Who uses the form, and what should it achieve? | Brief and success criterion |
| 10–25 min | Walk through labels, hints, choices and required data. | Reviewed field specification |
| 25–35 min | Select form languages; try incomplete data, patterns, tooltips and mobile view in each selected language. | Validation and copy decisions |
| 35–45 min | Describe submit behavior, failures and system boundaries. | Developer notes and acceptance criteria |
| 45–55 min | Resolve questions and confirm the handoff. | JSON, Markdown brief and review record |

These times are facilitation suggestions, not productivity claims.

## Small details worth agreeing

For each field, confirm its purpose, exact label in every selected language, required status, examples, helper text, tooltip, selectable values, order, length constraints, optional RegEx pattern and expected error behavior. Discuss what screen readers should convey and whether the input is genuinely necessary. Hide the preview while editing details, then show it to try the result. For each button, agree on localized labels, appearance, order, simulated action and the intended production behavior in its developer note.

For the form, confirm one/two columns, mobile order, title, description and exact call to action. Document loading, success, cancellation and server failure behavior in the decisions even though the prototype only simulates submission.

For the handoff, name the owner of each external integration, define what is excluded and state what a developer can verify as accepted. Resolve questions in the decisions before clearing the open-question box. The app does not provide a resolved-question history.

## Example acceptance criteria

For the SaaS demo request:

- A request without a full name, valid email, company, team size or privacy acknowledgement is blocked.
- Team size presents the three agreed ranges in every selected language.
- The helper text explains where the invitation will be sent.
- Production submission prevents duplicate requests while waiting for an API response.
- A successful response displays the agreed confirmation copy. A failure preserves input and offers a retry.
- Sales receives the agreed fields through the selected integration.

The last three criteria describe future production behavior and belong in developer notes. They are not implemented by this mockup.

## Handling changes after the review

Compare a new request with the exported baseline. Record the change, its reason and the affected acceptance criteria. Estimate the impact with the product owner and agree whether to include it now or later. Reopen the review when the mockup changes.

Early alignment can reveal misunderstandings while changes are inexpensive. It cannot eliminate discovery or replace technical validation during implementation.

## A concrete decision conversation

For the SaaS example, start with "Should a prospect be able to use a personal email address?" Explain what the answer changes: validation, error wording, possible server rules and the sales policy.

Record the actual decision and reason. If the answer is "yes," update the wording so it does not misleadingly require a work address. If the answer is "no," document the agreed validation and feedback for production; the current preview validates email format but does not block personal domains.

Then ask what the customer sees after submission and who follows up. Preserve the exact response promise and integration owner. The developer now has a concrete requirement to implement instead of an assumption.

## Readiness before production development

Use [the implementation agreement](IMPLEMENTATION_AGREEMENT_TEMPLATE.md) with the exported JSON/brief. Confirm the intended experience, exact copy, rules, technical dependencies and testable acceptance criteria. Preserve decisions and explicitly excluded work. Resolve any question that blocks the included scope before starting its implementation.

If technical feasibility needs investigation, agree that investigation as a separate activity and name its owner. A prototype cannot settle an unknown API or legal/privacy requirement by itself.

The app's empty question box is a review condition, not a reason to erase unresolved meaning. Move answered questions into decisions and preserve excluded/deferred questions in the agreement. Confirm actual approval through the team's communication process.

## Explain the value to the owner

"This session gives me a clear basis for implementing your wishes. We can refine these details now instead of changing production code because I guessed wrong. Once we agree the scope, I can estimate and test that work more precisely. If you discover a new need later, we can discuss its impact against this baseline."

Do not promise a fixed saving. Evaluate the session by the decisions it resolves and the clarity of the resulting implementation scope.
