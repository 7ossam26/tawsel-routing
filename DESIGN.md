# Tawsel visual system

Specification v1, 22 September 2026. Status: **specified, awaiting owner review**. P04 implements and renders representative components; this document does not establish usability. [Action/state specification](docs/ui-spec.md), [original reference audit](docs/ui-reference-audit.md), [component source review](docs/ui-component-research.md).

The product is Arabic RTL delivery work. Preserve the reference family: Cairo, navy actions, blue accents, light surfaces, clear recipient cards and related map/list views. Decisions define actions and permissions. B2C has a simpler content model than B2B; both use the same visual system. Do not reproduce screenshot frames or create new modules from decorative controls.

## Shared tokens

These are the normative token names/values for P04's shared CSS layer. They formalize the Phase 01 baseline in `apps/web/src/main.tsx` and `styles.css`; they are **not yet applied component code**. Keep the eight existing Arabic/Latin `@fontsource/cairo` imports at weights 400/600/700/800, pinned package 5.3.0, and [OFL notice](docs/licenses/Cairo-OFL-1.1.txt). Never request 500/900, synthesize bold, introduce runtime Google Fonts or change to a library's default font.

```css
:root {
  --font-sans: 'Cairo', Tahoma, Arial, sans-serif;
  --weight-body: 400;
  --weight-label: 600;
  --weight-strong: 700;
  --weight-display: 800;
  --background: #f4f7fb;
  --foreground: #10213f;
  --card: #ffffff;
  --card-foreground: var(--foreground);
  --popover: var(--card);
  --popover-foreground: var(--foreground);
  --primary: #091426;
  --primary-foreground: #ffffff;
  --primary-hover: #1e293b;
  --secondary: #e6effb;
  --secondary-foreground: #10213f;
  --accent: #e6effb;
  --accent-foreground: #10213f;
  --brand: #1663d6;
  --brand-soft: #cce5ff;
  --muted: #f2f4f6;
  --muted-foreground: #52627b;
  --border: #d9e2ef;
  --input: #75777d;
  --ring: #1663d6;
  --destructive: #ba1a1a;
  --destructive-foreground: #ffffff;
  --error-surface: #ffdad6;
  --error-text: #93000a;
  --waiting-surface: #fff4ce;
  --waiting-text: #704700;
  --success-surface: #e6f6ef;
  --success-text: #116443;
  --space-1: .25rem;
  --space-2: .5rem;
  --space-3: .75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-12: 3rem;
  --radius-control: .75rem;
  --radius-card: 1rem;
  --radius-sheet: 1.5rem;
  --shadow-card: 0 2px 8px rgb(16 33 63 / 6%);
  --shadow-overlay: 0 16px 48px rgb(16 33 63 / 16%);
  --target-min: 2.75rem;
  --action-min: 3rem;
  --motion-feedback: 120ms;
  --motion-panel: 180ms;
}
html { font-family: var(--font-sans); font-synthesis: none; }
```

Use these same semantic variables for shadcn and Smooth UI. Smooth's `--brand` maps to Tawsel blue; no imported registry token palette may override the root. Tailwind font-medium must be remapped to 600 or replaced with a semantic weight. No second component theme or unreviewed dark theme. Tenant identity may supply a name/logo without changing semantic status colors or action hierarchy. Existing P01 success dot is decorative; use the text/surface pair for future status labels.

| Type token | Size / line-height | Weight | Use |
| --- | --- | --- | --- |
| body | 1rem / 1.75 | 400 | Address, instructions, explanatory sentence |
| body-small | .875rem / 1.65 | 400 | Secondary metadata; never sole blocker/action label |
| label | .875rem / 1.5 | 600 | Field labels, badges with icons |
| action | 1rem / 1.5 | 700 | Main and contact buttons; wrapping allowed |
| title | 1.125rem / 1.6 | 700 | Recipient and section titles |
| heading | 1.5rem / 1.45 | 700 | Page purpose |
| display | 1.625rem mobile, 2rem desktop / 1.4 | 800 | Login/summary title only |
| metric | 1.75rem / 1.3 | 800 | Labelled counts with their unit/denominator |

