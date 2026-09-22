# Phase 03 reference audit

Inspected 22 September 2026 at HEAD `28d038a50717f2a3b41ec59c4715c54273b9e5f0`. Project `16661174340563199513`. All nine original images were opened and visually inspected; all nine complete HTML files were parsed for text, controls, hidden states, styles and scripts, and their metadata read. This is source/image review, not browser execution. No inaccessible original asset. Original files remain unchanged.

Authority: [master plan §16](../master-plan.md#16-ui-journeys-and-visual-reference-map), D-102/D-106 and [current requirements](phases/coverage-matrix.md). The [manifest](../stitch-export/manifest.json) owns source URLs, dimensions and original hashes. A reference is not a product requirement or a route-count limit.

## Original sources and visual roles

Paths below resolve under `stitch-export/screens/`; each row links its exact image, HTML and metadata. IDs are the final segment of `projects/16661174340563199513/screens/{id}`.

| Ref / directory | Source ID | Original files | Visual role and observed defects |
| --- | --- | --- | --- |
| 01 — `01-active-driver-trip` | `3d3f4e407ee74b11b2e047e0a61a6dfb` | [screen.jpg](../stitch-export/screens/01-active-driver-trip/screen.jpg), [code.html](../stitch-export/screens/01-active-driver-trip/code.html), [metadata.json](../stitch-export/screens/01-active-driver-trip/metadata.json) | 1647×1107. Map behind white stop/list panel; compact progress strip; navy primary. Header/name/button text overlaps, lower list clipped in device frame. Amber emphasis becomes semantic urgency, not an alternative primary brand. Current/next ambiguous. |
| 02 — `02-stop-details` | `c51dd41ed3f74ceab7226835d38b75df` | [screen.jpg](../stitch-export/screens/02-stop-details/screen.jpg), [code.html](../stitch-export/screens/02-stop-details/code.html), [metadata.json](../stitch-export/screens/02-stop-details/metadata.json) | 1647×1107. Recipient/contact row, address and instructions cards, destination map and stage action. Name truncates; phone breaks; lower outcomes absent from capture but present in source. Navigation URL has no destination. Arrival text incorrectly promises customer notification. |
| 03 — `03-dispatcher-workspace` | `71ae553e941a4312a5bef12d1da8712a` | [screen.jpg](../stitch-export/screens/03-dispatcher-workspace/screen.jpg), [code.html](../stitch-export/screens/03-dispatcher-workspace/code.html), [metadata.json](../stitch-export/screens/03-dispatcher-workspace/metadata.json) | 1647×580. Selected driver/list/map workspace; blue selection and navy current-stop card. Extremely shallow clipped capture, blank list area. Script references absent `monitoringSummary`, `btnOptimize`, `draftNotice`; not functioning planning. |
| 04 — `04-login-workspace` | `4d692192b93241c2ac5792e97d1bd7cd` | [screen.png](../stitch-export/screens/04-login-workspace/screen.png), [code.html](../stitch-export/screens/04-login-workspace/code.html), [metadata.json](../stitch-export/screens/04-login-workspace/metadata.json) | 780×2370. Cairo identity, navy action, soft field surfaces and separated groups. Role and branch controls before authentication imply authority; long offline/security marketing buries login. Password visibility useful. |
| 05 — `05-driver-daily-trips` | `0a46baa0b55645088f06fbba66bddfd0` | [screen.png](../stitch-export/screens/05-driver-daily-trips/screen.png), [code.html](../stitch-export/screens/05-driver-daily-trips/code.html), [metadata.json](../stitch-export/screens/05-driver-daily-trips/metadata.json) | 780×2774. Active/upcoming/completed card hierarchy and bottom navigation. Current/next conflated; 7/18 processing must not mean 7 delivered. Barcode receipt and incentive panel unsupported. Calendar date must become explicit workday. |
| 06 — `06-route-preparation` | `c8ec135a704d4720a044cfcd263fe2df` | [screen.png](../stitch-export/screens/06-route-preparation/screen.png), [code.html](../stitch-export/screens/06-route-preparation/code.html), [metadata.json](../stitch-export/screens/06-route-preparation/metadata.json) | 2560×2478. RTL rail, selected driver/readiness, ordered cards and preview summary. Narrow long-name/blocked card clips; duplicated optimize calls. Manual intake belongs in B2C variant; company assignment stays ERP. One unresolved pin must not block other valid work. |
| 07 — `07-location-review` | `dff9a66b5a3c4fcdb44e27b31a2e421c` | [screen.png](../stitch-export/screens/07-location-review/screen.png), [code.html](../stitch-export/screens/07-location-review/code.html), [metadata.json](../stitch-export/screens/07-location-review/metadata.json) | 2560×2376. Original address, candidates, selected pin, explicit confirm beside map. Decorative map labels disagree with geography; precision/GPS/match/latency claims unsupported. Coordinate display needs consistent latitude/longitude labels. |
| 08 — `08-trip-completion` | `3c394f6e10df494fb82013f630a439d3` | [screen.png](../stitch-export/screens/08-trip-completion/screen.png), [code.html](../stitch-export/screens/08-trip-completion/code.html), [metadata.json](../stitch-export/screens/08-trip-completion/metadata.json) | 780×2672. Navy summary surface, outcome cards, held-work detail and return to day. English page title and success denominator unclear; barcode/cash custody clearance conflates three facts. Warehouse photo is not required product media. |
| 09 — `09-sync-conflicts` | `b4cfe4329fb144cfbb83c314402bb943` | [screen.png](../stitch-export/screens/09-sync-conflicts/screen.png), [code.html](../stitch-export/screens/09-sync-conflicts/code.html), [metadata.json](../stitch-export/screens/09-sync-conflicts/metadata.json) | 780×3400. Filtered evidence cards, timestamps, pending/review/confirmed badges. Excess text and red primary compete; staff cancellation after departure is invalid conflict cause. GPS/POD and timed sync success removed. |

01–03 metadata reports DESKTOP/2560×2048, unlike the actual images; 01/02 are mobile compositions. 04–09 actual dimensions match metadata. All nine use Cairo overrides; several body tokens request weight 500. Phase 01's real 400/600/700/800 files supersede that 500/fallback behavior. No Google Fonts, Material Symbols CDN, Tailwind CDN or remote stock images become runtime dependencies. Never copy device frames, global hidden scrollbars, user-select suppression, fixed minimum 884px heights, physical-only positioning or prototype success timers.

## Exported control disposition ledger

The ordinal is the 1-based source order of `button`, `input`, `select`, `textarea`, `a`, explicit `onclick`, or ARIA button/tab elements in each original HTML. Ranges include every ordinal once. `python scripts/check-ui-spec.py controls` prints exact source lines/attributes. Retained means retain the purpose with accessible production implementation; adapted means change behavior/authority/copy; removed means no production control. Requirement IDs refer to the current coverage matrix, not historical answers.

| Ref | Ordinals | Disposition | Requirement | Control / production treatment |
| --- | --- | --- | --- | --- |
| 01 | 1 | adapted | R-40 R-45 | Manual refresh uses actual read/replay results; never alert success. |
| 01 | 2-4 | retained | R-19 R-55 | Zoom in/out and fit route, labelled 44px controls; no driver-position locator. |
| 01 | 5 | adapted | R-57 | List expand/collapse becomes keyboard button, not click-only div or fixed-height trap. |
| 01 | 6 | retained | R-26 R-57 | Open selected stop details without claiming heading. |
| 02 | 1 | retained | R-57 | Back to active round with list position preserved. |
| 02 | 2 | removed | R-63 | Offline demo switch; replace with truthful passive state and link to sync. |
| 02 | 3 | adapted | R-20 | Destination navigation opens the selected confirmed pin, without execution transition. |
| 02 | 4 | adapted | R-30 | Dial actual authorized phone; no dummy number, call count or outcome inference. |
| 02 | 5 | adapted | R-26 | Explicit heading then arrival stage; do not promise customer notification. |
| 02 | 6 | adapted | R-16 R-17 | Focused outcome/amount form; save after validation, not immediate simulated success. |
| 02 | 7 | adapted | R-30 R-17 | Separate no-answer and refusal choices; no generic prompt that merges causes. |
| 02 | 8 | adapted | R-24 | Whole eligible task earliest-time sheet, not failure prompt. |
| 02 | 9 | adapted | R-26 | Inspect next stop; no reload or implicit heading. |
| 02 | 10-12 | adapted | R-57 | Shared day/current/account navigation with real destinations and active labels. |
| 03 | 1-2 | adapted | R-12 R-44 | Monitoring and predeparture planning tabs under capabilities; departed work read-only. |
| 03 | 3 | adapted | R-02 R-28 | Prepare route for an ERP-assigned driver, never create assignments or dispatcher approval. |
| 04 | 1-2 | removed | R-63 | Valid/error fixture state tabs. |
| 04 | 3 | adapted | R-06 R-41 | Retry actual login context; offline continuation only downloaded started same-account work. |
| 04 | 4-5 | removed | R-03 R-05 | Role-granting radios; replace with separate company/independent account entry, not role assignment. |
| 04 | 6 | adapted | R-06 R-07 | Company code then issuer username, or independent normalized phone; explicit label. |
| 04 | 7 | removed | R-63 | QR identifier scanning. |
| 04 | 8 | retained | R-07 | Recovery through issuer/email path with neutral response. |
| 04 | 9-10 | retained | R-06 R-07 | Password input/visibility, local accessible toggle, credential authority remains issuer. |
| 04 | 11-12 | adapted | R-04 R-43 | Branch context only after authenticated membership; no grant from selection. |
| 04 | 13 | adapted | R-06 R-27 | Real sign-in/continue transition; never a tactile-only success or offline new start. |
| 04 | 14-15 | removed | R-55 R-63 | Placeholder support/privacy buttons have no destination/content; no speculative help module. Add actual required policy/contact links only with owned content later. |
| 05 | 1 | adapted | R-39 R-57 | Account entry; storage/download status near active round, not a profile icon toggling an offline story. |
| 05 | 2 | retained | R-26 | Continue existing round. |
| 05 | 3 | adapted | R-40 R-45 | Fetch actual updates; same-account queue retained. |
| 05 | 4 | adapted | R-10 | Inspect upcoming prepared task snapshot, without custody claim or shipping-document module. |
| 05 | 5 | removed | R-10 R-63 | Driver barcode/pickup receipt checklist; native ERP owns definitive received assignment. |
| 05 | 6 | adapted | R-52 R-53 | Effective outcome/collection report, no cashier settlement alert. |
| 05 | 7-10 | retained | R-57 | Day/current/sync/account navigation, active state and disabled current fallback explained. |
| 06 | 1-2 | removed | R-55 R-63 | Unspecified notifications/help modules. |
| 06 | 3-6 | adapted | R-12 R-44 R-52 | Scoped monitoring/preparation/locations/sync navigation; no fleet performance module. |
| 06 | 7-8 | adapted | R-28 | Save draft and preview actual job; one dominant preview action. |
| 06 | 9 | adapted | R-02 R-12 | Select driver context for existing assignments; no reassignment. Mode belongs to planning input. |
| 06 | 10-14 | adapted | R-15 | Name/phone/destination/instructions and save become dedicated B2C intake; remove this form from B2B staff view. |
| 06 | 15-16 | retained | R-55 R-57 | Filter and map/list presentation; not mutating work. |
| 06 | 17-18 | removed | R-10 R-13 | Arbitrary remove-from-route controls; eligibility and explicit whole deferral govern omission. ERP withdrawal remains native/predeparture. |
| 06 | 19 | adapted | R-19 | Direct missing-pin recovery; return to same task/preview after confirmation. |
| 06 | 20-22 | removed | R-10 R-13 | Remaining arbitrary removal controls, same rule as 17–18. |
| 06 | 23 | adapted | R-28 R-57 | Duplicate optimize link merges into existing preview action; no extra dispatcher approval page. |
| 07 | 1-2 | removed | R-55 R-63 | Unspecified notifications/help. |
| 07 | 3-6 | adapted | R-12 R-44 | Same scoped desktop navigation as 06. |
| 07 | 7-8 | retained | R-19 R-57 | Previous/next unresolved task, preserve draft and expose unsaved state. |
| 07 | 9-11 | retained | R-19 | Zoom and fit selected pin; center is not GPS. |
| 07 | 12 | removed | R-19 R-63 | Satellite imagery not in provisioned PMTiles scope. |
| 07 | 13-14 | retained | R-19 | Search/clear query without overwriting original address. |
| 07 | 15 | retained | R-19 | Copy selected coordinates, isolated LTR and labelled latitude/longitude. |
| 07 | 16 | adapted | R-19 R-12 | Explicit authorized confirm pin, then replan feedback; no inferred accuracy. |
| 07 | 17 | retained | R-57 | Back without committing pin; preserve unsaved draft for return. |
| 07 | 18 | adapted | R-19 R-28 | Retry actual failed candidate/map request; no invented 42ms server badge. |
| 08 | 1 | retained | R-57 | Back. |
| 08 | 2 | removed | R-63 | Network simulation toggle. |
| 08 | 3 | adapted | R-29 R-33 | Distinct end-round/end-day choice, held work carries; no custody or finance settlement. |
| 08 | 4 | retained | R-29 | Return to daily work. |
| 09 | 1-4 | adapted | R-40 | All/review/pending/confirmed evidence filters; received and accepted remain distinct inside cards. |
| 09 | 5 | adapted | R-37 R-38 | Current-driver compatible adoption/correction review; staff cannot approve departed outcomes. |
| 09 | 6 | adapted | R-40 R-63 | Inspect action evidence/history, not POD document/signature. |
| 09 | 7-8 | adapted | R-40 | Retry same action identity and inspect retained detail; no timer acceptance. |
| 09 | 9 | adapted | R-40 | Replay eligible queued actions in dependency order; no success for unresolved conflicts. |
| 09 | 10-14 | retained | R-57 | Return to round and shared bottom navigation. |

## Affordances and claims outside semantic controls

These are also reviewed, not silently adopted by the control parser.

| Source | Disposition / requirement | Treatment |
| --- | --- | --- |
| 01 clickable/bouncing next marker, stop/history rows; 03 three click-styled driver cards | Adapted, R-26 R-44 R-57 | Accessible selection buttons; selected does not mean heading. No bounce, no GPS marker. Preserve numbered markers/list selection correspondence. |
| 04 radio labels/branch cards | Same disposition as corresponding inputs/onclick controls | Labels never grant capabilities. No extra clicks for branch when only one authorized context exists. |
| 06 readiness link and five decorative drag handles | Adapted, R-13 R-19 R-28 | Direct pin-review button; manual reorder also has keyboard move controls. Keep every eligible stop, current/urgent/earliest/end constraints; no drag-only access. |
| 07 StreetView span | Removed, R-19 R-63 | No StreetView integration. |
| 07 restore-original span and three candidate cards | Retained purpose, R-19 R-57 | Native buttons/radio choices; restore search text, not erase pin history; candidate selection still needs explicit confirmation. |
| 04/05 offline/security claims, version V4.8.2; 09 encrypted-memory/POD claims | Removed, R-39 R-42 R-63 | State actual local save/download/receipt facts, never guaranteed storage/background sync, signature or invented release. |
| 05 incentive target; 06/07 fleet capacity/activity panels | Removed, R-13 R-63 | No incentives, weight/volume or fleet allocator. Remaining planned stops may be shown with the correct 50-stop denominator. |
| 07 GPS age/±3m/92% match/180m/42ms and 06 850m building mismatch | Removed, R-19 R-63 | Candidate type/provenance and measured provider status only; no invented precision. |
| 08 three-call rule, barcode, warehouse image and settlement copy | Removed, R-30 R-33 R-63 | Plain no-answer; source-branch request/confirmed subset; no automatic custody/cash clearance. |
| 09 GPS breadcrumbs and coordinator cancellation conflict | Removed, R-12 R-38 R-63 | Old-device/revision/dependent-receipt conflicts with retained evidence replace unsupported scenario. |

## Focused result

Every detected exported control has a disposition, and all nine sources have a visual role. New requirements absent from exports are covered in the next checkpoint's action map. No source determines permission. Unverified: interactive behavior, contrast in a rendered application, target-device performance and owner approval. The originals are reference evidence only.
