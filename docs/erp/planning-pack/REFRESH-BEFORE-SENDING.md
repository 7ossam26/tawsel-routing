# Local Codex task — refresh the ERP planning attachments

Copy the following into Codex in the Tawsel repository when preparing the completed project's files for the new ERP planning chat. This file is for the owner; do not attach it to that chat.

--- START PROMPT ---

أنا انتهيت من Tawsel وعايز أحدث حزمة ملفات تخطيط الـERP قبل إرسالها لشات ChatGPT جديد. اشتغل على `docs/erp/planning-pack/` فقط ومع أداة تجهيزها عند الحاجة. الهدف حزمة تطابق المشروع وقت الإرسال، مع الحفاظ على `00-START-ERP-PLANNING-PROMPT.md` بصيغة أن Tawsel نظام قائم مكتمل، والشات سيخطط للـERP بالأسئلة ثم master plan ثم مراحل Codex.

اقرأ AGENTS.md إن وجد، وحالة Git، وmanifest الحزمة الحالية. قارن source hashes/commit بالحالة الحالية. راجع العقود العامة والفروقات المؤثرة في docs/erp، التسليم النهائي المتاح، الهوية والصلاحيات، intake/returns/redispatch، sender/receiver/source protocols، monitoring/reporting، وإثباتات التكامل. وجود عنوان أو ملف لا يثبت توافقه.

حدّث 01–03 و07 بحيث تشرح السلوك النهائي الحالي، لا تراكم تاريخ المراحل. حافظ على حدود ERP/Tawsel، actor/service separation، الأرقام والأموال والمرتجعات، idempotency/outbox/inbox/replay/reconciliation، والـUX البسيط وسجل القرارات والتحديثات. لو المراجعة تكشف تعارض عقد فعلي، وضحه لي محليًا؛ لا تغير العقد أو تخترع API أو نجاح اختبار لتخفيه. هذا لا يتطلب إعادة تنفيذ المشروع أو إعادة فتح مراحل من غير سبب.

شغّل `node scripts/contracts.mjs check`، ثم `node scripts/build-erp-planning-pack.mjs`. الأداة تستخرج 04–06 من الأصل وتنتج manifest وZIP؛ لا تستبدل المراجعة الدلالية المطلوبة منك. تحقق من كل بلوك أصلي وhash ومرجع schema، ومن أن فهرس العمليات يفصل ERP service / operator / human / consumer host. وثق checks التي شغلتها بالفعل وحدود غير المشغل.

لو تغيرت حزمة الملفات أو ترتيبها، حدّث README والـprompt بأسمائها الصحيحة. لا ترسل تاريخ المراحل أو TODOs قديمة إلى الشات الجديد. سلّمني روابط الـprompt والمرفقات السبعة وZIP المحدثة. لا commit/push/deploy أو تغير أي بيانات تشغيل لمجرد تجهيز هذه الحزمة.

--- END PROMPT ---
