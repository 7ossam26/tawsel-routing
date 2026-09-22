document.addEventListener('DOMContentLoaded', () => {
  const appOrigin = '__TAWSEL_APP_ORIGIN__'; // Filled only by trusted local setup.
  if (location.pathname.includes('/login-actions/action-token') && !document.querySelector('form')) {
    const content = document.getElementById('kc-content');
    if (content) {
      const retry = document.createElement('a');
      retry.href = `${appOrigin}/recover?kind=${location.pathname.includes('/tawsel-personal/') ? 'personal' : 'company'}`;
      retry.textContent = 'العودة لتوصيل واستعادة الحساب';
      retry.id = 'tawsel-recovery-return';
      content.append(retry);
    }
  }
  if (new URLSearchParams(location.search).get('tawsel_recovery') === '1') {
    const recovery = document.querySelector('a[href*="/login-actions/reset-credentials"]');
    if (recovery) { location.replace(recovery.href); return; }
  }
  const personal = location.pathname.includes('/tawsel-personal/');
  const username = document.getElementById('username');
  const reset = Boolean(document.getElementById('kc-reset-password-form'));
  if (personal) {
    const heading = document.getElementById('kc-page-title');
    const purpose = document.createElement('p');
    purpose.id = 'tawsel-purpose';
    purpose.textContent = reset ? 'أدخل بريد الاستعادة. إذا كانت البيانات مطابقة سنرسل رابطًا. يبقى تسجيل الدخول برقم الهاتف.' : 'حسابك المستقل: الدخول برقم الهاتف وكلمة المرور. البريد للتفعيل والاستعادة فقط؛ الهاتف غير موثّق برسالة نصية.';
    heading?.after(purpose);
    if (username && reset) {
      document.querySelector('label[for="username"]')?.replaceChildren(document.createTextNode('البريد الإلكتروني للاستعادة'));
      username.type = 'email';
      username.autocomplete = 'email';
    }
    if (username && !reset) {
      document.querySelector('label[for="username"]')?.replaceChildren(document.createTextNode('رقم الهاتف'));
      // Keycloak carries the recovery identifier back to login. Do not show an
      // email under the phone label; email remains recovery-only.
      if (username.value.includes('@')) username.value = '';
      username.inputMode = 'tel';
      username.addEventListener('change', () => {
        let phone = username.value.trim().replace(/[٠-٩]/g, c => String(c.charCodeAt(0) - 1632)).replace(/[۰-۹]/g, c => String(c.charCodeAt(0) - 1776)).replace(/[\s()-]/g, '');
        if (/^01\d{9}$/.test(phone)) phone = '+2' + phone;
        if (phone.startsWith('00')) phone = '+' + phone.slice(2);
        username.value = phone;
      });
    }
  }
});
