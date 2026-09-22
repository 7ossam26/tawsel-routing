# Tawsel — دليل مراحل التنفيذ، الحزمة الحالية

**الحزمة الحالية: تعديل 3، تضم 42 مرحلة متتابعة تحت D-109–D-111، مع توضيح حدود تكامل الـERP في D-112 دون إضافة مرحلة، وموديل ومستوى تفكير لكل مرحلة وتسليمات ERP محددة.**
التنفيذ الفعلي: **المرحلتان 01 و02 منفذتان ومتحقق منهما محليًا ضمن نطاق التأسيس؛ مواصفات المرحلة 03 مكتملة ومتحقق من اتساق مستنداتها مع انتظار مراجعة المالك؛ المراحل 04–42 لم تبدأ، والمرحلة 04 هي التالية**. عقود العمليات التشغيلية ما زالت مصممة فقط وليست واجهات متاحة. راجع [دليل المرحلة 02](../phase-02-evidence.md) و[دليل المرحلة 03](../phase-03-evidence.md). هذه ملفات التكليف بالتنفيذ.

النسخة الأولى ذات 11 مرحلة جمعت مجالات واسعة داخل المهمة الواحدة. النسخة الحالية تفصلها إلى نتائج أصغر قابلة للتجربة والمراجعة، وتضع قواعد الجزء وحالاته داخل الـprompt نفسه. المرجع العام هو [master-plan.md](../../master-plan.md)، والقرارات الأصلية وتعديلاتها في [سجل الاكتشاف](../../TAWSEL-DISCOVERY-LOG.md).

## تستخدمها إزاي؟

1. ابدأ بملف [المرحلة 01](01-workspace-test-harness.md). اختَر الموديل ومستوى التفكير المكتوبين في أول الملف من محدد Codex، ثم ابعت **محتوى الملف كاملًا** للـagent داخل نفس مستودع المشروع. الاسم داخل الـprompt لا يغيّر الموديل تلقائيًا.
2. المهمة تنفّذ المرحلة المحددة فقط. لا تنتقل تلقائيًا لبقية الأرقام.
3. داخل كل مرحلة ثلاث نقاط تنفيذ مرتبة؛ بعدها حالات قبول واختبارات محددة. الفحص يحصل أثناء البناء، وليس بعد بناء كل الأجزاء مرة واحدة.
4. بعد المرحلة راجع النتيجة القابلة للتجربة و[سجل التنفيذ](../implementation-status.md): ما الذي اتنفذ؟ ما الذي اختُبر؟ وما الذي فشل أو لم يُجرّب؟
5. المرحلة التالية تعمل على الملفات والكود الناتج فعليًا. الـagent يفحص المتطلبات السابقة؛ لا يفترض أن وجود وثيقة أو كلمة «خلصت» يعني أن الكود يعمل.
6. لا تشغّل المراحل بالتوازي على نفس الملفات. مراجعة التصميم تبدأ في المرحلة 04؛ سجّل ملاحظاتك الحقيقية قبل تعميم الأنماط على بقية الواجهات.
7. لو متطلب سابق ناقص، يتصلح بحدود واضحة أو تُذكر المشكلة التي تمنع الجزء المعتمد عليه. غياب خدمة خارجية لا يمنع التحضير المستقل، لكنه لا يتحول لنتيجة اختبار ناجحة.

الـprompts مكتوبة بالإنجليزية لتسمية العقود والاختبارات والسلوك بدقة، والمنتج نفسه عربي RTL. كل ملف يتضمن السياق الضروري للـagent الذي لم يقرأ الشات: الهدف، المتطلبات السابقة، المصادر، قواعد السلوك، خطوات التنفيذ، أمثلة القبول، الاختبارات، الملفات الناتجة وما هو خارج نطاقه.

## الموديل وتسليم الـERP

- [جدول الموديلات لكل الـ42 مرحلة](model-selection.md): الاسم، مستوى التفكير وسبب الاختيار؛ نفس الترشيح موجود داخل كل prompt.
- [خطة ملفات تسليم الـERP واختبار الربط](../planning/erp-handoff-deliverables.md): المراحل المسؤولة والملفات التي ستأخذها لتخطيط الـERP الحقيقي.

المرحلة 02 تبدأ العقود وملفات التخطيط، و08/10/21/22/25 تكمل حدود التكامل. المرحلتان 26 و27 تثبتان الربط بنظام خارجي مستقل في الاتجاهين. المرحلة 42 تراجع النسخة النهائية وتجمع العقود والأمثلة والعميل ودليل التشغيل وخريطة البيانات والحالات وأدلة الاختبارات. هذه تسليمات مطلوبة وقت التنفيذ، وليست ملفات تنفيذ مكتملة الآن.

## لماذا هذا التقسيم؟

