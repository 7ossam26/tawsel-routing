# اختيار موديل Codex لكل مرحلة

تعديل الحزمة 3 — D-110. راجعت أسماء الموديلات المتاحة في هذه الجلسة وإرشادات OpenAI يوم 21 سبتمبر 2026. هذه **ترشيحات تنفيذ مني حسب طبيعة كل مرحلة**؛ توزيع المراحل ليس benchmark رسميًا ولا ضمانًا لصحة التنفيذ.

قبل إرسال ملف المرحلة كاملًا، اختَر الموديل ومستوى التفكير من محدد Codex أسفل خانة الكتابة. كتابة اسم الموديل داخل الـprompt لا تغيّر موديل المهمة تلقائيًا. `high` يعني High، و`xhigh` يعني Extra high. سجّل الاختيار الفعلي في سجل التنفيذ؛ لو تغيرت الأسماء/الإتاحة مستقبلًا، راجع المحدد والوثائق وقتها وحدّث الترشيح بوضوح.

OpenAI تصف **GPT-6 Astra** بأنه الأنسب لأصعب الأعمال الممتدة عبر أدوات، و**GPT-5.6 Sol** للأعمال المعقدة في البرمجة والتحليل. رفع مستوى التفكير قد يزيد الزمن واستهلاك الاستخدام. المصدر: [دليل موديلات Codex واختيار مستوى التفكير](https://learn.chatgpt.com/docs/models)، و[مرجع Astra ومستويات التفكير](https://developers.openai.com/api/docs/models/gpt-6-astra).

اخترت Astra للأغلبية لأن الأولوية هنا الحفاظ على قرارات مترابطة وصحة التنفيذ والتكامل. استخدمت Sol في سبع مراحل ذات حدود أوضح تعتمد على أسس سابقة. لا يلزم أعلى مستوى تفكير لكل شيء، ولا يعوّض الموديل اختبارات Vitest أو فحص PostgreSQL والمتصفح والأجهزة.

| المرحلة / ملف التنفيذ | Model | Reasoning | سبب الاختيار |
| --- | --- | --- | --- |
| [01 — Runnable workspace and test harness](01-workspace-test-harness.md) | `gpt-5.6-sol` | `high` | Bounded workspace, package scripts and test setup with a concrete runnable result. |
| [02 — State vocabulary and canonical contract foundation](02-state-contract-foundation.md) | `gpt-6-astra` | `xhigh` | Shared identities, state transitions and compatibility affect every later API and ERP integration. |
| [03 — Visual system and requirement-driven action specification](03-design-action-specification.md) | `gpt-6-astra` | `high` | Reconcile the full action inventory with the visual references and a very simple driver experience. |
| [04 — Shared components and early simple-UX review](04-representative-ui-review.md) | `gpt-5.6-sol` | `high` | Implement and inspect a bounded set of representative components and fixture journeys. |
| [05 — PostgreSQL migrations and atomic command kernel](05-postgres-atomic-command-kernel.md) | `gpt-6-astra` | `xhigh` | Atomic transactions, idempotency, rollback and concurrent commits establish system-wide correctness. |
| [06 — Tenant, branch and capability enforcement](06-tenant-capabilities-isolation.md) | `gpt-6-astra` | `xhigh` | Tenant, branch, driver and integration isolation require reasoning across reads and writes. |
| [07 — Real login, recovery and separate sessions](07-oidc-login-recovery-sessions.md) | `gpt-6-astra` | `high` | Real OIDC recovery and separate sessions must agree with application authorization. |
| [08 — ERP provisioning and verified actor context](08-erp-provisioning-actor-binding.md) | `gpt-6-astra` | `xhigh` | Provisioning and verified service/actor binding define the trust boundary with an external ERP. |
| [09 — Independent-driver task intake](09-b2c-task-intake.md) | `gpt-5.6-sol` | `high` | A focused B2C intake flow with established persistence, validation and access primitives. |
| [10 — ERP task snapshots, receipt and atomic admission](10-b2b-intake-admission.md) | `gpt-6-astra` | `xhigh` | ERP revisions, receipt semantics and concurrent atomic capacity admission interact. |
| [11 — Confirmed locations and real map assets](11-locations-map-assets.md) | `gpt-6-astra` | `high` | Location provenance, explicit pin confirmation and real map assets span providers and UI. |
| [12 — Routing Engine adapters and vehicle profiles](12-engine-profile-adapters.md) | `gpt-6-astra` | `high` | Three Engine profiles need precise adapter units, coordinates and honest failure behavior. |
| [13 — Durable planning jobs and forecast revisions](13-planning-jobs-forecast-storage.md) | `gpt-6-astra` | `xhigh` | Durable jobs, stale result rejection and forecast revisions must survive concurrency and restart. |
| [14 — Urgent-first route policy and manual fallback](14-route-policy-manual-fallback.md) | `gpt-6-astra` | `xhigh` | Urgent ordering, current-stop protection and manual fallback must preserve all route constraints. |
| [15 — Online round start and departure authority](15-round-start-departure-lock.md) | `gpt-6-astra` | `xhigh` | Round start races with assignment changes and another device at the authority boundary. |
| [16 — Explicit current target, heading and arrival](16-current-heading-arrival.md) | `gpt-6-astra` | `high` | Current target, heading, arrival and physical origin must stay distinct across state changes. |
| [17 — Delivery outcomes, whole pieces and exact collection](17-outcomes-quantities-collection.md) | `gpt-6-astra` | `xhigh` | Whole pieces, partial outcomes, exact money and outbound events must commit coherently. |
| [18 — Deferral, whole-shipment retry and driver urgency](18-deferral-retry-driver-urgency.md) | `gpt-6-astra` | `high` | Retry, deferral and urgency have different eligibility rules and must protect current work. |
| [19 — Round closure, workday closure and carry-forward](19-workday-closure-carryover.md) | `gpt-6-astra` | `xhigh` | Round/workday closure and carry-forward interact with unfinished custody and immutable history. |
| [20 — Online device takeover and preserved former-device evidence](20-device-takeover-evidence.md) | `gpt-6-astra` | `xhigh` | Device takeover must reject stale authority while preserving delayed offline evidence. |
| [21 — Source-branch return requests and actual subset receipt](21-source-return-receipt.md) | `gpt-6-astra` | `xhigh` | Actual subset receipt, source ownership and unresolved goods require strict quantity conservation. |
| [22 — Branch interruption, resume and new dispatch cycles](22-branch-interruption-redispatch.md) | `gpt-6-astra` | `xhigh` | Branch interruption, capacity, resumed routes and fresh dispatch identities interact. |
| [23 — Driver corrections and compatible evidence adoption](23-bounded-driver-corrections.md) | `gpt-6-astra` | `xhigh` | Corrections race with receipt, redispatch and closure and cannot invalidate dependent facts. |
| [24 — Coherent monitoring snapshots and scoped history](24-coherent-monitoring-api.md) | `gpt-6-astra` | `high` | Coherent projections and scoped history must preserve revisions and mixed-source isolation. |
| [25 — Durable outbox sender and signed delivery](25-outbox-signed-delivery.md) | `gpt-6-astra` | `xhigh` | Leases, signed bytes, durable delivery, retries and ordering must recover from process failures. |
| [26 — External mock inbox, projection and reconciliation](26-mock-inbox-projection-recovery.md) | `gpt-6-astra` | `xhigh` | Independent inbox/projection transactions, gaps and public-boundary conformance prove external integration. |
| [27 — Native mock ERP commands and source outbox](27-native-mock-erp-source.md) | `gpt-6-astra` | `xhigh` | The native ERP source outbox and real two-way journey cross identity, custody and synchronization. |
| [28 — Connected daily work, preparation and route start UI](28-online-preparation-journeys.md) | `gpt-5.6-sol` | `high` | Connect a bounded preparation journey to already verified intake, planning and start APIs. |
| [29 — Connected ordinary driver delivery UI](29-ordinary-driver-delivery-ui.md) | `gpt-5.6-sol` | `high` | Connect the ordinary driver journey using established outcome contracts and focused UI patterns. |
| [30 — Focused driver exception and correction UI](30-driver-exception-correction-ui.md) | `gpt-6-astra` | `high` | Exception and correction UI must expose the right authority and pending/rejected states simply. |
| [31 — Driver branch handover, resume and workday closure UI](31-driver-branch-closure-ui.md) | `gpt-6-astra` | `high` | Branch handover, resume and day closure UI combine several custody and closure states. |
| [32 — Dispatcher monitoring and online synchronization feedback](32-monitoring-sync-online-ui.md) | `gpt-5.6-sol` | `high` | Connect monitoring and synchronization feedback to established coherent read models. |
| [33 — PWA downloads and atomic local action capture](33-offline-local-capture.md) | `gpt-6-astra` | `xhigh` | Atomic browser storage, downloaded scope and local actions must survive reopen and storage failure. |
| [34 — Ordered replay and durable conflict recovery](34-ordered-replay-conflict-recovery.md) | `gpt-6-astra` | `xhigh` | Ordered replay, stale ownership and conflicts require recovery without lost or duplicate business changes. |
| [35 — Safe offline account recovery and application updates](35-offline-auth-updates-ux.md) | `gpt-6-astra` | `xhigh` | Offline account recovery and service-worker updates must preserve queued actions and isolation. |
| [36 — Effective workday reports and forecast comparison](36-workday-timing-reports.md) | `gpt-6-astra` | `xhigh` | Forecast baselines, late actuals, corrections and workday boundaries must yield truthful reports. |
| [37 — Equivalent authorized Excel exports](37-authorized-excel-export.md) | `gpt-5.6-sol` | `high` | Produce an authorized Excel export equivalent to the existing verified report snapshot. |
| [38 — Owner diagnostics and measured freshness/capacity](38-diagnostics-freshness-capacity.md) | `gpt-6-astra` | `high` | Design meaningful measurements and interpret freshness, errors and capacity without overclaiming. |
| [39 — Recoverable deployment and migration release procedure](39-deployment-migration-release.md) | `gpt-6-astra` | `high` | Application releases and migration recovery must preserve the live Engine and user data. |
| [40 — Backup, isolated restore and recovery proof](40-backup-restore-rehearsal.md) | `gpt-6-astra` | `high` | An isolated restore must prove data, identity and synchronization recovery with measured evidence. |
| [41 — Real-device and owner pilot walkthrough](41-device-owner-pilot-review.md) | `gpt-6-astra` | `high` | Synthesize real-device behavior, owner findings and incomplete acceptance evidence. |
| [42 — Final contract, readiness and ERP handoff](42-final-contract-readiness-handoff.md) | `gpt-6-astra` | `xhigh` | Audit cross-phase contract drift and assemble a reproducible, evidence-backed ERP planning handoff. |

كل مرحلة تتنفّذ وحدها وبنقاط التحقق المكتوبة فيها. لو ظهر خلل، يبدأ التشخيص من دليل الفشل؛ تغيير الموديل وحده ليس إصلاحًا. يمكن استخدام Astra لمشكلة صعبة داخل مرحلة مرشحة لـSol، مع تسجيل التغيير، دون توسيع نطاق المرحلة أو تنفيذ المراحل التالية تلقائيًا.

إتاحة الموديلات قد تختلف حسب الحساب، نسخة التطبيق ووقت التنفيذ. لا تفترض موديلًا غير ظاهر في المحدد، ولا تغيّر إعدادات الحساب أو موديل المهمة الحالية لمجرد قراءة هذا الدليل. الاختيار لا يسمح بتفويض العمل لوكلاء فرعيين تلقائيًا.
