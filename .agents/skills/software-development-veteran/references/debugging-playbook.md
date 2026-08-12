# Systematic Debugging Playbook

Debugging is applied science, not guessing. The discipline is: **reproduce → observe → hypothesize → test one variable → locate → fix root cause → verify → prevent.** Guessing-and-poking feels faster and is almost always slower; it changes multiple things at once and teaches you nothing when the symptom moves.

> **The two laws:** *A bug you can't reproduce isn't fixed — it's hiding.* *A fix you didn't run isn't done — it's a hypothesis.*

## 0. Read the actual error (do this before anything else)
- **Read the whole stack trace, top to bottom, slowly.** The frame in *your* code nearest the failure is usually the answer. People skim the trace, miss the line number, and then debug fiction.
- Read the **literal error message**, not the one you expect. "undefined is not a function" vs "X is not a function" point at different things. A `NullPointerException`/`TypeError` names *what* was null — go find why.
- Note the **first** error, not the cascade. Later errors are often consequences. Fix the earliest real one and re-run.

## 1. Reproduce — make it happen on demand
You cannot fix what you can't observe. Invest here first.
- Find the **smallest, fastest, most reliable** reproduction. Reduce inputs until removing anything more makes the bug vanish — that minimal case usually *is* the diagnosis.
- Capture the exact conditions: inputs, environment, versions, data, sequence, timing, concurrency. Write the repro down as a command or a failing test.
- **Turn the repro into a failing automated test as early as you can.** It defines "done," prevents regression, and lets you iterate without manual fiddling.
- If it only repros in production: capture inputs/logs/traces there, then reconstruct locally. Don't debug by editing prod.

## 2. Observe before theorizing
- Gather evidence: logs, stack traces, metrics, a debugger, `git log`/`blame`, recent deploys, config changes. **What changed recently?** is the highest-yield question in all of debugging.
- Print/inspect actual values and types at the boundary between "known good" and "known bad." Verify your assumptions about what the data *is*, not what it *should* be — the bug lives in the gap between those.
- State your **current model of the system**, then look for the first place reality contradicts it. The contradiction is the lead.

## 3. Hypothesize and test ONE variable at a time
- Form a falsifiable hypothesis: *"I believe the cache returns stale data because the key omits the tenant id."* Then run the one experiment that would prove it wrong.
- **Change one thing per experiment.** Changing several at once means a moved symptom tells you nothing. Revert failed experiments before the next one — don't accumulate random edits.
- Keep a short log of hypotheses tried and ruled out. On a hard bug this prevents looping and lets you hand off.

## 4. Locate by bisection (halve the search space each step)
- **In code/history:** `git bisect` against a scripted repro test finds the introducing commit in log₂(n) steps. Make the test exit 0/1 and let `git bisect run` do it automatically.
- **In the data flow:** check the midpoint of the pipeline. Is the value correct entering function X? Then the bug is downstream. Wrong already? Upstream. Repeat on the bad half.
- **In space:** disable half the system (comment out, feature-flag, stub). Bug gone? It's in the disabled half. This isolates plugins, middleware, and config interactions fast.
- **Binary search beats linear scanning** every time the space is larger than a few items.

## 5. Find the ROOT cause, not the nearest symptom
- Ask **"why"** until you reach a cause you can fix so the whole class of bug disappears, not just this instance. (Why null? Because the API returned 204. Why didn't we handle 204? Because the client assumes 200. → fix: handle the contract, not just this null.)
- **Symptom fixes that are actually bugs:** `try/except: pass`; retry loops around a deterministic failure; bumping a timeout instead of finding the slow path; adding a null guard at the crash site while the bad value still flows from upstream; `setTimeout`/`sleep` to "fix" a race. Each hides the real fault and creates a worse one later.
- If you must mitigate now (incident in progress), say so explicitly and file the root-cause follow-up. Mitigation ≠ fix.

## 6. Fix, verify, and prove it's gone
- **Run the fix.** Confirm the original repro now passes *and* that you didn't break neighbors. "Should work" is not a status.
- Confirm you fixed *this* bug for *this* reason — not that it coincidentally stopped reproducing. A bug that "went away" without an explanation will be back.
- **Leave a regression test** that fails on the old code and passes on the new. That's how you ensure it stays fixed.
- Skim for siblings: the same mistake often appears in 2–3 other places. Grep for the pattern.

## Intermittent / heisenbugs (the hard ones)
Flakiness means a hidden input is varying. Find it:
- **Concurrency / races:** shared mutable state, missing lock/await, check-then-act, order-dependent tests. Add logging with timestamps + thread/task ids; stress with load/parallelism to raise the hit rate.
- **Time & ordering:** timezones, DST, clock skew, timeouts, `Date.now()` in logic, tests passing only in a certain order (leaked state between tests).
- **Resource state:** memory pressure, connection-pool exhaustion, file-handle/socket leaks, full disk, GC pauses — usually load- or time-dependent.
- **Environment:** version drift between dev/CI/prod, env vars, locale, uninitialized/random data, dependency on network or wall-clock.
- **Strategy:** make it *more* frequent before trying to fix it (loop it, add load, shrink timeouts). Increase observability rather than attempting fixes blind. A heisenbug you've made reproduce-on-demand is now an ordinary bug.

## Anti-patterns
- Changing code before reproducing or understanding the failure.
- Reading the error message you *expected* instead of the one printed.
- Shotgun debugging: many simultaneous changes; "it works now" with no idea why.
- Blaming the compiler/library/OS first. It's your code ~99% of the time — earn the right to blame the platform by ruling out your own code.
- Declaring victory because the symptom stopped, without identifying the cause.
- Deleting the repro/regression test once it's green "to clean up."