Use rem units, no Arabic letter spacing or forced all-caps. Do not clip Arabic diacritics with tight line-height. Increase height for wrapping; do not shrink essential text to fit. Cairo font loading must remain localhost-only. Verify computed face/weight and font requests again in P04.

## Layout and spacing

Mobile first. Below 48rem use one content column, 16px page padding, 12–16px card gaps and 16px card padding. Constrain forms/driver detail to 44rem on wider displays; login to 28rem. Between 48rem and 75rem collapse the desktop rail and use a labelled map/list switch or two columns only if each remains usable. At 75rem and above use a 224px RTL start-side rail, 24px gutters, a 320–400px selected-driver/list column and flexible map/detail space (minimum 360px); if those widths cannot fit, collapse the rail/columns. These are layout thresholds, not device identities.

Keep page heading, status/blocker and main action discoverable before secondary history. Map height on mobile is 220–300px or an explicitly expanded view, never allowed to push all actions off-screen. A persistent list panel is nonmodal; a focused decision sheet is modal. On desktop the selected driver controls both list and map, with a text heading naming the selection. Markers select the same stop as the list and have accessible names; number and shape supplement color. No live driver marker: last explicit arrival is labelled with its time, and next planned remains a suggestion.

Use document flow and `min-height: 100dvh`, not fixed viewport frames. Mobile action footer is sticky only where it remains usable with the keyboard/zoom; reserve its measured height plus `env(safe-area-inset-bottom)` below content. Account for top safe area and landscape side insets. At high zoom or short keyboard viewport, let the footer join normal flow. Bottom navigation and main action footer must not cover each other. Scrollable panes have visible scroll affordances; no global hidden scrollbar or `user-select: none` on recipient data.

Driver bottom navigation: يومي، الجولة، المزامنة، حسابي. Show queue attention as labelled count, not repeated alerts. With no active round, الجولة explains absence and links to preparation. Staff navigation: المتابعة، تجهيز المسار، المواقع، التقارير; authorized integration diagnostics is separate. An unauthorized destination is not rendered in navigation and a deep link still receives a scoped denial. No role selector grants permissions.

## Component conventions

| Tawsel component contract | Required behavior / selected source |
| --- | --- |
| ActionButton | Native button semantics; `primary`, `secondary`, `quiet`, `danger`; explicit type; loading label and busy state. shadcn Button adapted to 48px minimum main action, 44px other targets, 700 weight, wrap-safe content and 2px focus ring. |
| Field | Persistent label, required marker in text, hint/error IDs via aria-describedby, aria-invalid; numeric/phone input mode where appropriate. Errors beside affected field and an actionable summary after submit. No placeholder-only fields. |
| StatusNotice | Short purpose/status, cause, recovery or named awaited party. Icon+text+surface, no color-only meaning. Persistent for blockers; polite live announcement for state changes; alert only for failed save/critical error. |
| StopCard / CurrentStage | Full recipient name, address, optional instruction, isolated phone; explicit current versus next label; one dominant stage action; call/WhatsApp/navigation directly available. B2B quantities/money on focused result form, not cluttering every card. |
| ProgressSummary | Processed numerator/denominator separate from delivered, held and branch pieces. Smooth progress visuals with accessible progressbar semantics and unknown/zero handling; no success from animation completion. |
| FilterTabs | Smooth animated tabs adapted with Arabic accessible name, panel linkage, RTL visual-arrow movement, Home/End and controlled state. Prefer ordinary labelled filters when no tabpanel semantics apply. |
| FocusedOverlay | One shadcn/Radix Dialog foundation styled as bottom sheet on mobile/centered dialog desktop; shared heading/description/focus/cancel behavior. No Smooth basic-modal adoption in P04. |
| SourceBranchReturn / CorrectionDiff | Same card/field/status patterns, longer dedicated pages. Original/effective facts and remaining subset visible; no stock/cash clearance badge. |
| DataList / ReportTable | Semantic list/table, labelled sorting/filtering, scoped pagination. Mobile essential row summaries with detail page; keep denominator, currency, time quality and selected filters visible. |

