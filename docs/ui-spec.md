# Tawsel UI specification

Version 1 — 22 September 2026. **Representative P04 fixture implemented and browser-checked; owner review pending.** P03 defines the design/actions and [the P04 review](ui-review.md) records the bounded runtime evidence. Production journeys remain the P01 foundation shell; the driver/desktop review is development-only and no business operation is implemented. [P03 evidence](phase-03-evidence.md) and [P04 evidence](phase-04-evidence.md) keep specification, fixture, browser and owner evidence distinct.

Authority: [master plan](../master-plan.md), latest [decision map](phases/decision-map.md) through D-112 and [state foundation](tracking-and-consistency.md). Scope includes R-55/R-56/R-57 and follow-through R-63/R-64/R-65. D-102 makes screenshots visual references; D-103/D-107 select the stack; D-106 requires driver clarity; D-109 limits this work to P03. Superseded call counters, staff correction and offline-start proposals stay removed.

## Reference inventory

The [reference audit](ui-reference-audit.md) is part of this specification: exact nine source IDs, HTML/metadata/image links, actual image dimensions, observed visual defects, all 105 exported control dispositions and additional visual affordances. Originals are from HEAD `28d038a50717f2a3b41ec59c4715c54273b9e5f0`, project `16661174340563199513`. 01–03 use `screen.jpg`; 04–09 use `screen.png`. All nine were visually inspected in this phase; none inaccessible.

Use [DESIGN.md](../DESIGN.md) for shared Cairo 400/600/700/800 tokens, navy actions, blue accents, light surfaces, responsive RTL and map/list behavior. 01/02 supply driver stage/contact hierarchy; 03 supplies selected-driver workspace; 04 identity/form rhythm; 05 day hierarchy; 06 readiness/preview; 07 pin review; 08 completion/report; 09 evidence history. The product has more than nine routes and many focused states on one route.

Intentional additions: separate B2C register/recover/intake, mobile pin confirmation, explicit heading, manual/partial planning, takeover, whole-piece B2B outcomes, self-correction, urgency/earliest/retry, source-branch request/status/interruption, explicit round/day closure, report/forecast/Excel, session/storage/update recovery. Each is mapped below; no warehouse, finance, fleet, billing, GPS, signature/photo/POD or commercial ERP module is added.

## Driver simplicity

Every state must make four things discoverable in brief Arabic: purpose, next action, missing input and what/whom it awaits. One visually dominant stage action; required blockers remain visible near it. Keep phone, WhatsApp and navigation beside the recipient as contextual secondary controls. Advanced task options are under a labelled “خيارات المهمة” button, not hidden swipe/long-press gestures. Outcomes live in one focused surface; short choices use sheets and longer work uses pages.

| Stage | Dominant action | Immediate context / secondary access | Must not happen |
| --- | --- | --- | --- |
| Signed out | Company: continue from company code to login; independent: login | Clear account type, recovery, registration for independent driver | Role selection granting access, linked personal/company identity |
| Daily ready | ابدأ الجولة | Eligible work count, vehicle/origin summary, change preparation, add own B2C task | Start before sync/server acceptance or extra dispatcher approval |
| Existing active round | تابع الجولة | Current/next and pending status; workday and carried work | New concurrent round button |
| Selected next, no current | اتجه للعميل | Name, destination and contact shortcuts | Label selection/navigation as heading |
| Heading | وصلت | Current recipient/contact/navigation, options and no-answer | Infer arrival from GPS/call/outcome |
| Arrived | سجّل النتيجة | Recipient/instructions; short expected amount, contact still available | Replan replaces current or automatically resolves it |
| Result form | حفظ النتيجة | Choice plus exact amount/whole pieces where applicable; cancel | Second generic confirmation or success from animation |
| Result saved locally | اتجه للعميل on next eligible detail, when offline rules permit | Persistent “محفوظ على الهاتف · بانتظار المزامنة”; sync detail optional | Force sync page after every result or call it server-confirmed |
| Source-branch request waiting | No fake completion action; refresh/status if useful | Exact offered/received/remaining, named source branch | Driver self-confirms ERP receipt or all-items/cash settlement gate |
| Summary | Return to daily work after end; before end, chosen end action | Held work, processed/delivered denominators, report details | End-day treated as successful delivery of every stop |

The absence of an executable action is acceptable in a genuine wait/read-only state: state why, show the awaited party and permit safe navigation. Do not manufacture work just to display a primary button. Hide actions outside product/permission scope; for an otherwise eligible action with missing input, keep its visible cause and a direct recovery action. Recovery becomes dominant when it is the only useful next step.

### Shared transition rules

