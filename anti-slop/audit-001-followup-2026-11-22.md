# antislop audit 001: follow-up (2026-11-22)

Approved items: 2, 3, 4, 5, 6, 20, 23. All other items untouched.

## Fixed

- **2 (R-25) muted text.** `--muted` `#565f75`, `--muted-soft` `#5d6987` (light, at least 4.6:1 on white, soft and inset); dark `--muted-soft` `#7b8498`. Chart axis text follows. `text-zinc-400` status text and every `text-zinc-500` now use `--muted`. Mirrored in `mobile/src/constants/theme.ts`.
- **3 (R-25) accent and status text.** Light `--status-good` `#0b785c`, `--status-serious` `#b74416`, `--status-critical` `#b93a3e`; new `--status-warning-ink` for "Unpaid", the sync pill and warning notices. Hero stat values mix the page accent 45% into the foreground (4.65:1 worst case). Links, auth eyebrow, stat and theme icons use `--primary-deep`. Auth pill text lowered to a 45% aqua mix. Mobile goal % uses the same mix.
- **4 (R-25) white button labels.** New `--fill-primary`, `--fill-good`, `--fill-critical` (deep in both themes, 5.65:1 or better with white) used by the auth submit, Log income/expense, Lock budget, and the mobile `Button`. The pink gradient and glow on the auth submit and the mobile primary-button gradient are removed, because their light top edge was what failed.
- **5 (R-34) dark primary tokens.** Dark `--primary-soft` `#3c2030`, dark `--primary-deep` `#ff5c8d` (passes on the new soft tint), so the two `.dark` overrides that patched around it are deleted. Same on mobile.
- **6 (R-34) auth pages in dark.** Login and signup use new token classes (`.auth-label`, `.auth-field-error`, `.auth-error`, `.auth-footer`, `.auth-link`) instead of fixed slate/rose/indigo colors.
- **20 (R-27) logout data loss (mobile).** `logout()` now refuses when changes are still unsynced after the push attempt and returns the count. One shared `useConfirmLogout` hook backs both the header and Settings: it warns "N changes couldn't be sent..." with "Stay logged in" or "Delete and log out".
- **23 (R-17) wrong numbers.**
  - Web Transactions "In/Out this month" come from a new `getCashFlowTotals` aggregate, independent of the type filter and the 200-row cap. Transfer fees count against the sending depo, matching the balance query.
  - "Recorded changes" shows the real total from a count query (web and mobile API). When the list is capped, both say "Showing the latest 300 of N".
  - The goals planner starts the extra allocation at 0 on web and mobile (the simulation already adds minimums separately).
  - The mobile Summary hero and History stats are hidden until data loads; History no longer shows "No activity recorded yet." when the request failed.

## Verification

- `tsc --noEmit` passes for web and mobile; `eslint` and `expo lint` report no new problems (4 older warnings remain in files not touched by this pass).
- The dev server serves `/login` and `/signup` (200) after the changes. Dashboard routes redirect to login (307) for an unauthenticated request.
- Not done: a logged-in click-through of the dashboard, the new aggregate query against real data, and a device run of the mobile logout flow. Contrast values were computed, not measured on screen.
