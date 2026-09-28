# 02 - Run Gate

Run the CI test steps locally, in CI order.

## Input

The preflight findings.

## Output

One exit code per step, and the first failing line when a step fails.

## Process

1. **Install.** Run `pnpm install --frozen-lockfile`.
2. **Test.** Run `pnpm test`.
   - It runs both globs, `tests/*.test.mjs` and `tests/crm/*.test.mjs`. Never substitute one glob.
3. **Components.** Run `pnpm test:components`.
   - It runs every `tests/**/*.test.jsx` file. Never substitute `pnpm test:marketing`, which skips `tests/crm/*.test.jsx`.
4. **Build.** Run `pnpm build` with `NODE_ENV=production`, `NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co`, `NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder-anon-key`, and `NEXT_PUBLIC_APP_URL=https://placeholder.invalid`.
   - A prerender `useContext` null error means `NODE_ENV=production` did not reach the build. With it set, the build passes on Windows and Linux.
5. **Stop.** On the first non-zero exit, skip the remaining steps.

## Test

| Case | Pass |
| --- | --- |
| All steps pass | three exit codes of `0` are recorded |
| `pnpm test` fails | components and build are recorded as skipped |