Contact/navigation/selection/filtering are local actions. `current.selectHeading`, `current.recordArrival` and outcome commands are separate explicit acts. An outcome clears current and only suggests next. Replanning protects current; eligible urgent work comes after it, never before a future earliest time. Manual route preserves eligibility and limit rules. One stop per shipment even at identical coordinates. The remaining-route limit is 50 planned stops including branch visits, not daily tasks, held inventory, weight or volume.

Prepared B2B work is visible upcoming, not received/on-board. ERP owns initial assignment and accepted content/prices. Staff may plan/review pins before departure if authorized; departed recipient/content/assignment/outcome/urgency is read-only. The assigned driver retains permitted execution pin/urgency/correction authority. Real source-branch receipt/disposition remains a native ERP action with trusted actor binding. B2C has own simple task/outcome/optional collection and no line splitting/branch custody.

An uncertain request result stays uncertain; query/retry the same action ID. A local save follows a successful local journal transaction. Durable evidence receipt, accepted business result and ERP applied checkpoint are distinct. Never expose revision numbers/idempotency/worker details in routine driver copy; they belong in authorized diagnostic details. A newer route revision alone is not a rejected outcome. Corrections preserve original/effective history, remain owning-driver/open-day/before-dependency only and do not refund money.

## Routes and actions

The complete normative [action coverage table](ui-actions.md) maps **every canonical operation**, local UI action, event and internal worker responsibility to role/state, page/focused overlay, required input/recovery and connected UI phase. Backend ownership/capability/lifecycle remains in [contracts/operations.json](../contracts/operations.json), with generated [contract coverage](contract-coverage.md). Route names below are application navigation proposals only; no HTTP API paths are introduced.

| Surface / route family | Role, reference and action rows | Page composition and navigation |
| --- | --- | --- |
| `/login/company`, `/login/independent` | Separate signed-out accounts; 04; A01–A04 | Compact logo/title then labelled credentials/context. Account-type entry precedes credentials; issuer-themed credential page. Authenticated branch selection only if necessary. Error returns to affected field/context. |
| `/register`, `/verify-email`, `/recover`, `/recover/complete` | B2C registration/email recovery; company uses issuer path; 04 extension; A02–A03 | One task per page, neutral delivery acknowledgement, missing/expired proof recovery. Recovery email is not login identifier; phone not SMS-verified. |
| `/account`, `/account/storage` | Own account; 04/09 extension; A04/A40/A41 | Identity and permitted context, downloaded-work/storage facts, pending exit/update recovery. No administrative role editor. |
| `/day`, `/day/summary` | Own driver; 05/08; A13/A23–A25/A32 | Active first, then received ready work, prepared upcoming, held/deferred/carryover and ended rounds. Explicit workday spans midnight. One stage action per active/ready context. End-day via summary, not a mandatory daily wizard. |
| `/tasks`, `/tasks/new`, `/tasks/:taskId/edit` | B2C owner; 06 mobile extension; A05 | Fast name/phone/destination with optional collection/instructions. Allow unsaved draft pin review and return without retyping. Existing task preserves revision; departure-dependent edits use proper correction/pin flow. No B2B task entry form. |
| `/prepare`, `/workspace/drivers/:driverId/prepare` | Own driver or scoped predeparture planner; 06/03; A10–A13 | Readiness summary and eligible list, explicit unresolved group, mode/origin/end/service controls, one preview action. Save draft secondary. Preview shares this page; ready start visible for own driver only. |
| `/tasks/:taskId/location` | Authorized predeparture staff/own driver; 07 mobile/desktop; A09 | Source address and instruction, query/candidates/map, selected pin summary and confirm. Missing pin recovery returns to caller with draft intact. Keyboard/candidate/manual entry alternative to dragging. |
| `/rounds/:roundId` | Own driver; 01; A14/A22/A30/A32 | Current-stage card above map/ordered list. Next planned separate; held/upcoming disclosed by labelled group. Selecting list/marker opens detail; no implicit heading. |
| `/stops/:attemptId` | Own driver; 02; A14–A22/A38 | Recipient/address/instructions, contact row, stage action. Result/no-answer/refusal/defer/urgency/retry use single focused sheet with stable back behavior. No-answer also available before arrival. |
| `/stops/:attemptId/partial` | Authorized B2B split; 02 extension; A17 | Whole-piece line list with accessible increment/direct numeric fields and per-line total. Summed due and return-required remainder visible. Back retains draft; invalid zero/full selection offers appropriate outcome, no ambiguous partial. |
| `/outcomes/:outcomeId/correct` | Owning driver within bounds; 02/09 extension; A26 | Original/effective result then proposed difference, exact amounts/pieces, one save. Read-only history when blocked by day closure/receipt/redispatch; no staff correction route. |
| `/returns`, `/returns/:requestId`, `/branch-activity/:activityId` | B2B driver only; 05/08 extensions; A28/A30 | Source-branch groups → item selection/request → status. Explicit interruption retains paused customer list; arrival separate. Show received subset and unresolved goods; resume only after claimed subset is confirmed. |
| `/rounds/:roundId/summary` | Own driver or scoped read; 08; A23/A24/A36 | Processed vs delivered, held/carryover, initial/latest estimates and actuals, open-day/end choice. Round end/day end distinct; no cash remittance. |
| `/sync`, `/sync/:actionId`, `/sync/:actionId/review` | Own account/current driver evidence; 09; A27/A34/A35/A41 | Filtered local/received/accepted/review/rejected cards with plain causes. Compatible adoption is driver-only, not staff override. Unsent local actions aren't a staff projection. |
| `/workspace`, `/workspace/drivers/:driverId` | Authorized branch observer/planner; 03; A32/A39 | Selected-driver list/map/detail, current/next and coherent counts. Predeparture preparation link when allowed; after departure monitor/history only. Freshness visible independently from last action/contact. |
| `/reports/workdays/:workdayId` | Own driver/scoped staff with report/export grants; 08 extension; A36/A37 | Filters and labelled denominators, outcome/piece/collection table, forecast comparison, Excel status. Mobile row detail, desktop table; matching filter/snapshot export. |
| `/operations/integrations/:integrationId`, `/operations/health` | Scoped integration operator/owner; 09/03 extensions; A42/A44–A46 | Separate delivery receipt/application/checkpoint/error details and measured health. Not driver navigation, financial reconciliation or live GPS. Configuration may be operator tooling in owning phase. |
| External native ERP/source/receiver surfaces | ERP actors; A06–A08/A29/A31/A33/A43 and B02/B03 | Native provisioning, preparation/assignment, actual subset receipt/disposition and new dispatch. Mock P27 labelled external, separate database/public boundary; real ERP vendor surface remains unknown. |

