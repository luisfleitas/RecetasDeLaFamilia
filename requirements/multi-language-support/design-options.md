# Multi-Language Support Design Options

## Status
- Workflow phase: Phase 4 complete
- Design approval status: Approved
- Approved date: 2026-04-21
- Approved direction: Option A with modifications

## Inputs Received
- [plan.md](/Users/luisfleitas/Personal%20Projects/recetas/requirements/multi-language-support/plan.md)
- [research-pack.md](/Users/luisfleitas/Personal%20Projects/recetas/requirements/multi-language-support/research-pack.md)
- Existing UI patterns in:
  - [app/page.tsx](/Users/luisfleitas/Personal%20Projects/recetas/app/page.tsx)
  - [app/_components/recipe-visibility-tabs.tsx](/Users/luisfleitas/Personal%20Projects/recetas/app/_components/recipe-visibility-tabs.tsx)
  - [app/recipes/new/new-recipe-form.tsx](/Users/luisfleitas/Personal%20Projects/recetas/app/recipes/new/new-recipe-form.tsx)
  - [app/recipes/[id]/page.tsx](/Users/luisfleitas/Personal%20Projects/recetas/app/recipes/[id]/page.tsx)

## Assumptions
- We are still in the design phase and should not start implementation until one option is approved.
- We want several realistic options, not speculative redesigns.
- Any option must preserve the Recetas secondary-menu rule and mobile behavior expectations.
- The user has explicitly requested a flag inside the locale dropdown for the approved direction, even though flags are a weaker semantic fit for language than text labels alone.

## Deliverables
### Option A: Header Locale Dropdown Plus Basic-Info Recipe Language
#### Summary
- Put a compact locale dropdown in the header action row.
- Show the active locale in the trigger with a small flag plus text label.
- Show flag plus label in the dropdown menu options.
- Add `Recipe language` as a segmented control in the `Basic info` section for create and edit.
- Add the same recipe-language control to import review.
- Show recipe language as a metadata pill on the detail page.

#### Why it fits the codebase
- Reuses the existing header action cluster in [app/page.tsx](/Users/luisfleitas/Personal%20Projects/recetas/app/page.tsx).
- Reuses the visual language of the visibility tabs in [recipe-visibility-tabs.tsx](/Users/luisfleitas/Personal%20Projects/recetas/app/_components/recipe-visibility-tabs.tsx).
- Fits the existing `surface-card` section pattern in recipe forms.

#### Desktop behavior
- Locale dropdown sits in the same action row as Add Recipe and the signed-in status pill.
- Trigger example: `US English` or `ES Español` with a chevron.
- Recipe language appears below title and description in Basic info.
- Detail page shows `Language: English` or `Language: Spanish` alongside other pills.

#### Mobile behavior
- Header actions stay on one row for desktop review and wrap into multiple lines only when needed on smaller screens.
- Locale dropdown remains visible without creating a separate settings area.
- Form selector stacks naturally within Basic info.

#### Strengths
- Highest consistency with current patterns.
- Fastest to discover for both guests and signed-in users.
- Clear separation between UI language and recipe language.
- Dropdown reduces visual weight in the action row compared with a permanent segmented control.

#### Risks
- Header may still get crowded on small screens if the trigger label is too wide.
- Flag-language pairing can imply country rather than language, so text labels must remain primary.
- Dropdown interaction is slightly less instantly scannable than a persistent segmented control.

#### Scorecard
- UI cleanliness: 5
- Ease of use: 4
- Mobile readiness: 4
- Accessibility basics: 4
- Consistency with existing Recetas UI patterns: 4
- Implementation complexity: 4
- User task efficiency: 5

### Option B: Header Utility Link Plus In-Panel Language Picker
#### Summary
- Keep the header lighter by using a text-link style locale control near the auth/account links.
- Use a more explicit in-panel recipe-language row in Basic info with help text and full labels.
- Keep detail-page language in metadata pills.

#### Why it fits the codebase
- Still lives in the header, so it remains globally reachable.
- Reduces the number of button-like controls competing in the action row.
- Keeps form clarity high by making recipe language more explicit than Option A.

#### Desktop behavior
- Locale control appears as a compact text-link pair such as `English | Español`.
- Basic info uses a labeled row with full-width segmented buttons or radios.
- Detail page remains unchanged from Option A.

