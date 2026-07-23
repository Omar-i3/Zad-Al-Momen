// =========================================================
// 📍 الإعدادات الإحداثية الافتراضية (مدينة جدة)
// =========================================================
const DEFAULT_LAT = 21.5433;
const DEFAULT_LNG = 39.1728;

// =========================================================
// 📿 قائمة الأذكار المخصصة للودجت
// =========================================================
const WIDGET_AZKAR = [
    { title: "☀️ أذكار الصباح", text: "أصبحنا وأصبح الملك لله، والحمد لله، لا إله إلا الله وحده لا شريك له." },
    { title: "🌙 أذكار المساء", text: "أمسينا وأمسى الملك لله، والحمد لله، أعوذ بكلمات الله التامات من شر ما خلق." },
    { title: "💎 كنز من كنوز الجنة", text: "لا حول ولا قوة إلا بالله العلي العظيم." },
    { title: "⚖️ ثقيلتان في الميزان", text: "سبحان الله وبحمده، سبحان الله العظيم." },
    { title: "🛡️ حرز وحماية", text: "بسم الله الذي لا يضر مع اسمه شيء في الأرض ولا في السماء وهو السميع العليم." },
    { title: "🌿 استغفار وتوبة", text: "أستغفر الله العظيم الذي لا إله إلا هو الحي القيوم وأتوب إليه." },
    { title: "🕌 الصلاة على النبي", text: "اللهم صلِّ وسلم وبارك على نبينا محمد." },
    { title: "✨ دعاء الكرب", text: "لا إله إلا أنت سبحانك إني كنت من الظالمين." }
];

// =========================================================
// 1. تشغيل النظام والساعة والتنبيهات
// =========================================================
async function initNotifications() {
    startMakkahClock();
    displayHijriDateFallback();

    if ('Notification' in window && Notification.permission === 'default') {
        try {
            await Notification.requestPermission();
        } catch (e) {
            console.log('طلب إذن الإشعارات لم يكتمل:', e);
        }
    }

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                fetchPrayerTimes(position.coords.latitude, position.coords.longitude);
            },
            (error) => {
                console.warn("تعذر تحديد الموقع الجغرافي، جاري استخدام التوقيت الافتراضي لجدة");
                fetchPrayerTimes(DEFAULT_LAT, DEFAULT_LNG);
            },
            { timeout: 5000 }
        );
    } else {
        fetchPrayerTimes(DEFAULT_LAT, DEFAULT_LNG);
    }
}

// =========================================================
// 2. ساعة حية لتوقيت مكة المكرمة
// =========================================================
function startMakkahClock() {
    function updateClock() {
        const now = new Date();
        const timeOptions = {
            timeZone: 'Asia/Riyadh',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        };
        const timeStr = now.toLocaleTimeString('ar-SA', timeOptions);
        const textStr = `🕋 مكة: ${timeStr}`;

        const elemBody = document.getElementById('makkah-time-text');
        const elemHeader = document.getElementById('app-makkah-clock');

        if (elemBody) elemBody.innerText = textStr;
        if (elemHeader) elemHeader.innerText = textStr;
    }
    updateClock();
    setInterval(updateClock, 1000);
}

// =========================================================
// 3. جلب مواقيت الصلاة والتاريخ الهجري والودجت
// =========================================================
async function fetchPrayerTimes(lat, lng) {
    try {
        const response = await fetch(`https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lng}&method=4&school=0`);
        const data = await response.json();
        const timings = data.data.timings;
        const dateData = data.data.date;

        let hijriText = "";

        if (dateData && dateData.hijri) {
            const h = dateData.hijri;
            hijriText = `📅 ${h.weekday.ar}، ${h.day} ${h.month.ar} ${h.year} هـ`;
            
            const elemBody = document.getElementById('hijri-date-text');
            const elemHeader = document.getElementById('app-hijri-date');

            if (elemBody) elemBody.innerText = hijriText;
            if (elemHeader) elemHeader.innerText = hijriText;
        }

        renderPrayerTimesUI(timings);
        updateCelestialVisuals(timings);
        scheduleAllNotifications(timings);
        updateWidgetStorage(timings, hijriText);

    } catch (err) {
        console.error("خطأ في جلب مواقيت الصلاة:", err);
        const loadingElem = document.getElementById('prayer-loading');
        if (loadingElem) loadingElem.innerText = "تعذر جلب مواقيت الصلاة حالياً";
    }
}