المعيار هو نتيجة مستقلة يمكن فحصها، لا رقم ثابت ولا عدد سطور. أمثلة:

- الحسابات والصلاحيات، ثم تسجيل الدخول، ثم جسر إدارة مستخدمي ERP؛ لكل جزء دليل عمله.
- استقبال الشحنات، ثم المواقع، ثم محولات Engine، ثم التخطيط، ثم سياسة المسار، ثم بدء الجولة.
- الوصول منفصل عن حساب نتائج التسليم والمبالغ، والمرتجع منفصل عن تصحيح النتيجة.
- الـoffline ينقسم إلى تخزين محلي، ثم replay وتعارضات، ثم الجلسة والتحديثات الآمنة.
- اختبار الأداء، وتجهيز النشر، واسترجاع النسخ الاحتياطية، وتجربة الأجهزة والتسليم النهائي مراحل مختلفة.

المراحل 29–31 تفصل واجهة المندوب إلى المسار العادي، والاستثناءات/التصحيح، والفرع/إنهاء اليوم. كتابة backend ناجح لا تعتبر الواجهة مكتملة، ولقطة شاشة جميلة لا تعتبر العملية متصلة بالبيانات.

## المراحل بالترتيب

### التأسيس والتصميم

| المرحلة / ملف الـprompt | النتيجة المقصودة |
| --- | --- |
| [01 — Runnable workspace and test harness](01-workspace-test-harness.md) | A new agent can install, start and check the web/API workspace without touching the existing Engine. This phase establishes reliable commands, not a delivery application. |
| [02 — State vocabulary and canonical contract foundation](02-state-contract-foundation.md) | Define the shared state and protocol language before feature implementation. Establish validated common schemas and an exhaustive operation inventory; each later feature phase completes its own operation schemas before implementing them. |
| [03 — Visual system and requirement-driven action specification](03-design-action-specification.md) | Create a usable design and action specification that preserves the visual references while covering the actual agreed product, including missing pages and removed prototype controls. |
| [04 — Shared components and early simple-UX review](04-representative-ui-review.md) | Deliver a small interactive fixture-backed driver journey and selected-driver desktop view that the owner can inspect early. Validate common patterns before copying them across production journeys. |
| [05 — PostgreSQL migrations and atomic command kernel](05-postgres-atomic-command-kernel.md) | Establish the real database and command transaction infrastructure before any feature accepts authoritative changes. Prove commit, rollback and duplicate behavior using PostgreSQL. |

### الحسابات والصلاحيات والإدخال

| المرحلة / ملف الـprompt | النتيجة المقصودة |
| --- | --- |
| [06 — Tenant, branch and capability enforcement](06-tenant-capabilities-isolation.md) | Enforce access as a server rule with real database tests. Establish the reusable authorization model before identity provisioning and resource APIs depend on it. |
| [07 — Real login, recovery and separate sessions](07-oidc-login-recovery-sessions.md) | Connect the themed login/account shell to a real local identity issuer and application sessions for separate company and independent accounts. |
| [08 — ERP provisioning and verified actor context](08-erp-provisioning-actor-binding.md) | Provide a versioned, authenticated boundary for ERP-owned branches, users, roles and driver references, without allowing a service credential to impersonate arbitrary staff. |
| [09 — Independent-driver task intake](09-b2c-task-intake.md) | An independent driver can create, inspect and correct their own simple tasks through real persistence and a small usable entry form. |
| [10 — ERP task snapshots, receipt and atomic admission](10-b2b-intake-admission.md) | Accept real ERP-preassigned work with precise source snapshots, distinguish preparation from receipt and reject over-capacity batches atomically. |

### المواقع والتخطيط

| المرحلة / ملف الـprompt | النتيجة المقصودة |
| --- | --- |
| [11 — Confirmed locations and real map assets](11-locations-map-assets.md) | Provide real address candidates, explicit pin confirmation and usable self-hosted maps for B2C and authorized B2B location review. |
| [12 — Routing Engine adapters and vehicle profiles](12-engine-profile-adapters.md) | Implement and verify the OSRM/VROOM routing boundary for all three vehicle modes, with correct units, coordinates and provider failure semantics. |
| [13 — Durable planning jobs and forecast revisions](13-planning-jobs-forecast-storage.md) | Turn accepted planning inputs into durable asynchronous jobs and stored plan/forecast revisions, with restart and stale-result protection. |
| [14 — Urgent-first route policy and manual fallback](14-route-policy-manual-fallback.md) | Validate complete routes against product rules and provide honest manual operation when optimization is unavailable or incomplete. |

### تشغيل الجولة ونتائجها

