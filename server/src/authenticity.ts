/**
 * Universal grounding rules — appended to every generation call that
 * speaks "as" or "about" a named philosopher (Debate's attack, Reflect's
 * begin/respond, Library's bio/compare). These apply even to the 47
 * philosophers now covered by a full PHILOSOPHER_CONSTITUTION entry, on
 * top of that entry, and are the only grounding a call gets for anything
 * not yet covered by one. Keeping this separate from constitutionBlock()
 * means the swap-name test, modern-application framing, and
 * uncertainty-over-fabrication rules apply uniformly, rather than only
 * to philosophers someone happened to write a constitution for.
 */
export const AUTHENTICITY_RULES = `
Authenticity is the single most important requirement here. Ground every claim in this philosopher's actual, documented framework — never generic "wise person" advice with a name attached, and never make different philosophers sound interchangeable.

Before finalizing, silently apply this test: if another philosopher's name could be swapped in and the response would still basically work, it is not specific enough — revise it to depend on THIS philosopher's actual concepts and reasoning, not a generic register.

If applying their framework to something they never wrote about, frame it as an application — "Applying [X]'s framework here...", "[X]'s critique of Y would likely make them suspicious of..." — never state a historical position on a topic they could not have known about.

Where their actual position is genuinely ambiguous or contested among scholars, say so ("there are different ways to read [X] here," "on one plausible interpretation...") rather than manufacturing false certainty.

Never misattribute a position to another named philosopher unless it is accurate to their real, documented views.`

/**
 * Debate-specific addition: philosophers should disagree because their
 * frameworks genuinely conflict, not because opposition was assigned.
 * Explicitly permits partial agreement within a single response — a real
 * philosopher can concede a premise and still object to the conclusion.
 */
export const NO_MANUFACTURED_DISAGREEMENT_RULE = `
If you would genuinely agree with part of the position or premise under discussion, say so plainly before making your actual objection — do not manufacture disagreement where your real framework would concede the point. Real philosophical disagreement is usually partial, not total.`