// =========================================================
// 4. تقويم هجري احتياطي محلي
// =========================================================
function displayHijriDateFallback() {
    try {
        const today = new Date();
        const formatter = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        const hijriFormatted = `📅 ${formatter.format(today)} هـ`;
        
        const elemBody = document.getElementById('hijri-date-text');
        const elemHeader = document.getElementById('app-hijri-date');

        if (elemBody && (!elemBody.innerText || elemBody.innerText.includes('جاري'))) elemBody.innerText = hijriFormatted;
        if (elemHeader && (!elemHeader.innerText || elemHeader.innerText.includes('جاري'))) elemHeader.innerText = hijriFormatted;
    } catch (e) {
        console.log("استخدام التوقيت الهجري من السيرفر فقط");
    }
}

// =========================================================
// 5. رسم مواقيت الصلاة بصرياً على الشاشة
// =========================================================
function renderPrayerTimesUI(timings) {
    const loadingElem = document.getElementById('prayer-loading');
    const gridElem = document.getElementById('prayer-grid');

    if (!gridElem) return;

    const prayers = [
        { name: "الفجر", time: timings.Fajr },
        { name: "الشروق", time: timings.Sunrise },
        { name: "الظهر", time: timings.Dhuhr },
        { name: "العصر", time: timings.Asr },
        { name: "المغرب", time: timings.Maghrib },
        { name: "العشاء", time: timings.Isha }
    ];

    gridElem.innerHTML = prayers.map(p => `
        <div style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 12px; border: 1px solid rgba(214,168,92,0.2); text-align: center;">
            <div style="font-size: 0.8rem; color: #93a0c2; margin-bottom: 4px; font-weight: 500;">${p.name}</div>
            <div style="font-size: 1.05rem; font-weight: bold; color: #f0d9a8; font-family: monospace;">${formatTime12(p.time)}</div>
        </div>
    `).join('');

    if (loadingElem) loadingElem.style.display = 'none';
    gridElem.style.display = 'grid';
}

function formatTime12(time24) {
    if (!time24) return "--:--";
    let [hours, minutes] = time24.split(':').map(Number);
    let period = hours >= 12 ? 'م' : 'ص';
    hours = hours % 12 || 12;
    return `${hours}:${minutes < 10 ? '0' : ''}${minutes} ${period}`;
}

// =========================================================
// ☀️/🌅/🌙 6. تحويل شكل الشمس والقمر تلقائياً
// =========================================================
function updateCelestialVisuals(timings) {
    const celestialElem = document.querySelector('.moon');
    if (!celestialElem) return;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const parseMinutes = (timeStr) => {
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m;
    };

    const sunrise = parseMinutes(timings.Sunrise);
    const asr = parseMinutes(timings.Asr);
    const maghrib = parseMinutes(timings.Maghrib);

    if (currentMinutes >= sunrise && currentMinutes < asr) {
        celestialElem.className = 'moon state-sun-day';
    } else if (currentMinutes >= asr && currentMinutes < maghrib) {
        celestialElem.className = 'moon state-sun-sunset';
    } else {
        celestialElem.className = 'moon state-moon-night';
    }
}

// =========================================================
// 📱 7. حفظ بيانات الودجت في ذاكرة الجوال
// =========================================================
async function updateWidgetStorage(timings, hijriText) {
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Preferences) {
        const { Preferences } = window.Capacitor.Plugins;

        const randomZkr = WIDGET_AZKAR[Math.floor(Math.random() * WIDGET_AZKAR.length)];

        await Preferences.set({ key: 'widget_fajr', value: formatTime12(timings.Fajr) });
        await Preferences.set({ key: 'widget_dhuhr', value: formatTime12(timings.Dhuhr) });
        await Preferences.set({ key: 'widget_asr', value: formatTime12(timings.Asr) });
        await Preferences.set({ key: 'widget_maghrib', value: formatTime12(timings.Maghrib) });
        await Preferences.set({ key: 'widget_isha', value: formatTime12(timings.Isha) });
        
        await Preferences.set({ key: 'widget_hijri', value: hijriText });
        await Preferences.set({ key: 'widget_zkr_title', value: randomZkr.title });
        await Preferences.set({ key: 'widget_zkr_text', value: randomZkr.text });
    }
}

