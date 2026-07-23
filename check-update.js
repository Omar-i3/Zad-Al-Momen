// رقم إصدار النسخة المثبتة على جوال المستخدم حالياً
const CURRENT_APP_VERSION = "1.0.0";

async function checkForAppUpdates() {
    try {
        // جلب ملف الإصدار من السيرفر/GitHub مع منع التخزين المؤقت (Cache)
        const response = await fetch('version.json?v=' + new Date().getTime());
        const data = await response.json();

        // مقارنة إصدار السيرفر مع الإصدار الحالي للجوال
        if (data.version && data.version !== CURRENT_APP_VERSION) {
            showUpdatePopup(data.version, data.apk_url, data.changelog);
        }
    } catch (error) {
        console.log("تعذر التحقق من التحديثات:", error);
    }
}

// عرض بنر التحديث العائم
function showUpdatePopup(newVersion, apkUrl, changelog) {
    if (document.getElementById('update-banner')) return;

    const banner = document.createElement('div');
    banner.id = 'update-banner';
    banner.innerHTML = `
        <div style="position: fixed; bottom: 25px; left: 50%; transform: translateX(-50%); background: #1e293b; color: #fff; padding: 14px 18px; border-radius: 14px; box-shadow: 0 10px 30px rgba(0,0,0,0.4); z-index: 999999; display: flex; align-items: center; gap: 12px; direction: rtl; font-family: system-ui, sans-serif; max-width: 90%; width: 420px; border: 1px solid #334155;">
            <div style="font-size: 26px;">🚀</div>
            <div style="flex: 1;">
                <strong style="display:block; font-size: 14px; color: #38bdf8;">تحديث جديد متوفر (v${newVersion})</strong>
                <span style="font-size: 12px; color: #94a3b8;">${changelog || 'تحسينات جديدة وتحديثات أداء'}</span>
            </div>
            <a href="${apkUrl}" download style="background: #0ea5e9; color: white; text-decoration: none; padding: 8px 14px; border-radius: 8px; font-size: 13px; font-weight: bold; white-space: nowrap;">تحديث الآن</a>
            <button onclick="document.getElementById('update-banner').remove()" style="background: transparent; border: none; color: #64748b; font-size: 18px; cursor: pointer; padding: 0 4px;">✕</button>
        </div>
    `;
    document.body.appendChild(banner);
}

// تشغيل الفحص فور فتح الصفحة/التطبيق
window.addEventListener('DOMContentLoaded', checkForAppUpdates);