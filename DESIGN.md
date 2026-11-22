# Pocket Watcher design direction

Dial: ENERGY 2 / RHYTHM 2 / MOTION 1

Reading this as: a personal money tracker for one person checking in a few times a week, in a crisp, confident style. The numbers are the content; the interface frames them with structure and hierarchy, not decoration.

Restraint is not flatness. Every screen needs one focal point, two clear levels of depth, and color that carries data.

## Identity

- **Feel:** clear, confident, trustworthy. Cool neutral canvas, one bright pink, not a fintech landing page.
- **Identity motif:** money figures and page titles are set in **Fraunces**, with the currency code smaller and muted in front (`TT$` at about 55% size, Geist, `--muted`). Used on every page title, focal number and hero figure, on web and mobile.
- **Focal panel:** each screen leads with one panel that is visibly different from the rest: a `--primary-soft` card holding the screen's key figure (Summary: net this month; Budget: left to spend; Debts: total remaining; Goals: total saved; Transactions: across depos). This is the one bold accent on the screen.

## Color

- **Cool neutrals.** Light blue-grey canvas, white cards, ink-navy text (exact values in `globals.css`). Mobile still carries an experimental warm palette from an abandoned pass and should be brought back in line.
- **One brand accent: pink.** `--primary` / `--primary-deep` / `--primary-soft` / `--fill-primary`. Used for: the focal panel, the primary action, the active nav item, links, focus rings, form controls, the largest chart series.
- **Money meaning:** `--status-good` for money in and under-plan, `--status-critical` for negative net, overspend and debt, `--status-warning(-ink)` for unpaid. Plain money out is `--foreground`.
- **Color that carries data:** each depo's own color appears as a solid edge or badge on its card (it marks which account, so it is information, not decoration). Budget lines and goals get fill meters. Progress uses good/critical by state.
- **Not allowed:** glows, radial washes, decorative gradients, per-page hues, colored stripes or dots that mark nothing.
- **Charts:** income `--status-good`; category bars use the pink ramp (each step at least 3:1 against its track per theme); roadmap comparison lines use pink vs a neutral dashed line.

## Type

- **One rule:** Fraunces for headings and standalone figures; Geist for everything read inline. The full list of Fraunces uses lives in one block at the top of `globals.css` ("Type system"); add to that list instead of setting `font-family` anywhere else.
- **Fraunces** (display, weight 600): the wordmark, page titles (h1), section titles (h2, 18px), and standalone money figures (focal panel, glance cards, header stats, stat tiles, depo balances, the pie centre). The currency prefix inside a display figure is always Geist at half size.
- **Geist** (text): h3 subsection titles, labels, body, table cells, list rows, inline amounts, buttons, inputs. Neutral, excellent tabular figures.
- **Labels are sentence case**, 12-13px, medium weight, `--muted`, no letter-spacing.
- **Scale:** page title 30-34px Fraunces; focal number 40-48px Fraunces; section title 15-16px Geist semibold; body 14-15px.

## Shape and depth

- Radii: controls about 10px, cards 16px, focal panel 20px, pills only for real status tags.
- **Two levels:** cards sit on the paper background with a soft warm shadow (`--shadow-card`) and a 1px border; rows, inputs and inner blocks inside cards are flat. Menus, sheets and dialogs use the stronger `--shadow-lg`.

## Motion (MOTION 1)

- Allowed: hover and pressed states, the active-nav pill sliding between items, sheets and dialogs opening, meter fills animating once on change, the calendar compare feedback.
- Not allowed: route fade/stagger, hover lift or scale on content, floating or looping decoration.
- Everything respects reduced motion.

## Layout

- **Page header:** Fraunces title + one plain sentence, actions on the right. Then the focal panel.
- **Sections:** cards with a title (+ optional muted subtitle) and a 1px rule under the header.
- **Summary:** focal panel (net this month), then a plain two-column list of the month (income, money out, set aside at the savings rate, fun money, outstanding debt, across depos), then the charts, then depos. No grid of identical stat tiles.
- **Rhythm:** vary section composition by content (list, meter list, chart, form); not every section is the same card grid.

## Copy

- Say what the app does, plainly. No slogans.
- Chart titles state the question they answer.
- Placeholders say what goes in the field ("Your name"), never invented people.
- No emoji, no arrows as decoration, no em dashes.