| المرحلة / ملف الـprompt | النتيجة المقصودة |
| --- | --- |
| [15 — Online round start and departure authority](15-round-start-departure-lock.md) | Start exactly one authoritative round online, preserve its first forecast and close the race between starting, ERP edits and another device. |
| [16 — Explicit current target, heading and arrival](16-current-heading-arrival.md) | Implement the driver's current activity and physical-origin semantics independently from route suggestions and outcome recording. |
| [17 — Delivery outcomes, whole pieces and exact collection](17-outcomes-quantities-collection.md) | Record full/partial/refused/no-answer outcomes atomically with exact quantities, reported collection, coherent progress and durable outbound intent. |
| [18 — Deferral, whole-shipment retry and driver urgency](18-deferral-retry-driver-urgency.md) | Allow the driver to reschedule eligible whole work and set urgency without reopening rejected partial remainders or disturbing the current customer. |
| [19 — Round closure, workday closure and carry-forward](19-workday-closure-carryover.md) | Close rounds and explicit workdays without losing held work, resetting history at midnight or implying delivery, receipt or settlement. |
| [20 — Online device takeover and preserved former-device evidence](20-device-takeover-evidence.md) | Let the same driver view a running round on another phone and explicitly transfer execution ownership online while preserving delayed evidence from the old phone. |

### المرتجعات والتصحيح والمتابعة

| المرحلة / ملف الـprompt | النتيجة المقصودة |
| --- | --- |
| [21 — Source-branch return requests and actual subset receipt](21-source-return-receipt.md) | Record driver return requests and native-ERP confirmation of actual pieces received, while preserving unresolved goods and the distinction between receipt and loss/damage. |
| [22 — Branch interruption, resume and new dispatch cycles](22-branch-interruption-redispatch.md) | Integrate branch service into an active round without losing the paused customer sequence, exceeding route capacity or pretending returned goods remain eligible in the old cycle. |
| [23 — Driver corrections and compatible evidence adoption](23-bounded-driver-corrections.md) | Let the driver correct a mistaken result or piece count without deleting history or undoing dependent receipt, redispatch or closed-day facts. |
| [24 — Coherent monitoring snapshots and scoped history](24-coherent-monitoring-api.md) | Provide consistent operational read models for drivers, authorized company viewers and individual integrations without leaking mixed-source work. |

### التكامل الحقيقي مع الـMock ERP

| المرحلة / ملف الـprompt | النتيجة المقصودة |
| --- | --- |
| [25 — Durable outbox sender and signed delivery](25-outbox-signed-delivery.md) | Deliver committed Tawsel events through a restart-safe worker with scoped signatures, retry/ordering and observable durable states. |
| [26 — External mock inbox, projection and reconciliation](26-mock-inbox-projection-recovery.md) | Prove the receiving side behaves as a real external ERP consumer with its own storage, durable receipt, atomic projection and recovery from gaps or expired replay history. |
| [27 — Native mock ERP commands and source outbox](27-native-mock-erp-source.md) | Complete the labelled mock ERP as a real source of provisioning, assignments and branch receipt, with durable pending/accepted/rejected command status. |

### الواجهات المتصلة بالتشغيل

| المرحلة / ملف الـprompt | النتيجة المقصودة |
| --- | --- |
| [28 — Connected daily work, preparation and route start UI](28-online-preparation-journeys.md) | Connect the driver from real account/daily work through intake/location readiness and plan preview to a server-confirmed round start. |
| [29 — Connected ordinary driver delivery UI](29-ordinary-driver-delivery-ui.md) | Complete the ordinary online driver path from an active round through heading, arrival and a full result. Keep this phase small enough to inspect the common path before adding exception workflows. |
| [30 — Focused driver exception and correction UI](30-driver-exception-correction-ui.md) | Expose the less frequent delivery choices in focused views while keeping the ordinary driver screen simple and enforcing the real server rules. |
| [31 — Driver branch handover, resume and workday closure UI](31-driver-branch-closure-ui.md) | Complete the driver-facing branch return and end-round/day journeys with honest subset confirmation, held-work carryover and clear ownership feedback. |
| [32 — Dispatcher monitoring and online synchronization feedback](32-monitoring-sync-online-ui.md) | Make authorized shared monitoring coherent and fresh, and distinguish actual Tawsel acceptance from ERP receipt/application without exposing backend internals to drivers. |

### الـOffline والاسترجاع

| المرحلة / ملف الـprompt | النتيجة المقصودة |
| --- | --- |
| [33 — PWA downloads and atomic local action capture](33-offline-local-capture.md) | Persist authorized started work and local action evidence so a driver can reopen and record allowed work without falsely claiming server acceptance. |
| [34 — Ordered replay and durable conflict recovery](34-ordered-replay-conflict-recovery.md) | Reconnect the durable client journal to server execution using dependency-aware replay, per-action results and preserved incompatible evidence. |
| [35 — Safe offline account recovery and application updates](35-offline-auth-updates-ux.md) | Keep pending work safe through session expiry, deliberate account exit, service-worker updates and local schema upgrades, with understandable driver feedback. |