#### Mobile behavior
- Header wraps more gracefully because the locale control is less visually heavy.
- Form row is clear but consumes slightly more vertical space.

#### Strengths
- Easier to explain the locale switcher in plain language.
- Lower header crowding risk than Option A.
- Recipe-language meaning is very explicit in forms.

#### Risks
- Locale control drifts away from the established tab-style interaction.
- Text-link style may feel less interactive and less scannable.
- Slightly weaker consistency with the approved secondary-menu reference.

#### Scorecard
- UI cleanliness: 4
- Ease of use: 4
- Mobile readiness: 5
- Accessibility basics: 4
- Consistency with existing Recetas UI patterns: 3
- Implementation complexity: 4
- User task efficiency: 4

### Option C: Secondary-Tab Locale Strip Under Header Plus Deferred Card Language
#### Summary
- Add a dedicated locale strip directly under the top header using the same secondary-tab-strip treatment.
- Keep recipe-language segmented control in Basic info and import review.
- Display recipe language on detail page only in phase 1, not on home cards.

#### Why it fits the codebase
- Maximizes reuse of the existing `secondary-tab-strip`.
- Gives locale switching a very clear dedicated position.
- Avoids overcrowding the primary action row.

#### Desktop behavior
- Header action row stays almost unchanged.
- Locale strip appears beneath the existing secondary navigation.
- Recipe form and detail behavior match Option A.

#### Mobile behavior
- Dedicated strip is easy to tap and visually clear.
- But the header becomes taller and more stacked before content starts.

#### Strengths
- Strongest pattern consistency for the switcher itself.
- Lowest risk of action-row crowding.
- Very visible and obvious setting for guests.

#### Risks
- Adds more header height and pushes content downward.
- Could feel too prominent relative to its importance.
- Risks looking like a structural navigation layer rather than a utility control.

#### Scorecard
- UI cleanliness: 4
- Ease of use: 4
- Mobile readiness: 4
- Accessibility basics: 4
- Consistency with existing Recetas UI patterns: 5
- Implementation complexity: 3
- User task efficiency: 4

### Lead Critique
#### Top strengths across options
- All three options keep the locale control globally reachable.
- All three keep recipe language inside recipe-authoring flows where it belongs.
- All three keep text labels available for language selection.

#### Main risks across options
- Any solution that adds too many controls to the header can make mobile feel crowded.
- Any solution that does not visually differentiate UI language from recipe language clearly will create user confusion.
- Any option that strays too far from the tab reference pattern creates unnecessary one-off UI.
- Any option using flags for locale cues must avoid relying on flags alone.

#### What must change before implementation
- We need one explicit approved option, not a hybrid invented during coding.
- We need a decision on whether older recipes hide missing language or show a default/fallback indicator.
- We should keep home-card recipe-language display deferred unless layout testing proves it stays clean.

### Recommendation
#### Recommended option: Option A
- Best balance of discoverability, consistency, and implementation realism.
- Most aligned with the current Recetas header while reducing the weight of a persistent toggle.
- Keeps the feature visible without introducing a new navigation layer.
- Approved variant: use a compact dropdown with a flag plus text label in the trigger and menu.
- Header layout note: keep Add Family Recipe, the locale dropdown, and the signed-in pill in one shared desktop action row.
- Button layout note: keep `Add Family Recipe` on a single line in desktop review and avoid wrapping the button label.

#### Runner-up: Option C
- Strong fallback if header crowding becomes unacceptable during implementation.
- Worth keeping as the backup direction, not the default.

### Approval Record
- Design approval status: Approved
- Approved direction: Option A
- Approved revision: replace the header segmented locale switcher with a locale dropdown that includes a small flag and text label
- Approved layout revision: keep Add Family Recipe, the locale dropdown, and the signed-in pill in the same desktop action row
- Approved layout revision: keep `Add Family Recipe` on a single line in desktop review
- Recipe language control remains a segmented control in Basic info and import review
- Recipe detail language remains a metadata pill

## Open Risks
- Even the recommended option needs careful mobile wrapping checks once real Spanish copy is in place.
- Accessibility names for the locale dropdown and menu items must use full language names.
- Flags must remain supporting visuals, not the only indication of language.

## Next Agent Should Do
- Treat this design approval as Approval Gate 1 complete.
- Move to implementation-plan approval as Approval Gate 2 before any code changes begin.
