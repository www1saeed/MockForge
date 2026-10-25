# Customer demo and portfolio messaging

## Demo purpose

Show how the developer protects the client's intent before production implementation. End with an invitation to review the client's own form and agree its scope.

## A 15-minute commercial demo

| Time      | Demonstration                                 | What to say                                                                                                              |
| --------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 0-2 min   | Describe the proposed form                    | "I want to understand your outcome before coding. A short request often leaves important details open."                  |
| 2-4 min   | Open Orbit and the brief                      | "Let's agree who uses this form, what sales needs and what is included in the first implementation."                     |
| 4-7 min   | Edit email guidance, rules and choices        | "Even this email policy affects implementation. We can decide it together and preserve the answer in the specification." |
| 7-9 min   | Try invalid input, language and mobile view   | "You can see the experience and point out the wording or layout you want changed."                                       |
| 9-12 min  | Record submit behavior and resolve a question | "The mockup cannot send email, but the exact response and routing requirement belong in our agreement."                  |
| 12-14 min | Review and export                             | "This gives us a reviewed starting point. If the specification changes, we review it again."                             |
| 14-15 min | Invite a customer session                     | "Bring your form idea. We will agree details and implementation scope before production development."                    |

The fifteen-slide presentation follows the same commercial argument. Slides 5–7 trace a fictional SaaS request through late clarification and prior mockup alignment, showing how assumptions can reopen implementation and tests. Spoken explanations add context to every slide. See the [presentation guide](PRESENTATION.md) for browser voices, standalone HTML saving and PDF printing. The agenda is a facilitation suggestion, not a guaranteed duration or time-saving claim.

## Preparation

Use fictional data. Export an existing draft before opening an example. Begin on the overview, open the workspace and choose SaaS. Select the form languages independently of the UI language. Hide the preview for detailed editing, then show it and choose its language for the walkthrough. Demonstrate a tooltip, a RegEx error message and a reset/validate button as concrete decisions. For a populated walkthrough, choose **Fill test data** above the preview. Existing answers stay intact unless replacement is enabled in settings. Use the empty scenario with replacement to check required fields. Call out any skipped candidates: complex patterns still need manual input. Choose DE/EN/FA content independently of the form language. These are synthetic answers, never saved or sent. Acknowledgement requires copy in all selected languages, a complete brief and resolved questions. Do not imply agreement on behalf of a real customer during a sales demo.

Prepare a question relevant to the buyer: lead qualification for sales, the return promise for support, or project fit for an agency. Explain why the business question makes each detail worth discussing.

## Demonstrate the new authoring tools

1. Rename the project in the brief. Show its new name in the workspace header and navigation tooltip. The localized form title appears beneath it; Studio branding remains visible.
2. In the field editor, select a field and choose **Copy**, then **Paste**. Show the independent configuration and new identifier. Copying a group includes its child definitions.
3. Choose **Cut** on a leaf child, close child editing and paste into the root list. Explain that the original moves only when paste succeeds and keeps its identifier. Clear clipboard cancels a pending cut. Avoid emptying a group's definition list; at least one child is required.
4. Show the preview's **Test data settings** dialog. Close it with Escape and show that closing alone does not change answers. Fill explicitly, explain the filled/preserved/skipped summary, then try the normal response reset.
5. Open **How it works** for the same instructions in the current UI language. See [the detailed guide](AUTHORING_TOOLS.md) for bounds and [the comparison](FEATURE_COMPARISON.md) for differences from the original edition. Studio also has a [developer-only bounded browser batch API](TEST_DATA_BATCH_API.md); it is not a bulk screen or export feature. Do not claim the original edition's additional profiles, author examples or wizard scope are present.

## Ready-to-use copy

### GitHub description

Interactive form mockups for product owners and developers to agree requirements before implementation.

### Portfolio headline

Your requirements shape the product before the first implementation sprint.

### Portfolio paragraph

I use MockForge Studio to make product expectations concrete before building the production form. We review wording, required data, validation, design and expected behavior together. I document decisions and implementation boundaries so you can see exactly what I plan to deliver. Early clarification can reduce avoidable refinement during development and makes later scope discussions easier.

### Social announcement

I built MockForge Studio to support a conversation I consider essential: what does the product owner actually want before implementation begins? It combines interactive form mockups with developer notes, a review checklist and an exported implementation brief. Commercial examples cover SaaS demo requests, returns and agency inquiries. The goal is a clearer agreement and less avoidable rework during implementation.

Insert repository/demo URLs only after publication. Do not invent links, testimonials or customer logos.

### Customer invitation

Let's review one form before committing to its implementation. Bring your desired outcome and the details that matter to you. Together we will check the experience, resolve questions and document what I should build.

## Evidence during the demo

For a larger discussion, open **Atlas project & procurement**. It contains every field type, repeated team cards and a procurement table. Add a second stakeholder, compare card/table layouts, switch preview language and try an invalid item code. Agree entry limits, required child data and the deletion confirmation. The mockup captures quantities but performs no pricing, purchasing or finance approval; record those production rules in decisions and notes.

When saying "we agree exact wording," edit a label and show the selected languages. When saying "we clarify behavior," record success/failure requirements in a note. When saying "we preserve the agreement," export the brief. When saying "we review later changes," edit a field after acknowledgement and show the reset.

Do not equate preview confirmation with email delivery, CRM routing or a refund. Those are requirements to agree for production work.

## Continue in a text editor or chatbot

Show the separate text-editor and AI guide entries. Download a complete JSON example and import it through Studio with replacement confirmation. For assisted authoring, download the TXT kit and copy a creation, revision or repair prompt. Explain that the kit is reference material, external models need an accessible attachment or URL, and every result still needs an actual import and owner review. This is a way to draft the specification, not a live AI/backend integration. See [JSON authoring](JSON_AUTHORING.md) and [AI prompts](AI_AUTHORING.md).

## After the conversation

Share JSON, brief and the implementation agreement through the actual communication channel when authorized. Include decisions and unresolved technical assumptions. Confirm agreement before scheduling production development. Later requests should identify the baseline requirement affected and the impact to discuss.

### Demonstrate a boundary decision

Configure a text field with minimum 3 and maximum 6 characters. In test-data settings enable replacement, choose Boundary and try minimum, maximum, below minimum and above maximum. Open per-field results and compare expected/observed validity. Correct the response manually to show the error clears. For a group, choose maximum rows, then minimum without replacement to demonstrate protected responses. Discuss the real business limit; these scenarios do not implement numeric/date range rules or production validation.

### Demonstrate a coherent record

Use text fields labeled First name, Last name, Full name, Company, Street, House number, Postal code, City and Country, plus native Email and Date fields. Select a profile, seed and reference date, enable replacement and fill. Show the combined name/address and ASCII example.org email. Add the same identity fields inside a group to demonstrate independent row records. Expand diagnostics to explain label versus placeholder/help recognition and any length adjustments. Reset and fill again to reproduce the walkthrough. Preserve a manual answer once to explain that the generator does not infer an identity from it.

### Demonstrate isolated pattern checking

Use a field with `DE-[A-Z]{2}\d{4}` to show bounded synthesis. Then use a name field with a finite alternative that includes an actual fictional profile name to demonstrate known-fixture worker verification. Inspect the report rather than implying every expression can be generated. Cancellation discards pending fill before answers or rows change. Manual deferred input is isolated as well; timeouts and unverified responses cannot simulate a successful submit. Keep the customer walkthrough focused on the intended validation rule, not a claim of arbitrary RegEx coverage.
