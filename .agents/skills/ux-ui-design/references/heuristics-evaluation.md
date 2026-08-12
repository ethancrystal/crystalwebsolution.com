# Nielsen Heuristic Evaluation — Audit Rubric

A heuristic evaluation is a structured expert review of an interface against the 10 usability heuristics. It is fast, cheap, and finds the majority of usability problems before testing with users. Walk each heuristic against each key screen/flow, log every violation, rate its severity, and propose a concrete fix.

## How to run the pass
1. Define the **scope**: which screens/flows, which user goal, on which device/context.
2. Go heuristic by heuristic (or screen by screen, checking all 10). Two passes beats one — the first to learn the flow, the second to judge.
3. For each problem: name it, cite the heuristic(s) it violates, rate severity 0–4, and write a specific fix. Note location (screen + element).
4. Sort findings by severity. Lead with 3s and 4s. Don't bury a catastrophe under nitpicks.

## The 10 heuristics (as audit questions)

1. **Visibility of system status** — Does the system always keep the user informed of what's happening, within reasonable time? Loading, saving, progress, current location, success/failure all visible? *Common violations: actions with no feedback, no progress on long waits, no current-page indicator.*

2. **Match between system and the real world** — Does it speak the user's language (words, phrases, concepts) and follow real-world conventions, in a natural order? *Violations: jargon, internal IDs/codes, developer phrasing, unnatural field order.*

3. **User control and freedom** — Is there a clear "emergency exit"? Undo and redo? Can the user back out of a mistake without penalty? *Violations: no cancel, no undo, irreversible silent actions, modal traps, "are you sure" as the only safety net.*

4. **Consistency and standards** — Do the same words, actions, and components mean the same thing everywhere? Does it follow platform conventions? *Violations: two names for one concept, inconsistent button placement, reinvented controls that defy platform norms.*

5. **Error prevention** — Better than good error messages: does the design prevent problems in the first place? Confirmation for destructive acts, constraints, good defaults, format help before submit? *Violations: easy-to-trigger destructive actions, free-text where a picker would prevent typos, no confirmation on irreversible acts.*

6. **Recognition rather than recall** — Are objects, actions, and options visible? Does the user avoid having to remember information across screens? Are instructions visible or easily retrievable? *Violations: hidden options, relying on memory between steps, unlabeled icons, "remember the code from the last screen."*

7. **Flexibility and efficiency of use** — Are there accelerators (shortcuts, defaults, recents, bulk actions) for experienced users that don't get in novices' way? Can frequent actions be tailored? *Violations: no keyboard shortcuts, no bulk operations, forcing experts through novice flows.*

8. **Aesthetic and minimalist design** — Does each screen avoid irrelevant or rarely-needed information that competes with the essentials? Is the signal-to-noise high? *Violations: clutter, redundant content, decoration that fights the task, walls of options.*

9. **Help users recognize, diagnose, and recover from errors** — Are error messages in plain language (no codes), do they precisely state the problem, and do they constructively suggest a solution? *Violations: "Error 500", "Invalid input", red text with no fix, error far from its cause.*

10. **Help and documentation** — When help is needed, is it easy to find, task-focused, concrete, and not too large? Better still, is the system usable without it? *Violations: no contextual help, help that's a generic manual, no inline guidance on complex fields.*

## Severity scale (rate every finding)
Severity = frequency × impact × persistence. Use it to prioritize, not to shame.

| Rating | Meaning | Action |
|---|---|---|
| **0** | Not a usability problem | Note and drop |
| **1** | Cosmetic — fix only if spare time | Backlog |
| **2** | Minor — low priority; users work around it | Schedule |
| **3** | Major — important to fix; frustrates/blocks many users | Fix this cycle |
| **4** | Catastrophe — must fix before release; blocks the task or causes data loss | Stop-ship |

## Finding report format
Log every finding like this:

```
[Severity 0–4] Short problem title
  Location:   <screen / flow / element>
  Heuristic:  <#N name> (list all that apply)
  Problem:    <what's wrong and why it hurts the user>
  Evidence:   <where/when it happens; who it affects>
  Fix:        <specific, actionable recommendation>
```

Example:
```
[3] No feedback after "Save" on the settings page
  Location:   Settings → profile, Save button
  Heuristic:  #1 Visibility of system status; #3 User control
  Problem:    Clicking Save shows nothing; users re-click, unsure it worked.
              Risk of duplicate submits and lost trust.
  Evidence:   Reproduces on every save; affects all users; persists every visit.
  Fix:        Disable the button on submit, show a spinner, then a "Saved"
              confirmation + timestamp. Re-enable on completion.
```

## Reporting discipline
- **Sort by severity**, highest first. A summary table of counts per severity up top.
- Tie each finding to a **concrete fix**, not just a complaint.
- Separate genuine usability issues from personal taste — taste calls hand off to `[[website-designer]]`.
- A heuristic review predicts problems; it doesn't replace watching real users. For high-risk flows, follow with the lightweight usability test in `SKILL.md`.

Cross-reference: accessibility findings have their own checklist in `accessibility-wcag-aa.md` (don't fold a11y into heuristics — audit both); wording fixes draw on `microcopy.md`.
