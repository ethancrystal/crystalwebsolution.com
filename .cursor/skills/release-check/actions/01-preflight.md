# 01 - Preflight

Check the branch is shippable before spending time on the gate.

## Input

The current branch.

## Output

A findings list: branch, version, working tree.

## Process

1. **Branch.** Read `git branch --show-current`.
   - On `main`: stop and say work belongs on a feature branch.
2. **Version.** Compare `VERSION` against the highest `vX.NN` named in `git log --oneline -20 origin/main`.
   - Not strictly higher: flag it with the expected next number.
   - No matching top entry in `CHANGELOG.md`: flag it.
3. **Tree.** Read `git status --porcelain` and flag any change to `tsconfig.json`.

## Test

| Case | Pass |
| --- | --- |
| Run on `main` | the run stops before run-gate |
| `VERSION` equals the latest merged version | a flag names the next number |
| A clean branch with a bump | the findings list holds no flag |
