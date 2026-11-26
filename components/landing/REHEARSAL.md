# Rehearsal: Droply upload hero (`UploadDemo.tsx`)

Gold: `upload` example from the stageshow kit. Kept: the drag from a desk file into a `data-drop` list, the `Roll` MB count, the `Meter` upload bar, the `States` swap from Indexing to Indexed, the hover and trash click, and the reset to the poster. Changed: Droply's file list (name, status, size, trash), the PDF "Q3 report.pdf" story, the Droply palette and Inter type via tokens, the desk satellite moved to straddle the window's right edge at wide, and a separate compact geometry (358 by 340 stage) for narrow screens.

Beats: grab the desk file → drag over the list (drop target lights) → drop and upload bar fills (4.2 MB) → indexing, then Indexed → hover and click trash → close row → cursor returns to the desk → reset to the poster. Loop: about 22 s.

Captured: widths 1440 and 390; light and dark themes; states on (`--states`); still poster at reduced motion (checked earlier, before the last clip-path removal).

Gate (1440): `rehearsal passed (necessary, not sufficient: references/verify.md and the fresh eye in review.md still stand)`

Gate (390), last run: `rehearsal failed: 5 never-intentional line(s)`. All five are framing lines about the compact satellite and window:
- corner bleed with a 121px gutter above the window but 20px to its left
- satellite 27px from the right edge where the layout gutter is 121px (uneven gutters)
- satellite ends 59px short of the top edge
- satellite ends 27px short of the right edge
- uneven gutters on the satellite (201px from left, 27px right, 166px bottom)

Why they stand: at 358px a satellite that sits beside the window's Upload button cannot also keep the one gutter; the window must bleed off the right and bottom to keep the trash control and the Status column readable. Moving the satellite or the window to satisfy every line broke another line (Upload overlapped, the Status header clipped, or the trash button cut). The compact composition was checked by eye on a 2x still: the window, file row, progress bar and trash read whole, and the satellite does not cover any control.

Film (both widths): `lopsided` on the "Q3 report.pdfIndexin" row (37px left vs 17–33px right) and on the "Indexing" badge (5px left vs 9–10px right). These are text-inset notes, not gate lines; accepted as the badge's own padding (`px-1.5`) with a leading icon.

Fixed during the rehearsal:
- `kit override` (phone and check selectors): false positive from the film's CSS-path check (bundling loses the kit's `/kit/` path); the phone is imported directly and `Check` replaced with `Spinner` + lucide `Check`.
- framing (window off-centre): window at x 40, desk straddles its right edge.
- jump (digits moving 140px while indexing): `Count` replaced with `Roll`.
- uneven inset (upload row, header grid): last column 48px, header uses `headCols`.
- steps in its box (row text snapping while the box glides, compact): row gets `transform-gpu`.
- compact window overflowing the stage (400px in 358px): window narrowed to 366px with a 28px bleed; Upload is icon-only in compact so the satellite fits beside it.

Review: palette and framing reviewed from the stills at 1440 (light and dark) and 390 (light). Reviewer's list (the skill's fresh-eye pass) not run as a separate reviewer.

Assumptions:
- Droply's real list is folder-based; the demo shows one flat list for the story.
- The Upload button in compact is icon-only; the label returns at wide sizes.

Unresolved:
- The five compact framing lines above (judgment call; see Why they stand).

Not checked:
- Reduced-motion poster after the final `clip-path` removal (not re-filmed).
- Full motion smoothness: the film's sampling reported gaps (22 at 1440, 8 at 390), so motion during those frames was not judged; the coverage line is inconclusive.
- Dashboard and Ask page visuals: behind Clerk auth, not screenshotted.
- The kit's own lint errors (excluded via `eslint.config.mjs`, not fixed).
