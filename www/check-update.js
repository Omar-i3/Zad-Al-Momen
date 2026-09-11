/* ==========================================================================
   🌙 زاد المؤمن — محرك التحديثات وبنر تثبيت تطبيق الويب التقدمي PWA
   المؤلف: عمر
   الوظيفة:
   1. إظهار بنر تثبيت PWA الذكي لجميع الأجهزة (آيفون، أندرويد، وغيرها)
   2. استبعاد الظهور نهائياً في حال إغلاق المستخدم للبنر (بزر ✕) بجميع الصفحات
   3. استبعاد الظهور في حال كان التطبيق مثبتاً أو يعمل في وضع Standalone
   ========================================================================== */

const CURRENT_APP_VERSION = '1.3.0';
const VERSION_CHECK_URL = 'version.json';

// متغير التقاط طلب التثبيت التلقائي لمتصفحات Chrome / Edge / Android
let deferredPwaPrompt = null;

// التقاط حدث التثبيت القياسي
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPwaPrompt = e;
  // إظهار البنر فور توفر فرصة التثبيت
  setTimeout(() => {
    initPwaInstallBanner();
  }, 1000);
});

// فحص أجهزة iOS والمتصفحات الأخرى بعد تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    initPwaInstallBanner();
    checkForAppUpdates();
  }, 2500);
});

/* ==========================================================================
   📱 فحص البيئة ونظام التشغيل
   ========================================================================== */
function isIOSDevice() {
  const ua = navigator.userAgent || navigator.vendor || window.opera || '';
  return /iphone|ipad|ipod/i.test(ua) && !window.MSStream;
}

function isRunningStandalone() {
  // 1. فحص وضع الـ Standalone للمتصفحات (PWA مثبت)
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  if (window.navigator.standalone === true) return true;

  // 2. فحص كائن كاباسيتور
  if (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) return true;
  if (window.Capacitor && window.Capacitor.getPlatform && window.Capacitor.getPlatform() !== 'web') return true;

  // 3. فحص البروتوكول المحلي
  if (window.location.protocol === 'capacitor:' || window.location.protocol === 'file:') return true;
  if (window.location.hostname === 'localhost' && !window.location.port) return true;

  // 4. علامات الـ WebView المدمج
  const ua = navigator.userAgent || '';
  if (/\bwv\b/.test(ua)) return true;

  return false;
}

function isPwaBannerDismissedPermanently() {
  try {
    return localStorage.getItem('zad_pwa_banner_dismissed_permanently') === 'true';
  } catch (e) {
    return false;
  }
}

/* ==========================================================================
   ❌ إغلاق البنر نهائياً بجميع الصفحات عند الضغط على ✕
   ========================================================================== */
function permanentlyDismissPwaBanner() {
  const banner = document.getElementById('zad-pwa-install-banner');
  if (banner) {
    banner.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    banner.style.opacity = '0';
    banner.style.transform = 'translateY(30px)';
    setTimeout(() => banner.remove(), 300);
  }

  try {
    // تخزين دائم: لن يظهر مجدداً في أي صفحة من صفحات الموقع
    localStorage.setItem('zad_pwa_banner_dismissed_permanently', 'true');
  } catch (e) {}
}

// إتاحة الدالة للنطاق العام
window.permanentlyDismissPwaBanner = permanentlyDismissPwaBanner;
window.closeAppInstallBanner = permanentlyDismissPwaBanner; // توافق مع الأزرار القديمة

/* ==========================================================================
   🎨 إنشاء وإظهار بنر تثبيت PWA الذكي
   ========================================================================== */