// =========================================================
// 8. جدولة التنبيهات في تطبيق Capacitor
// =========================================================
async function scheduleAllNotifications(timings) {
    const iqamahOffsets = { Fajr: 20, Dhuhr: 15, Asr: 15, Maghrib: 10, Isha: 15 };
    const prayerNamesAr = { Fajr: "الفجر", Dhuhr: "الظهر", Asr: "العصر", Maghrib: "المغرب", Isha: "العشاء" };

    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications) {
        const { LocalNotifications } = window.Capacitor.Plugins;
        await LocalNotifications.requestPermissions();

        let notificationsList = [];
        let id = 1;

        for (let [prayer, time] of Object.entries(prayerNamesAr)) {
            const [hours, minutes] = timings[prayer].split(':');
            let prayerDate = new Date();
            prayerDate.setHours(parseInt(hours), parseInt(minutes), 0);

            notificationsList.push({
                title: `🕌 حان الآن موعد أذان ${time}`,
                body: `حي على الصلاة، حي على الفلاح - زاد المؤمن`,
                id: id++,
                schedule: { at: prayerDate }
            });

            let iqamahDate = new Date(prayerDate.getTime() + iqamahOffsets[prayer] * 60000);
            notificationsList.push({
                title: `⏱️ حان الآن وقت إقامة صلاة ${time}`,
                body: `قد قامت الصلاة، استووا وتراحموا`,
                id: id++,
                schedule: { at: iqamahDate }
            });
        }

        let morningDate = new Date(); morningDate.setHours(7, 0, 0);
        notificationsList.push({
            title: `☀️ أذكار الصباح`,
            body: `أصبحنا وأصبح الملك لله.. لا تنس قراءة أذكار الصباح`,
            id: id++,
            schedule: { at: morningDate, repeats: true, every: 'day' }
        });

        let eveningDate = new Date(); eveningDate.setHours(17, 0, 0);
        notificationsList.push({
            title: `🌙 أذكار المساء`,
            body: `أمسينا وأمسى الملك لله.. وقت أذكار المساء`,
            id: id++,
            schedule: { at: eveningDate, repeats: true, every: 'day' }
        });

        await LocalNotifications.schedule({ notifications: notificationsList });
    }
}

// =========================================================
// 🚀 9. محرك تحويل واجهة الجوال للتطبيق (App Shell Logic)
// =========================================================
function initAppNativeEngine() {
    document.body.classList.add('is-native-app');
    injectAppHeader();
    injectAppBottomNav();
    enableHapticTouch();
}

function injectAppHeader() {
    if (document.getElementById('app-top-header')) return;

    const topBar = document.createElement('div');
    topBar.id = 'app-top-header';
    topBar.className = 'app-top-bar';
    topBar.innerHTML = `
        <div class="app-top-info">
            <div id="app-makkah-clock" style="font-weight: bold;">🕋 مكة: جاري...</div>
            <div id="app-hijri-date" style="font-size: 0.72rem; opacity: 0.85;">📅 جاري التحديث...</div>
        </div>
        <div style="font-family: 'Amiri', serif; font-size: 1.1rem; font-weight: bold; color: #f0d9a8;">زاد المؤمن 🌙</div>
    `;
    document.body.insertBefore(topBar, document.body.firstChild);
}

// =========================================================
// 🚀 محرك تحويل واجهة الجوال للتطبيق (App Shell Logic)
// =========================================================
function initAppNativeEngine() {
    // التحقق الحقيقي: هل يعمل الموقع داخل تطبيق Capacitor الأندرويد (APK) أم متصفح عادي؟
    const isNative = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());

    if (isNative) {
        document.body.classList.add('is-native-app');
        injectAppHeader();
    }

    injectAppBottomNav(isNative);
    enableHapticTouch();
}

function injectAppBottomNav(isNative) {
    if (document.getElementById('liquid-app-nav')) return;

    const path = window.location.pathname;
    const isHome = path.includes('index.html') || path.endsWith('/') || path === '';
    const isDuaa = path.includes('duaa.html');
    const isAzkar = path.includes('azkar.html');

    const nav = document.createElement('div');
    nav.id = 'liquid-app-nav';
    nav.className = 'liquid-bottom-nav';

    let extraNavButton = "";

    if (isNative) {
        // 📱 داخل تطبيق الأندرويد المثبت (APK): يظهر زر ينقله للموقع
        extraNavButton = `
            <button type="button" onclick="openWebsiteLink()" class="liquid-nav-item">
                <span style="font-size: 1.15rem;">🌐</span>
                <span>الموقع</span>
            </button>
        `;
    } else {
        // 🌐 داخل المتصفح العادي (الموقع): يظهر زر تحميل التطبيق/التعليمات
        extraNavButton = `
            <button type="button" onclick="openAppModal()" class="liquid-nav-item">
                <span style="font-size: 1.15rem;">📱</span>
                <span>تطبيق</span>
            </button>
        `;
    }

    nav.innerHTML = `
        <a href="index.html" class="liquid-nav-item ${isHome ? 'active' : ''}">
            <span style="font-size: 1.15rem;">🏠</span>
            <span>الرئيسية</span>
        </a>
        <a href="duaa.html" class="liquid-nav-item ${isDuaa ? 'active' : ''}">
            <span style="font-size: 1.15rem;">🤲</span>
            <span>الدعاء</span>
        </a>
        <a href="azkar.html" class="liquid-nav-item ${isAzkar ? 'active' : ''}">
            <span style="font-size: 1.15rem;">📿</span>
            <span>الأذكار</span>
        </a>
        ${extraNavButton}
        <button type="button" onclick="openAppBotModal()" class="liquid-nav-item">
            <span style="font-size: 1.15rem;">💬</span>
            <span>المساعد</span>
        </button>
    `;

    document.body.appendChild(nav);
}