All route entries preserve account/resource context on back; deep links validate scope before data render. No accessible record yields a concise denial/not-found state with return to the scoped list. Avoid leaking recipient details in denial pages, browser title or search results. Selection filters cannot elevate scope. No B2C branch-return routes in navigation or successful command paths.

## State copy and feedback

The acceptance cases below (Checkpoint C) apply across these route families. Copy is brief Arabic intent, not a new wire enum. Use existing contract state vocabulary and field-specific inputs; UI category “missing” can represent multiple domain causes without collapsing them. Pending/received/accepted statuses come from evidence, never the browser's network flag alone.

Authoritative read stays visible beneath a clearly separated pending projection. Server acceptance updates the confirmed snapshot; rejection leaves history and explains recovery. Show last successful refresh in Cairo time and mark stale without erasing content. An idle driver is not offline. Background sync and complete offline maps are not promised. Blocking storage failure must explicitly say the action was not saved.

For each form: label → field → concise hint or error. On submit focus the first invalid field and expose a linked summary if several fields fail. Preserve entered name, phone, selected outcome, quantities, amount and time after cancel/failure; a changed account never inherits another account's draft. Error details are available only when useful; don't show raw schema payloads to drivers. A success toast alone is insufficient proof/status—retain the result on its card/history.

### Acceptance copy cases

These began as designed review cases. P04 now executes the representative J01–J07 presentation/stages plus S01/S03/S04/S07/S09/S10/S11/S13-like fixture states as documented in [ui-review.md](ui-review.md); this is not connected command evidence. The first stop contains three EGP100 pieces plus EGP50 outstanding shipping. Other S cases remain specifications for their owning phases. For the equivalent B2C walkthrough, use the separate independent login and a simple optional amount, with no line items, splitting or branch-return UI. “لا يوجد / لا شيء” below means no corresponding message should clutter the rendered ready state. Operation IDs identify intent for implementers; never display them to drivers. Copy may be shortened after actual owner review while preserving meaning.