### التقارير والتصدير

| المرحلة / ملف الـprompt | النتيجة المقصودة |
| --- | --- |
| [36 — Effective workday reports and forecast comparison](36-workday-timing-reports.md) | Show authorized results, reported collection and expected-versus-actual timing using forecasts captured when work happened and actual action-time provenance. |
| [37 — Equivalent authorized Excel exports](37-authorized-excel-export.md) | Download a real Excel workbook matching the authorized report view, with stable snapshot/filter semantics and safe user-controlled text. |

### التشخيص والتشغيل والتسليم

| المرحلة / ملف الـprompt | النتيجة المقصودة |
| --- | --- |
| [38 — Owner diagnostics and measured freshness/capacity](38-diagnostics-freshness-capacity.md) | Give the owner a reproducible way to locate bottlenecks and measure monitoring/integration freshness under stated conditions, without inventing supported capacity. |
| [39 — Recoverable deployment and migration release procedure](39-deployment-migration-release.md) | Prepare and verify a nondestructive KVM 2/Dokploy deployment path with safe networking, pinned services and compatible migration/update procedures. |
| [40 — Backup, isolated restore and recovery proof](40-backup-restore-rehearsal.md) | Prove server-stored application state can be recovered, including the integration checkpoint and identity/configuration needed to use it. |
| [41 — Real-device and owner pilot walkthrough](41-device-owner-pilot-review.md) | Verify the complete real B2C journey and separate B2B mock scenarios on target browsers/devices, including simple UX and genuine elapsed offline observation where available. |
| [42 — Final contract, readiness and ERP handoff](42-final-contract-readiness-handoff.md) | Deliver an accurate as-built application/ERP handoff and readiness report showing exactly what is implemented, verified, owner-reviewed and still outstanding. |

## تتبع المتطلبات والقرارات

- [خريطة التغطية](coverage-matrix.md): 65 مجموعة متطلبات حالية، لكل منها مرحلة تنفيذ ومراحل استكمال/تحقق، ثم توزيع العقود والشاشات والاختبارات ومعايير A–P.
- [خريطة القرارات](decision-map.md): تربط جميع القرارات D-01 إلى D-112 بالمتطلبات الحالية، وتوضح التعديلات التي تمنع تطبيق اقتراح قديم.
- [قائمة مراجعة انتهاء المرحلة](review-checklist.md): أسئلة عملية لفحص الناتج، لا طلب موافقة جديدة على كل خطوة.
- [سجل التنفيذ](../implementation-status.md): الحالة الحقيقية والأدلة والفجوات، ويبدأ بدون أي مرحلة منفذة.

لا يلزم أن تكون كل الملفات المستقبلية موجودة الآن. المرحلة 01 تبني workspace، و02 تضع أساس العقود/الحالة، و03 تكتب DESIGN.md وdocs/ui-spec.md، و04 تنتج مراجعة واجهة فعلية. كل مرحلة ميزة تكمل مخطط عملياتها/أمثلتها قبل handler/UI؛ لا تتكوّن قائمة endpoints وهمية تُرجع success.

كل المراحل تنفّذ Vitest المناسب مع الميزة. اختبارات PostgreSQL/التزامن والمزامنة لا تُستبدل بـmocks لكل الأجزاء. اختبارات المتصفح والأجهزة لها دليل منفصل، والمراجعة البشرية تسجّل فقط عندما تحدث.

## الحدود الثابتة

الشاشات مرجع بصري، والقرارات تحكم الأزرار والعمليات. استخدم shadcn/ui + Smooth UI ضمن تصميم متناسق وبسيط جدًا للمندوب. حافظ على الـstack المقبولة، بيانات Engine، أصول Stitch وأي شغل غير متعلق بالمهمة.

لا تعيد إدخال عدّاد المكالمات، GPS، فوترة B2C، نقل الشحنات مباشرة بين المندوبين، صلاحية الموظف لتغيير نتيجة شحنة خرجت، أو محاسبة/تسوية مالية. هذه ليست إضافات لازمة لإكمال صفحات المرجع.

تفاصيل الهندسة المقترحة—مثل معالجة زيارة الفرع عند السعة القصوى، polling/retention وأهداف الاسترجاع—تظل موضحة في البلان. تنفيذ المراحل يتحقق منها ويحافظ على قواعد العمل؛ لا يختلق موافقة منفصلة على كل رقم ولا يغيّر سلوك العمل لتسهيل الكود.

## النسخة السابقة

[حزمة 11 مرحلة](../phases-archive-v1/README.md) مؤرشفة للمقارنة فقط وموسومة بأنها superseded. لا تستخدم prompts منها للتنفيذ الجديد. عدد الـ42 ليس تقدير مدة أو ادعاء أن المنتج أصبح منفذًا.
