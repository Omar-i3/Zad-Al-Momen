/* ==========================================================================
   🌙 زاد المؤمن — محرك فحص التحديثات التلقائية (check-update.js)
   المؤلف: عمر
   الوظيفة: التحقق من وجود إصدار جديد للتطبيق وإشعار المستخدم
   ========================================================================== */

const CURRENT_APP_VERSION = '1.2.0';

// يمكنك استبدال هذا الرابط لاحقاً برابط ملف version.json على GitHub الخاص بك
const VERSION_CHECK_URL = 'https://raw.githubusercontent.com/username/repo/main/version.json';

document.addEventListener('DOMContentLoaded', () => {
  // فحص التحديثات بعد 3 ثوانٍ من فتح التطبيق لعدم إبطاء واجهة المستخدم
  setTimeout(() => {
    checkForAppUpdates();
  }, 3000);
});

async function checkForAppUpdates() {
  // 1. فحص تحديثات الـ Service Worker (خاص بمتصفحات الويب والتطبيقات المنسخة)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(registration => {
      registration.update().catch(err => console.log('SW Check Silent:', err));
    });
  }

  // 2. فحص ملف الإصدار التلقائي من السيرفر أو GitHub
  try {
    const response = await fetch(VERSION_CHECK_URL, { cache: 'no-store' });
    if (!response.ok) return;

    const data = await response.json();

    if (data && data.version && isNewerVersion(data.version, CURRENT_APP_VERSION)) {
      showUpdateBanner(data.version, data.downloadUrl || '#');
    }
  } catch (e) {
    // في حال عدم توفر اتصال بالإنترنت أو عدم رفع الملف بعد، يتم التجاوز بهدوء
    console.log('فاحص التحديثات يعمل في الوضع المحلي.');
  }
}

// دالة مقارنة أرقام الإصدارات (مثال: 1.0.1 أحدث من 1.0.0)
function isNewerVersion(latest, current) {
  const v1 = latest.split('.').map(Number);
  const v2 = current.split('.').map(Number);

  for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
    const num1 = v1[i] || 0;
    const num2 = v2[i] || 0;
    if (num1 > num2) return true;
    if (num1 < num2) return false;
  }
  return false;
}

// إظهار بانر عائم أنيق يخبر المستخدم بتوفر تحديث جديد
function showUpdateBanner(newVersion, downloadUrl) {
  if (document.getElementById('update-banner')) return;

  const banner = document.createElement('div');
  banner.id = 'update-banner';
  banner.style.cssText = `
    position: fixed;
    bottom: 85px;
    left: 16px;
    right: 16px;
    max-width: 480px;
    margin: 0 auto;
    background: linear-gradient(135deg, #0f1730, #1e294b);
    border: 1px solid var(--gold-soft, #d6a85c);
    border-radius: 16px;
    padding: 12px 16px;
    color: #f3efe3;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    z-index: 999999;
    font-family: 'Tajawal', sans-serif;
  `;

  banner.innerHTML = `
    <div style="display: flex; align-items: center; gap: 10px;">
      <span style="font-size: 1.3rem;">✨</span>
      <div>
        <div style="font-weight: 700; font-size: 0.9rem; color: #f0d9a8;">تحديث جديد متوفر (${newVersion})</div>
        <div style="font-size: 0.75rem; color: #93a0c2;">يتوفر إصدار أحدث يحتوي على تحسينات إضافية.</div>
      </div>
    </div>
    <div style="display: flex; gap: 8px; align-items: center;">
      <a href="${downloadUrl}" target="_blank" style="background: linear-gradient(135deg, #d6a85c, #b9803a); color: #1a1200; font-weight: 700; padding: 6px 12px; border-radius: 10px; text-decoration: none; font-size: 0.8rem;">تحديث</a>
      <button type="button" onclick="document.getElementById('update-banner').remove()" style="background: none; border: none; color: #93a0c2; font-size: 1.1rem; cursor: pointer; padding: 0 4px;">✕</button>
    </div>
  `;

  document.body.appendChild(banner);
}