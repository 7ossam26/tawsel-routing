# Phase 04 representative UI review

Date: 22 September 2026. Status: automated component/browser review complete; **owner review not yet received**. This review covers the developer-only fixture at `/__fixtures/driver-review`, not connected production journeys or server acceptance.

## Review artifact

Start the development workspace with the documented local environment, then open:

- `http://127.0.0.1:5173/__fixtures/driver-review` for daily work and the driver journey;
- `http://127.0.0.1:5173/__fixtures/driver-review?view=login` for login presentation;
- `http://127.0.0.1:5173/__fixtures/driver-review?view=desktop` for selected-driver monitoring.

The persistent yellow banner and fixture controls say that the data are fixed, no server is contacted and no real result is saved. The route is reachable only in Vite development. The production build has no fixture JavaScript or navigation and runs `apps/web/scripts/check-production.mjs` to reject fixture markers.

## Actual browser evidence

Playwright 1.63.0 drove its packaged Chromium 153.0.8010.12 with Arabic locale, Cairo timezone and reduced motion. `npm run test:browser:ui`: **PASS, 6 tests** after the corrections below.

| Evidence | Observed result |
| --- | --- |
| `output/playwright/phase-04/360x800-daily-ready.png` | Purpose, readiness and “ابدأ الجولة” are visible in the initial viewport after correction; long content scrolls in one column and the fixed navigation does not cover the dominant action. |
| `output/playwright/phase-04/360x800-missing-pin.png` | Missing location has a named cause and “حدّد الموقع”; there is no misleading start button. |
| `output/playwright/phase-04/390x844-heading-long-content.png` | Explicit heading shows “وصلت”, the complete long Arabic recipient/address and an isolated LTR phone without page-level horizontal overflow. |
| `output/playwright/phase-04/390x844-outcome-sheet.png` | One outcome sheet, one save and one cancel fit in the viewport. Escape restores focus to the trigger; reopening restores the entered amount `275`. Reduced-motion duration is effectively zero. |
| `output/playwright/phase-04/390x844-no-answer-variants.png` | A second mobile browser path checks exact partial selection, another-device ownership, pending/rejected honesty and a no-answer sheet with no call counter or inferred arrival. |
| `output/playwright/phase-04/1366x768-selected-driver.png` | Driver list, selected state, coherent counts and schematic map selection correspond; departed work says “متابعة فقط” and exposes no staff outcome action. |
| `output/playwright/phase-04/1440x900-selected-driver.png` | Wider desktop retains the same hierarchy with no page-level horizontal overflow. |
| `output/playwright/phase-04/desktop-200-percent-effective-zoom.png` | Effective 200% reflow was tested as a 683×384 CSS viewport (half of 1366×768); rail/columns collapse, content remains reachable in one column and the page has no horizontal overflow. This is Chromium viewport emulation, not a manual browser-chrome zoom or enlarged OS-text check. |

Keyboard checks covered Tab focus, Escape, focus return, and RTL tab behavior: Left Arrow moves visually onward to “كل الوقفات”; Home/End and the inverse Right Arrow share the same component implementation. The long Arabic recipient name wraps without clipping, and the synthetic phone and long trip ID use isolated LTR spans. The schematic is explicitly labelled and makes no routing or map-provider claim.

## Findings and corrections

1. The first 360×800 capture placed the ready card’s start action below the fixed bottom navigation in the initial viewport. The shared ready-card order was changed to heading → dominant start → secondary facts → preparation link. The repeated browser test now asserts the start action is in the viewport.
2. The first browser run could not launch because the Playwright headless-shell download was incomplete. The browser package was installed fully and the unchanged suite was rerun; the failed launch is not counted as evidence.
3. The next run exposed equivalent reduced-motion duration serializations (`1e-05s` and `0.00001s`). The assertion now checks the numeric duration is at most 1 ms; the behavior requirement did not change.
4. Desktop tab selection and map stop selection initially shared one state variable, which could produce a panel ID with no tab. They now use separate view-tab and stop-selection state while preserving list/map correspondence.

No confusing label was established by an owner yet. Implementer review found the deliberate labels “العميل التالي المقترح”, “في الطريق”, “وصلت” and “تم تأكيد النتيجة في عرض توصيل” distinguish suggestion, movement, arrival and fixture-only completion without narration. “عرض العميل التالي” intentionally does not imply heading.

## Intentional reference changes

- Unsupported GPS/live-driver, call-counter, QR/barcode, demo-network and warehouse/cash-settlement controls remain absent.
- Contact and navigation stay contextual; rare outcomes live in one focused sheet.
- Desktop postdeparture state is read-only for staff. It does not imitate a driver outcome command.
- The map is a labelled CSS schematic, not copied remote imagery, MapLibre, PMTiles, OSRM or VROOM evidence.
- Smooth’s visual progress/tab ideas are adapted to Tawsel tokens and semantics. Its homegrown modal was not adopted; one Radix Dialog foundation supplies focus trapping and restoration.

## Unresolved review limits

- No owner feedback has been received. Record actual wording, first chosen action, confusion and backtracking here when the owner reviews the preview; silence is not approval.
- No physical Android/Chrome or iPhone/Safari, screen reader, forced-colors, browser-chrome 200%/400% zoom, OS enlarged text, on-screen keyboard, safe-area or landscape observation was performed. P41 still owns real-device evidence.
- Login, start, heading, arrival, outcome, takeover, pin recovery, synchronization and monitoring are fixtures. No API, identity issuer, database, worker, routing provider, map asset or ERP was invoked. Fixture success is not business acceptance.
- Partial delivery selection is represented by the developer-state vocabulary but the longer partial page is outside this representative phase. Real connected surfaces remain owned by P07/P09/P11/P28–P32.