function openAppBotModal() {
    const chatBtn = document.getElementById('chat-trigger-btn') || document.querySelector('.chat-widget-btn');
    if (chatBtn) chatBtn.click();
}

function openWebsiteLink() {
    window.open('https://omar-i3.github.io/Zad-Al-Momen/', '_blank');
}

// نافذة معلومات التطبيق والتحميل (تظهر للمستخدم في الموقع فقط)
function openAppModal() {
    let modal = document.getElementById('app-info-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'app-info-modal';
        modal.style.cssText = "display: none; position: fixed; inset: 0; z-index: 9999999; background: rgba(3, 5, 14, 0.8); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); align-items: center; justify-content: center; padding: 20px;";
        document.body.appendChild(modal);
    }

    const ua = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua);

    let contentHTML = "";

    if (isIOS) {
        contentHTML = `
            <div style="font-weight: bold; color: #f0d9a8; font-size: 1.1rem; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                <span>📱</span> تطبيق "زاد المؤمن"
            </div>
            <div style="font-size: 0.9rem; color: #93a0c2; line-height: 1.8; margin-bottom: 20px;">
                التطبيق متوفر للاندرويد بس للأسف ومو موجود على الايفون بسبب بعض سياساتهم 🧐<br><br>
                <strong>لتثبيته على الآيفون / الآيباد:</strong><br>
                1. افتح الموقع من متصفح <strong>سفاري (Safari)</strong>.<br>
                2. اضغط على زر <strong>المشاركة 📤</strong> بالأسفل.<br>
                3. اختر <strong>(إضافة إلى الشاشة الرئيسية 🏠)</strong> ليعمل معك بالكامل في الخلفية!
            </div>
        `;
    } else {
        contentHTML = `
            <div style="font-weight: bold; color: #f0d9a8; font-size: 1.1rem; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                <span>📱</span> تطبيق "زاد المؤمن"
            </div>
            <div style="font-size: 0.9rem; color: #93a0c2; line-height: 1.8; margin-bottom: 20px;">
                التطبيق متوفر للاندرويد فقط ليس مثل بعض الاجهزة🧐<br><br>
                حمل تطبيق الأندرويد المباشر (APK) لتستمتع بأداء أسرع، مواقيت صلاة دقيقة، وتنبيهات الأذكار تعمل في الخلفية بكفاءة عالية واوفلاين بدون نت (بإستنثاء الذكاء الاصطناعي)!
            </div>
            <div style="text-align: center; margin-bottom: 15px;">
                <a href="zad-al-momen.apk" download style="display: inline-block; background: linear-gradient(135deg, #d6a85c, #b9803a); color: #1a1200; font-weight: bold; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-size: 0.95rem; box-shadow: 0 4px 15px rgba(214,168,92,0.3);">تحميل تطبيق APK 📲</a>
            </div>
        `;
    }

    modal.innerHTML = `
        <div style="background: linear-gradient(135deg, #0f1730, #141d3d); border: 1px solid rgba(214, 168, 92, 0.4); border-radius: 22px; padding: 24px; width: 100%; max-width: 400px; color: #f3efe3; font-family: 'Tajawal', sans-serif; box-shadow: 0 15px 40px rgba(0,0,0,0.7); text-align: right;">
            ${contentHTML}
            <button type="button" onclick="closeAppModal()" style="width: 100%; background: rgba(255,255,255,0.06); border: 1px solid rgba(214,168,92,0.3); color: #f3efe3; padding: 10px; border-radius: 12px; font-weight: bold; cursor: pointer; font-family: 'Tajawal', sans-serif;">إغلاق</button>
        </div>
    `;

    modal.style.display = 'flex';
}

function closeAppModal() {
    const modal = document.getElementById('app-info-modal');
    if (modal) modal.style.display = 'none';
}

function enableHapticTouch() {
    document.querySelectorAll('.portal-card, .liquid-nav-item, button').forEach(elem => {
        elem.addEventListener('touchstart', () => {
            if (navigator.vibrate) navigator.vibrate(12);
        }, { passive: true });
    });
}

// =========================================================
// 🏁 تشغيل السكريپتات فور تحميل الصفحة
// =========================================================
window.addEventListener('DOMContentLoaded', () => {
    initNotifications();
    initAppNativeEngine();
});