Local wrappers isolate vendor props; do not build duplicate dialog/focus systems. P04 inspects current source/dependency versions and pins only required packages. See [API and license review](docs/ui-component-research.md) for concrete incompatibilities and selected registries.

## Accessible interaction, direction and motion

Set `lang="ar" dir="rtl"` on the document and direction on portal content. Use logical margins/padding/insets, `text-align:start`, and DOM order matching reading order. Mirror back/forward arrows; do not mirror telephone, map geometry, digits or checkmarks. Arabic recipient names wrap fully with `min-inline-size:0`; use `<bdi dir="auto">` for mixed user content. Phone, email, IDs and coordinate pairs get separate `<bdi dir="ltr">` spans; `tel:` uses normalized unmasked authorized value. A display mask cannot be the sole accessible phone value when calling is authorized. Long identifiers may break anywhere; phone/amount can move to a separate line as a unit.

Targets at least 44×44 CSS px, separated by 8px where adjacent. Main action at least 48px high; all grow with text. Focus ring: 2px blue plus 2px white offset (also visible on navy), never suppressed without replacement. Normal text contrast at least 4.5:1; large text/UI boundaries at least 3:1. Light structural borders are not the sole input boundary; use `--input`. Check actual combinations, hover, errors, disabled causes and forced colors during rendered review. No status meaning depends on color.

An eligible action temporarily blocked remains present with visible explanation and a recovery control. Use focusable `aria-disabled` where discovery requires it, guarding click/keyboard submission; never rely on tooltip over native disabled controls. Busy submission has an explicit label, preserves input, prevents duplicate submission, and exposes the same action's eventual result. Unsupported actions and forbidden role authority are absent; read-only state explains the boundary where useful.

Overlay opening focuses its heading or first meaningful field; trap focus, make background inert, support Escape/back, and restore focus to trigger (or surviving heading if trigger disappeared). Title and description IDs are stable. Cancel/back never saves. Preserve in-session drafts by account/resource and base revision; review after changed context instead of silently submitting a stale draft. Do not add discard confirmation for routine close; a single explicit destructive discard can clear the retained draft. Never nest sheets or require a second “are you sure” after a reviewed save. Multi-line item entry, returns, corrections and pin review use pages.

Map pin confirmation cannot require precise drag: searchable candidates plus selection/confirm, tap-to-place or keyboard pan with center crosshair and “استخدم موضع العلامة”. Supply named zoom/fit controls and a textual selected-location summary. If assets fail, preserve details and manual coordinate entry/validation; do not draw fake verified road geometry. Keep required attribution visible at every map size.

Use 120ms color/focus feedback, up to 180ms panel fade; maximum 250ms where a selected Smooth transition needs it. No bounce, rotating close buttons, infinite shimmer, celebratory animation or delayed access to controls. `prefers-reduced-motion: reduce` makes transitions immediate, removes transform/layout animation and smooth scrolling; retain static progress/busy text. Never animate Arabic letters separately. Screen-reader announcements describe saved/pending/confirmed facts and do not repeat every poll. Motion never triggers a domain transition or determines completion.

## Acceptance gate

Apply [ui-spec visual acceptance](docs/ui-spec.md#visual-acceptance) at 360×800, 390×844, 1366×768 and 1440×900, then zoom/long-text/safe-area cases. P04 must provide actual screenshots, keyboard/touch findings and a labelled fixture preview; owner approval remains separate from automated results. New UI defects revise these tokens/patterns before broad UI implementation.