function initPwaInstallBanner() {
  // 1. عدم الإظهار إذا كان المستخدم قد أغلق البنر سابقاً بـ ✕
  if (isPwaBannerDismissedPermanently()) return;

  // 2. عدم الإظهار إذا كان التطبيق مثبتاً ويعمل كـ PWA أو تطبيق أصلي
  if (isRunningStandalone()) return;

  // 3. عدم تكرار إنشاء البنر
  if (document.getElementById('zad-pwa-install-banner')) return;

  const isIOS = isIOSDevice();

  const banner = document.createElement('div');
  banner.id = 'zad-pwa-install-banner';
  banner.style.cssText = `
    position: fixed;
    bottom: 82px;
    left: 12px;
    right: 12px;
    max-width: 440px;
    margin: 0 auto;
    background: linear-gradient(135deg, rgba(15, 23, 48, 0.96), rgba(20, 29, 61, 0.98));
    border: 1px solid rgba(214, 168, 92, 0.55);
    border-radius: 20px;
    padding: 14px 16px;
    color: #f3efe3;
    display: flex;
    flex-direction: column;
    gap: 10px;
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.7), 0 0 24px rgba(214, 168, 92, 0.2);
    z-index: 999998;
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    font-family: 'Tajawal', sans-serif;
    direction: rtl;
    animation: slideUpPwaPrompt 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  `;

  // محتوى مخصص حسب نوع الجهاز (آيفون أو أندرويد/كمبيوتر)
  if (isIOS) {
    banner.innerHTML = `
      <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <img src="icon-192.png" alt="شعار زاد المؤمن" style="width: 44px; height: 44px; border-radius: 12px; object-fit: cover; flex-shrink: 0; box-shadow: 0 4px 14px rgba(0,0,0,0.35); border: 1px solid rgba(214,168,92,0.45);">
          <div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-weight: 800; font-size: 0.96rem; color: #ffd700;">تثبيت تطبيق زاد المؤمن</span>
              <span style="background: rgba(46, 196, 182, 0.18); color: #5fd6c4; border: 1px solid rgba(95, 214, 196, 0.45); font-size: 0.65rem; font-weight: bold; padding: 2px 6px; border-radius: 6px;">iOS</span>
            </div>
            <div style="font-size: 0.76rem; color: #9bb0d8; margin-top: 2px; line-height: 1.35;">
              تطبيق خفيف وسريع بدون استهلاك مساحة الذاكرة
            </div>
          </div>
        </div>
        <button type="button" onclick="permanentlyDismissPwaBanner()" style="background: none; border: none; color: #94a3b8; font-size: 1.25rem; cursor: pointer; padding: 2px 6px; line-height: 1;" aria-label="إغلاق نهائي">✕</button>
      </div>

      <!-- إرشادات الآيفون السريعة -->
      <div style="background: rgba(214, 168, 92, 0.1); border-right: 3px solid #d6a85c; padding: 9px 12px; border-radius: 10px; font-size: 0.78rem; color: #f5e4bd; line-height: 1.55;">
        <span>📲 <strong>لتثبيت التطبيق على الآيفون:</strong> اضغط على زر المشاركة بالأسفل <strong>(⬆️)</strong> ثم اختر <strong>[إضافة إلى الشاشة الرئيسية ➕]</strong> ليعمل معك كتطبيق كامل.</span>
      </div>
    `;
  } else {
    // أجهزة الأندرويد والكمبيوتر
    banner.innerHTML = `
      <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <img src="icon-192.png" alt="شعار زاد المؤمن" style="width: 44px; height: 44px; border-radius: 12px; object-fit: cover; flex-shrink: 0; box-shadow: 0 4px 14px rgba(0,0,0,0.35); border: 1px solid rgba(214,168,92,0.45);">
          <div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-weight: 800; font-size: 0.96rem; color: #ffd700;">تثبيت تطبيق زاد المؤمن</span>
              <span style="background: rgba(46, 196, 182, 0.18); color: #5fd6c4; border: 1px solid rgba(95, 214, 196, 0.45); font-size: 0.65rem; font-weight: bold; padding: 2px 6px; border-radius: 6px;">PWA</span>
            </div>
            <div style="font-size: 0.76rem; color: #9bb0d8; margin-top: 2px; line-height: 1.35;">
              تثبيت فوري وسريع ولا يستهلك أي مساحة من هاتفك
            </div>
          </div>
        </div>
        <button type="button" onclick="permanentlyDismissPwaBanner()" style="background: none; border: none; color: #94a3b8; font-size: 1.25rem; cursor: pointer; padding: 2px 6px; line-height: 1;" aria-label="إغلاق نهائي">✕</button>
      </div>

      <div style="display: flex; align-items: center; gap: 8px; margin-top: 2px;">
        <button type="button" onclick="handlePwaInstallClick()" style="flex: 1; background: linear-gradient(135deg, #d6a85c, #b9803a); color: #1a1200; font-weight: 800; padding: 9px 14px; border: none; border-radius: 12px; font-size: 0.88rem; text-align: center; display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; box-shadow: 0 4px 14px rgba(214,168,92,0.35); font-family: 'Tajawal', sans-serif;">
          <span>تثبيت التطبيق الآن</span>
          <span style="font-size: 1.05rem;">📲</span>
        </button>
        <button type="button" onclick="permanentlyDismissPwaBanner()" style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.14); color: #cbd5e1; font-weight: 600; padding: 9px 14px; border-radius: 12px; font-size: 0.8rem; cursor: pointer; white-space: nowrap; font-family: 'Tajawal', sans-serif;">
          لا شكراً
        </button>
      </div>
    `;
  }

  document.body.appendChild(banner);
}

