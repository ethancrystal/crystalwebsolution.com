# 03 - Report

Leave the tree clean and give the verdict.

## Input

The preflight findings and the step exit codes.

## Output

A verdict table, one row per preflight flag and per step.

## Process

1. **Restore.** Run `git checkout -- tsconfig.json` when the build rewrote it.
2. **Verdict.** Print `ready` when every step passed and no flag remains, else `blocked` with each cause.

## Test

| Case | Pass |
| --- | --- |
| The build rewrote `tsconfig.json` | `git diff --quiet tsconfig.json` exits `0` after the run |
| A step failed | the verdict reads `blocked` and names that step |