| Case | State | Purpose / visible Arabic intent | Next action / operation | Missing input / direct recovery | Awaited fact / visible waiting | Required observable transition |
| --- | --- | --- | --- | --- | --- | --- |
| J01 | ready | ادخل لحساب الشركة | تسجيل الدخول — `session.beginLogin` | لا يوجد؛ كود الشركة معروف واسم المستخدم وكلمة المرور مُدخلان | لا شيء قبل الإرسال؛ بعدها جارٍ تسجيل الدخول | Issuer success establishes this company account then authorized daily work; failure retains identifier, no invented offline login. |
| J02 | ready | مهامك جاهزة — جولتك فيها مهمتان | ابدأ الجولة — `round.start` | لا يوجد؛ الموقع والبداية والخطة مؤكدة والمزامنة مكتملة | جارٍ بدء الجولة after submit | Only accepted start opens active round; pending/failed start cannot create active local work. |
| J03 | ready | العميل التالي المقترح — حسام الدين عبد الرحمن | اتجه للعميل — `current.selectHeading` | لا يوجد | لا شيء | Explicit heading sets this current target. Call/WhatsApp/navigation remain visible and do not change stage. |
| J04 | ready | في الطريق إلى حسام الدين عبد الرحمن | وصلت — `current.recordArrival` | لا يوجد | لا شيء | Explicit arrival makes this arrived; replan never swaps it for another customer. No-answer is still accessible without claiming arrival. |
| J05 | ready | وصلت للعميل — سجّل ما تم | سجّل النتيجة — `ui.filterAndInspect` | لا يوجد قبل اختيار النتيجة | لا شيء | One result sheet opens; no result is recorded merely by opening. |
| J06 | ready | تسليم كامل — المبلغ المطلوب 350 ج.م | حفظ النتيجة — `outcome.recordFull` | لا يوجد؛ ثلاث قطع ×100 وشحن50 وفق المصدر، والقيمة مراجعة | جارٍ الحفظ after submit | Exact valid result saves once. Cancel returns to J05 with draft and no outcome. A failed/unknown save goes to S10/S11, not J07. |
| J07 | confirmed | تم تأكيد النتيجة في توصيل — العميل التالي المقترح | عرض العميل التالي — `ui.filterAndInspect` | لا يوجد | لا شيء؛ لا ندّعي تطبيقها في نظام الشركة | Current clears. Next detail shows J03; viewing it does not begin heading. |
| S01 | missing | المهمة تحتاج تأكيد الموقع | حدّد الموقع — `location.getSnapshot` | لم يتم تأكيد الموقع؛ افتح المراجعة ثم أكّد الدبوس | لا شيء | Start for this task unavailable with cause; valid other work remains plannable. Confirm uses A09 and returns to same context. |
| S02 | missing | اختَر نقطة بداية الجولة | حدّد البداية — `ui.prepareDraft` | لا توجد بداية مؤكدة؛ اختَر الفرع المسموح أو حدّدها يدويًا | لا شيء | Origin field focused; no GPS prompt. Start only after valid plan/state. |
| S03 | empty | لا توجد مهام اليوم | أضف مهمة — `ui.prepareDraft` | لا يوجد؛ حساب مستقل | لا شيء | Opens own B2C intake. For B2B: “لا توجد مهام مستلمة؛ ستظهر بعد إرسال الشركة” and inspect upcoming if any, no intake/receipt button. |
| S04 | waiting | جارٍ تجهيز المسار | عرض المهام — `ui.filterAndInspect` | لا يوجد | بانتظار نتيجة التخطيط | Show queued/running state, preserve work. No estimated timer changes it to ready. Repeated optimize not dominant. |
| S05 | partial | تعذّر إدراج مهمة عاجلة في المسار | راجع المهمة — `ui.filterAndInspect` | راجع الموقع أو اختر ترتيبًا يدويًا صالحًا | لا شيء؛ النتيجة جزئية | Name unassigned/unreachable urgent task. Do not label ordinary remainder urgency-compliant or silently publish incomplete plan. |
| S06 | rejected | تعذّر تجهيز المسار الآن | اختر ترتيبًا يدويًا — `planning.setManualOrder` | خدمة المسار غير متاحة؛ احتفظ بالترتيب السابق أو اختر ترتيبًا صالحًا | لا شيء | Show manual/no-road-estimate label; accepted receipts/outcomes remain. New start still needs server, current is protected. |
| S07 | pending | محفوظ على الهاتف | تابع الجولة — `ui.filterAndInspect` | لا يوجد؛ يمكن متابعة العمل المسموح المحمّل | بانتظار المزامنة مع توصيل | Local pending stays distinct from last confirmed state; no ERP-applied claim. Sync page optional, no navigation after every outcome. |
| S08 | waiting | وصل السجل إلى توصيل | عرض الحالة — `sync.getEvidenceReceipt` | لا يوجد | بانتظار قبول النتيجة | Evidence received alone is not accepted. A received conflict stays available for review. |
| S09 | rejected | لم يُقبل التصحيح؛ الفرع استلم قطعًا مرتبطة به | عرض السجل — `monitoring.getTaskHistory` | التصحيح غير متاح بعد الاستلام؛ راجع النتيجة والسجل | لا شيء | Original/effective/received facts retained. No retry-as-new, force override or cash refund. |
| S10 | rejected | لم يتم الحفظ على الهاتف | حاول الحفظ مجددًا — `ui.captureOfflineAction` | تعذّر التخزين؛ المدخلات ما زالت أمامك | لا شيء | Retain unsaved form; no saved/pending projection. Further failure stays visible; no automatic queue clearing. |
| S11 | pending | لم نتأكد من نتيجة الحفظ بعد | تحقّق من الحالة — `action.getResult` | الاتصال انقطع أثناء الإرسال؛ احتفظ بنفس المحاولة | بانتظار نتيجة توصيل | Query/retry same action ID; never create a new outcome to escape uncertainty. |
| S12 | stale | آخر تحديث للمتابعة: 14:20 | تحديث — `monitoring.getDriverSnapshot` | تعذّر جلب بيانات أحدث؛ المعروض آخر حالة مؤكدة | بانتظار تحديث ناجح | Keep last snapshot with stale badge, reject late regressing reads. Last action/device contact are separate, no “driver offline” inference. |
| S13 | waiting | الجولة تعمل على هاتف آخر | نقل التنفيذ لهذا الهاتف — `ui.filterAndInspect` | يلزم اتصال لنقل التنفيذ | حتى النقل، التنفيذ على الهاتف الآخر | Open A25 sheet online; view existing round read-only; no second start. Offline explains unavailable takeover. |
| S14 | waiting | طلب الإرجاع أُرسل إلى فرع المصدر | عرض الطلب — `return.getRequest` | لا يوجد إجراء تأكيد استلام للمندوب | بانتظار تأكيد الفرع للكميات المستلمة | Request is offered goods only. Branch arrival is not receipt. Unavailable ERP confirmation keeps claimed handover waiting. |
| S15 | confirmed | أكد الفرع استلام قطعة؛ قطعة أخرى ما زالت معك | استأنف الجولة — `branch.resumeRound` | لا يوجد إذا كل ما تدّعي تسليمه للفرع مؤكّد | المتبقي معك أو محل خلاف موضّح منفصلًا | Resume only for confirmed claimed subset; remaining unclaimed/disputed pieces do not create whole-batch gate. No stock/cash clearance claim. |
| S16 | invalid | راجع الكمية والمبلغ | عدّل الكمية — `ui.prepareDraft` | أدخل عددًا صحيحًا لا يتجاوز المتاح؛ المطلوب لقطعتين 250 ج.م | لا شيء | Whole B2B pieces only, authorized split, exact due; preserve input. B2C form has no quantity/partial action. |
| S17 | rejected | لا يمكن إضافة هذه المجموعة؛ سيتجاوز المسار 50 وقفة | راجع المجموعة — `ui.filterAndInspect` | قلّل المجموعة قبل إرسالها من نظام الشركة | لا شيء | Native ERP shows entire batch rejected, not partial admission. Tawsel held history not erased; no automatic backlog/splitting. |
| S18 | missing | سجّل الدخول بنفس الحساب للمزامنة | تسجيل الدخول — `ui.reauthenticateSameAccount` | انتهت الجلسة؛ استخدم حساب هذه العمليات | بعد الدخول، بانتظار إرسال العمليات | Queue/drafts stay account-scoped. Different account cannot see/replay these actions. |
| S19 | waiting | توجد عمليتان بانتظار المزامنة | افتح المزامنة — `ui.filterAndInspect` | أكمل المزامنة قبل الخروج أو تبديل الحساب أو التحديث | بانتظار حفظ النتائج في توصيل | Pending logout/update guard preserves queue; no force-clear/reload option. |
| S20 | denied | لا يمكنك تعديل هذه المهمة بعد بدء الجولة | عرض التفاصيل — `ui.filterAndInspect` | هذه الشاشة للمتابعة؛ التعديل غير متاح لهذا المستخدم | لا شيء | Staff edit hidden/denied. Assigned driver may still use specifically permitted pin/urgency/correction paths. |
| S21 | waiting | تم التأكيد في توصيل | عرض حالة الربط — `integration.getDeliveryStatus` | لا يوجد؛ شاشة مسؤول الربط فقط | بانتظار استلام نظام الشركة، أو التطبيق إذا الاستلام مؤكّد | Separate outbound receipt/applied checkpoint, no downgrade of accepted driver result and no ERP details in routine driver flow. |
| S22 | pending | إنهاء اليوم محفوظ على الهاتف | عرض الملخص — `ui.filterAndInspect` | يلزم المزامنة قبل بدء جولة جديدة | بانتظار تأكيد إنهاء اليوم | Held work carries, correction eligibility not falsely promised, no auto-start/new day at midnight. |
| S23 | loading | جارٍ تحميل مهامك | لا إجراء إرسال أثناء التحميل — `ui.filterAndInspect` | لا يوجد | بانتظار بيانات الحساب الحالي | Static skeleton/status announces loading; previous account data never flashes. Fetch failure has retry, not empty success. |
| S24 | stale | تغيّرت بيانات المهمة أثناء التعديل | راجع النسخة الحالية — `location.getSnapshot` | راجع التغيير قبل تأكيد الدبوس؛ تعديلك محفوظ كمسودة | لا شيء | Keep draft and fetch authoritative data; no blanket discard or stale overwrite. Route-order-only change is not automatically incompatible. |
| S25 | waiting | التقرير قيد التجهيز | عرض الحالة — `report.getExportStatus` | لا يوجد | بانتظار تجهيز ملف Excel | Ready enables authorized download; failed offers retry, expired offers new export with same visible filters. No empty file treated as success. |
| S26 | empty | لا توجد نتائج لهذه الفترة | عدّل الفترة — `ui.filterAndInspect` | لا يوجد | لا شيء | Keep report filters visible; no zero-duration fabricated actuals. Missing arrival is “غير مسجّل”, uncertain clock “وقت تقريبي”. |

