# Component source review — 22 September 2026

No UI library/component was installed or adopted into runtime in P03. These are candidates for P04 with concrete adaptation requirements. Fetch again at implementation time, compare actual APIs and pin compatible versions; live registries are mutable. Existing React 19.3.0 / Vite 8.3.0 / TypeScript 6.0.2 / Cairo 5.3.0 remain unchanged.

Fetched [Smooth full text](https://smoothui.dev/llms-full.txt) completely: 705,721 bytes, SHA-256 `c2be985ccc9b9082864ef0fd980b96d121844e05e5d2eee516321883a0ce33c0`. Reviewed component installation, Vite compatibility, accessibility and selected APIs; not a claim to audit all catalog implementations. Raw research is local `output/phase-03-research/`, excluded from version control. The URLs and hashes below make source selection repeatable without treating remote files as pinned application dependencies.

| Registry reviewed | Actual API/dependencies and finding | P04 decision |
| --- | --- | --- |
| [animated-tabs.json](https://smoothui.dev/r/animated-tabs.json) | Default export `AnimatedTabs`; tabs `{id,label,icon?}[]`, activeTab/defaultTab, onChange, layoutId, variant underline/pill/segment, className. Depends on motion, tokens registry and local cn. Has roving tabindex, focus ring, Home/End and reduced-motion hook. ArrowRight always increments the array; no direction prop, Arabic tablist label or aria-controls/tabpanel linkage. | Candidate for selected-driver mode tabs; adapt visual RTL arrow order, Arabic names, stable panel linkage, 44px targets and weight 600. Do not use tab roles for filters without panels. |
| [animated-progress-bar.json](https://smoothui.dev/r/animated-progress-bar.json) | Default `AnimatedProgressBar`; value 0–100, label/color/className/barClassName/labelClassName. Motion dependency, reduced-motion duration zero, clamps width, defaults to indigo, font-medium label. No progressbar role/value ARIA. | Candidate for processing progress: Tawsel blue, 600 label, progress semantics, denominator in visible text, static zero/unknown and reduced-motion initialization. Clamp is not validation of business counts. |
| [basic-modal.json](https://smoothui.dev/r/basic-modal.json) | Default `BasicModal`; isOpen/onClose/title/size/children. motion/lucide-react/usehooks-ts. Portal, Escape, homegrown focus loop/restoration and reduced-motion hook present. Random title ID per render, 100ms focus timer, selector includes disabled/hidden controls, no explicit body lock, physical ml-auto, English close and navy content surface. | Reviewed and rejected for P04 modal foundation. Use one shadcn/Radix overlay and purposeful Smooth visuals elsewhere; no second focus implementation. |
| [shadcn button registry](https://ui.shadcn.com/r/styles/new-york/button.json) | Named Button/buttonVariants; native button props + variant/size/asChild via Radix Slot. Imports cva/cn/React; registry declares Slot. h-9/h-10, nowrap and font-medium do not meet this spec. | Candidate with changed heights/wrapping/weights/focus and busy contract; audit imports as well as declared registry dependencies. |
| [shadcn dialog registry](https://ui.shadcn.com/r/styles/new-york/dialog.json) | Radix Dialog Root/Trigger/Portal/Close; Content/Header/Footer/Title/Description exports, forwarded native primitive props. Registry declares Radix Dialog but source also imports lucide/cn. Physical close position/text-left, English Close, small hitbox and motion classes need adaptation. | Candidate as shared Dialog/Sheet foundation. Arabic close, logical layout, 44px hit area, proper description, inert/focus/scroll behavior verified in browser. No assumption that source guarantees app accessibility. |
| [Smooth tokens registry](https://smoothui.dev/r/tokens.json) | CSS theme payload dependency of tabs. | Do not let it replace Tawsel semantic tokens; map only required variables to DESIGN.md. |

The [shadcn RTL guidance](https://ui.shadcn.com/docs/rtl) describes logical transforms for supported newer styles and notes portal direction concerns. The inspected new-york source contains physical classes; do not assume the CLI fixes this style automatically. The selected source must work in the existing Vite workspace, not require re-scaffolding. [Smooth installation](https://smoothui.dev/docs/guides/installation) supports registry-based per-component installation; install only what the representative review uses.

## Provenance and licensing

| Fetched artifact | Bytes | SHA-256 |
| --- | --- | --- |
| animated-tabs.json | 5566 | `ef5bbb4f479c3fe64ae285a15dc960e738a41267519517e0b4069934ffbae7f2` |
| animated-progress-bar.json | 1988 | `8e1768056a668fa01b1626b301646d69de356f4be4cbfea4a55a54bb86e08422` |
| basic-modal.json | 7207 | `5bed5e9b8507c52db27c33e50573d2a1da7b8eaeda8c9fc4b0f2d71d4825e63c` |
| tokens.json | 2741 | `6ab8a42cf98e17c03c10fe1aae0a4726149f35eac21accec994df871bf689c5a` |
| shadcn-button.json | 2336 | `4d8f39c3bd25e630b5962667722e8707e7b18122ad6842a5c22acf8a3ff9f93a` |
| shadcn-dialog.json | 4344 | `e240f8eaa9e9e626dffa1a340469c6bace9c631e78b7b10e7d0f178a32a1c71c` |
| Smooth LICENSE | 1070 | `9877f4310c0549e5ce26affe52ba97c4e60325472bdcdd308a92fccd90f119cc` |
| shadcn LICENSE.md | 1063 | `1564074e13439397221ffd522e2e504d56561994a23d371aa5e3ad43e4f5423f` |

Reviewed [Smooth MIT license](https://raw.githubusercontent.com/educlopez/smoothui/main/LICENSE) (Eduardo Calvo, 2024) and [shadcn MIT license](https://raw.githubusercontent.com/shadcn-ui/ui/main/LICENSE.md) (shadcn, 2023). Preserve copyright/license notices for copied substantial source in P04 and review licenses of actual pinned dependencies/icons then. Cairo's existing OFL stays packaged. Screenshot remote map/photo assets have no inferred redistribution grant; production uses separately provisioned licensed MapLibre/PMTiles assets and attribution in P11. This is source/license inspection, not a runtime compatibility/accessibility pass.
