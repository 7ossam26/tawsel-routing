export function RecoveryLimits({ kind }: { kind: 'company' | 'personal' }) {
  return <details className="recovery-limits"><summary>الهاتف والتخزين</summary>
    <p>عند فقد الهاتف أو مسح التخزين، يمكن استعادة ما وصل للخادم فقط. العمل الذي لم يصل قد يُفقد ولا يمكن إعادة بنائه.</p>
    <p>نستهدف يوم عمل تقريبًا دون اتصال. هذا هدف للتحقق، وليس ضمانًا ضد فقد الهاتف أو إخلاء المتصفح للتخزين. لا نحذف الإجراءات بعد ٢٤ ساعة.</p>
    <a className="edit-link" href={'/rounds/current?kind=' + kind}>فتح الجولة الحالية</a><a className="edit-link" href={'/sync?kind=' + kind}>الأدلة التي استلمها الخادم</a>
  </details>;
}