### Offline and evidence presentation boundaries

Read cached authorized details and record supported driver execution intent only for downloaded, already-started work on the owning phone. Heading, arrival, outcomes and permitted scheduling/pin/correction/closure intent retain local validation and later server validation; no pending action is guaranteed acceptance. Retry/admission-dependent intent must stay pending until its owning feature establishes eligibility; no fabricated server admission or optimized order. Branch request intent may be pending, but resume based on an alleged handover cannot bypass confirmed claimed-subset receipt. Login/first download/new start/takeover/optimization and native ERP receipt require connectivity. P33–P35 bind only explicitly supported feature payloads, not arbitrary cached POSTs.

For old-phone/revoked access evidence, receipt/review may be allowed without execution authority. Current owner adoption uses correction bounds; if blocked, preserve evidence and show the specific reason. No staff “approve delivery proof” control. A saved local result may continue supported execution, but server-only monitoring explicitly cannot see it. Approximately 24 hours is the future support target, not a deletion countdown or P03 claim.

### Counts, amounts and timing labels

| Designed example | Visible meaning | Misleading label to reject |
| --- | --- | --- |
| Six full deliveries, one failed stop, eleven remaining in an 18-stop scope | تمت معالجة 7 من 18 وقفة؛ تسليم كامل 6؛ متبقي 11 | “7 delivered”; “one returned to warehouse” without accepted receipt |
| Sixteen full deliveries and two failed stops, all 18 processed | تمت معالجة 18 من 18 (100%)؛ تسليم كامل 16 من 18 (88.9%) | “89% route processing”; full success despite two failures |
| Three B2B pieces × EGP100 plus outstanding EGP50 shipping; two delivered | تم تسليم قطعتين؛ المطلوب 250 ج.م؛ قطعة للإرجاع ما زالت معك | Fractional pieces, free-form short payment, retry of rejected partial remainder, stock from return request |
| Phone no-answer with no arrival observation | لا يوجد رد؛ الوصول غير مسجّل؛ مدة الانتقال غير متاحة | Server receipt time as arrival or inferred travel duration |
| Original two-stop forecast, then new admitted work/branch pause | Show original scope/forecast and labelled latest scope/revision plus actual matched attempt observations | Recompute original forecast or label changed workload as unexplained driver lateness |