/* ==========================================================================
   ⚡ معالجة زر التثبيت في أندرويد / كروم
   ========================================================================== */
async function handlePwaInstallClick() {
  if (deferredPwaPrompt) {
    deferredPwaPrompt.prompt();
    const { outcome } = await deferredPwaPrompt.userChoice;
    deferredPwaPrompt = null;
    if (outcome === 'accepted') {
      permanentlyDismissPwaBanner();
    }
  } else {
    // في حال عدم توفر prompt مباشر يتم إرشاد المستخدم
    alert('📲 لتثبيت التطبيق: اضغط على قائمة خيارات المتصفح (⋮) بالأعلى ثم اختر "تثبيت التطبيق" أو "إضافة إلى الشاشة الرئيسية".');
    permanentlyDismissPwaBanner();
  }
}

window.handlePwaInstallClick = handlePwaInstallClick;

/* ==========================================================================
   🔄 فحص التحديثات العامة
   ========================================================================== */
async function checkForAppUpdates() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(reg => {
      reg.update().catch(err => console.log('SW Check Silent:', err));
    });
  }

  try {
    const response = await fetch(VERSION_CHECK_URL, { cache: 'no-store' });
    if (!response.ok) return;

    const data = await response.json();
    if (data && data.version && isNewerVersion(data.version, CURRENT_APP_VERSION)) {
      showUpdateBanner(data.version);
    }
  } catch (e) {
    // وضع عدم الاتصال
  }
}

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

function showUpdateBanner(newVersion) {
  if (document.getElementById('update-banner')) return;

  const banner = document.createElement('div');
  banner.id = 'update-banner';
  banner.style.cssText = `
    position: fixed;
    bottom: 84px;
    left: 14px;
    right: 14px;
    max-width: 460px;
    margin: 0 auto;
    background: linear-gradient(135deg, #0f1730, #1e294b);
    border: 1px solid var(--gold-soft, #d6a85c);
    border-radius: 18px;
    padding: 12px 16px;
    color: #f3efe3;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    box-shadow: 0 12px 36px rgba(0,0,0,0.6);
    z-index: 999999;
    font-family: 'Tajawal', sans-serif;
    direction: rtl;
  `;

  banner.innerHTML = `
    <div style="display: flex; align-items: center; gap: 10px;">
      <span style="font-size: 1.3rem;">✨</span>
      <div>
        <div style="font-weight: 700; font-size: 0.9rem; color: #f0d9a8;">تحديث جديد متوفر (${newVersion})</div>
        <div style="font-size: 0.74rem; color: #93a0c2;">يتوفر إصدار أحدث لموقع وتطبيق زاد المؤمن.</div>
      </div>
    </div>
    <div style="display: flex; gap: 8px; align-items: center;">
      <button type="button" onclick="window.location.reload(true)" style="background: linear-gradient(135deg, #d6a85c, #b9803a); color: #1a1200; font-weight: 700; padding: 7px 14px; border: none; border-radius: 10px; cursor: pointer; font-size: 0.82rem; font-family: 'Tajawal', sans-serif;">تحديث 🔄</button>
      <button type="button" onclick="document.getElementById('update-banner').remove()" style="background: none; border: none; color: #93a0c2; font-size: 1.1rem; cursor: pointer; padding: 0 4px;">✕</button>
    </div>
  `;

  document.body.appendChild(banner);
}