Money is displayed from integer minor units/currency/exponent; collection is reported by the driver, not settled funds. Keep goods/shipping/unpaid shipping distinct and never sum different currencies. Quantity, shipment, attempt and branch-visit units are separate. A zero denominator shows “لا توجد وقفات” without division/100% success. Use `Africa/Cairo` for display, UTC wire instants and actual date with a cross-midnight workday; clock uncertainty remains visible. Reports/export use the same authorized filters and missing-value semantics.

## Components and overlays

Use [shared components/tokens](../DESIGN.md#component-conventions) and [inspected library APIs](ui-component-research.md). One overlay at a time. Normal flow has no repeated confirmation after save; short choice can be a sheet with its own final action. A long form is a page, preserving the calling context.

| Interaction | Focused surface / fields | Confirm and cancel behavior |
| --- | --- | --- |
| Outcome/refusal/no-answer | One sheet: outcome choice, relevant due/fee choice only | Save once; no-answer needs no count or forced essay. Cancel/back keeps draft, does not resolve attempt. |
| B2B partial | Dedicated page: whole counts per line, exact total, held consequence | Switching from result sheet replaces it; no nested modal. Save once, back restores result draft. |
| Deferral/urgency/retry | One separate sheet per choice; earliest date/time, urgent choice or explicit whole retry | No outcome created by merely opening. Missing earliest time links field; invalid eligibility explains why option is unavailable. |
| End round/end day | Summary plus one focused choice sheet | Show held/current consequences and explicit resolution/pause; one final end action. Not mandatory “confirm” on every normal navigation. |
| Takeover | One sheet from another-device banner | Name existing round/device context and state transfer consequence, one confirm online. Retry uncertain result before another action; cancel returns read-only. |
| Return selection/correction/adoption | Dedicated page | Show actual subset or before/after facts; save once. Awaited confirmation cannot be bypassed by dismissing the page. |
| Search/filter/contact/navigation | Inline control or nonmodal panel | No confirmation. External app opening does not save outcome/movement. |
| Session/update/exit | Inline banner linked to focused recovery sheet if needed | Reauthenticate owning account; unsent queue blocks logout/switch/update with direct sync route. No destructive clear/reload shortcut. |

Preserve focus/reading/scroll order, Arabic accessible names and LTR isolation. Open overlays with focus on meaningful heading/field, trap background, restore on close. Visible causes remain discoverable with keyboard when an action is unavailable. Touch, keyboard, reduced motion and actual portal RTL are mandatory P04 review, not satisfied by library claims.

## Screen coverage

| Required journey / exception | References / additions | Exact action coverage / implementation |
| --- | --- | --- |
| Separate login → daily work | 04 → 05; registration/recovery extensions | A01–A04/A13/A32; P07/P28, P04 presentation fixture |
| B2C intake → pin → preview/manual → online start | 06 mobile +07 →05/01 | A05/A09–A13; P09/P11/P28 |
| ERP prepared → received/admitted → predeparture plan → departed monitoring | 05/06/03; native ERP outside Tawsel | A06–A13/A32/A33; P10/P15/P24/P27/P28/P32 |
| Heading → arrival → full/refused/no-answer → next selection | 01/02 | A14–A19/A38; P16/P17/P29 |
| B2B partial/whole deferral/retry/urgency | 02/05 extended | A17/A20–A22; P17/P18/P30 |
| Driver correction / incompatible evidence | 02/09 extended | A26/A27/A34/A35; P23/P30/P34 |
| Source return request → actual subset → resume/redispatch | 05/08/01 extended + native ERP | A28–A31; P21/P22/P27/P31; full-capacity proof P22 |
| Round/day end/carryover → report/Excel | 08/05 extended | A23/A24/A36/A37; P19/P31/P36/P37 |
| Another phone, local pending, session/storage/update recovery | 04/05/09 extended | A25/A34/A35/A40/A41; P20/P30/P33–P35 |
| Staff coherent/stale monitor, scoped ERP receipt/applied state | 03/09 extended | A32/A33/A42–A46; P24–P27/P32/P38 |

All relevant journeys need loading, empty, missing/invalid, denied, dependency unavailable, pending, rejected/review, stale and confirmed variants. Partial planning, evidence receipt and subset receipt are additional distinct states, not generic success. Long forms and native ERP paths are required extensions, not a nine-screen reproduction exercise.

## Visual acceptance

P04 provides a labelled fixture journey and selected-driver view; P07/P09/P11/P28–P37 replace fixture boundaries with real contracts in their phases. P41 supplies real Android/Chrome and iPhone/Safari/owner pilot evidence. No P03 document check establishes browser usability, database atomicity, storage durability, real map coverage or business execution.

Review gates: recognizable navy/blue/light Cairo family, no device-frame clipping, full recipient/phone access, one dominant stage action and discoverable recovery, explicit current/next, no silent stale/pending success, coherent map/list selection, no unsupported prototype controls. Capture actual screenshots and interaction findings for every viewport and exception below. Record owner feedback with date and exact wording/observed difficulty; no approval from silence.

The P04 reviewer must identify purpose, next action and blocker/waiting without implementer narration in ready, active, missing-pin, pending and rejected states. Record the first chosen action, any misunderstanding and unnecessary backtracking/confirmation. Wrong inferred movement, wrong accepted state, inaccessible contact/recovery, clipped main control or duplicate primary choices is a defect even if the screenshot looks similar. Revise shared patterns before broad UI work; do not invent a numeric usability benchmark or mark a walkthrough approved merely because the implementer can explain it.

### Viewports and review procedure

| Review size / mode | Required check | Evidence to capture in P04+ |
| --- | --- | --- |
| 360×800 CSS px | Daily/current/result and missing pin at narrow mobile width; full Arabic name and phone, no horizontal page scroll, contact/main controls reachable | Screenshot for each stage plus tap/focus/back sequence; sticky footer does not cover last field or navigation |
| 390×844 CSS px | Same driver path, partial/no-answer and another-device/pending/rejected variants | Screenshots plus cancelled result draft restored, explicit heading and arrival preserved |
| 1366×768 CSS px | Selected-driver monitoring/list/map and preparation; departed state read-only, no missing lower controls | Screenshot of selected context, keyboard driver selection, stale recovery and scroll/focus findings |
| 1440×900 CSS px | Same desktop views and longer report/location columns | Screenshot of map/list correspondence, source/confirmed pin hierarchy and coherent denominators |
| 200% browser zoom / enlarged OS text | All four representative layouts; button labels wrap, fields grow, rails collapse | Screenshot/notes for occlusion, focus visibility, scrolling and dialogs |
| 400% zoom / 320 CSS px reflow | Reading/controls remain in one column; map or data table can have its own labelled scroll area but page actions do not require two-axis scrolling | Record exact browser/effective viewport and any necessary table/map exception |
| Long Arabic / mixed text | Name “المهندس حسام الدين عبد الرحمن محمد عبد الله وشركاؤه لاستلام الطلبات”; address with floor/apartment/instruction across four lines; isolated synthetic phone `+20 10 0000 0000`, ID `TR-2026-0000000000123` | Full text accessible without hover; contact row wraps; copied/dialed value not reversed; Arabic diacritics unclipped |
| Safe areas / keyboard / landscape | Top/bottom/side insets on real phones; keyboard over amount/search; overlay can scroll; footer returns to flow if needed | Emulation labelled separately from real Android/Chrome and iPhone/Safari P41 evidence; no claim from desktop screenshot alone |
| Keyboard / reduced motion / assistive tech | Tab/Shift+Tab, RTL arrows/Home/End, Escape/back, return focus, labelled status; reduce removes motion without delay | Exact browser/OS/mode and observed focus sequence; no swallowed key or inaccessible pin confirmation |

Paper demo: `python scripts/check-ui-spec.py demo` reads J01–J07 and the blocker/pending/rejection cases from this document and checks source/action/copy coverage. It does not render a UI or execute any operation. To reproduce the design review, open DESIGN.md, then the linked original images and these cases; identify main action/blocker at each J stage, branch at S01/S07/S09/S13/S14, and compare the intended card structure with references. The normal path adds explicit start/heading/arrival/outcome and a single result save, with no repeated confirmation. Record any narration needed in P04's future `docs/ui-review.md` rather than retrospectively approving this paper walkthrough.

### Six Phase 03 acceptance scenarios

| Scenario | Specification evidence / result in this phase | Remaining evidence |
| --- | --- | --- |
| Unsupported prototype feature | Reference audit classifies every exported control and unsupported GPS/call/barcode/settlement/demo claim; surrounding navy/Cairo/card/map language retained in DESIGN.md | Actual removal/render verification P04 and owning UI phases |
| Return/correction absent in exports | A26–A31 + dedicated route/overlay rules cover bounded correction and source-branch subset flow | Real contract/transaction/UI P21–P23/P27/P30/P31 |
| Missing-pin disabled action | S01 names cause, direct pin review and return path; other valid work remains plannable | P04 fixture behavior, real pin/API P11/P28 |
| Short decision needs separation | Result/defer/urgency/takeover sheets; no nesting or repeated confirmation; cancel retains draft | P04 interaction/focus evidence |
| Long Arabic name and LTR phone | Typography/isolated contact/touch/wrap rules plus all viewport cases | P04 screenshots/keyboard; P41 real device |
| No owner review yet | Status explicitly specified and owner review pending in all phase evidence | Actual owner feedback, never inferred from silence |

## P11 implemented focused location review

/locations?kind=company is the scoped first-50 review list; /locations/:taskId?kind=personal|company is the focused original-address/candidate/pin page. Personal task cards and account screens link into it. Shared MapLibre picker keeps numeric and keyboard center selection available; explicit confirmation is the sole dominant action. Search empty/error and tile failure preserve address/current pin. Arabic provenance labels replace prototype match percentages/GPS/StreetView. [Runtime/browser evidence](phase-11-evidence.md); physical-device and owner review remain pending.

## Phase 30 connected surfaces

As-built navigation uses the current page's contextual task options for a full-width partial page or single refusal sheet, `/execution/options` for selected-task scheduling/pin/history, and `/execution/correction` for bounded comparison. Query parameters identify kind/round/task/attempt; server reads enforce ownership and scope. Original/effective result cards and neutral proposed amounts remain separate. Cancellation retains session drafts without commands; uncertain requests retain exact identities; receipt/day denial retains input and review evidence. This implements the proposed focused surfaces without adding branch/closure UI. [Interaction and render findings](phase-30-evidence.md).

## Phase 31 connected branch and closure surfaces

`/execution/branch` is company-only: source/item offer → explicit claimed subset and heading pause → branch arrival → server confirmation → same-round resume. The current page shows branch activity instead of customer actions during interruption. Display the complete paused sequence and requested/received/unresolved/lost/damaged portions. Native ERP owns receipt; unavailable confirmation leaves resume disabled. One active stage action is dominant.

`/execution/closure` reviews basic accepted outcomes, reported collection and held work, then distinct round/day consequences. Explicit heading pause, actionable arrived/branch blockers, owner generation/token and exact uncertain-action recovery are required. Between-round day end uses the retained activity revision. Workday URL survives accepted closure/reload; daily continuation uses original held tasks. B2C has no piece/branch/receiver content. Known in-session pending execution also blocks a fresh start. [Interaction/render evidence](phase-31-evidence.md).
