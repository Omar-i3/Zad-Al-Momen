// إحداثيات مدينة جدة الدقيقة (في حال عدم تفعيل الـ GPS)
const DEFAULT_LAT = 21.5433;
const DEFAULT_LNG = 39.1728;

// 1. تشغيل النظام والساعة والتنبيهات
async function initNotifications() {
    // تشغيل ساعة مكة الحية والتقويم الاحتياطي
    startMakkahClock();
    displayHijriDateFallback();

    // طلب إذن الإشعارات (فقط إذا لم يتم اتخاذ قرار سابقاً من المستخدم)
    if ('Notification' in window && Notification.permission === 'default') {
        try {
            await Notification.requestPermission();
        } catch (e) {
            console.log('طلب إذن الإشعارات لم يكتمل:', e);
        }
    }

    // جلب المواقيت بـ GPS أو التوقيت الافتراضي لجدة
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

// 2. ساعة حية لتوقيت مكة المكرمة (تتحدث كل ثانية)
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
        const timeElem = document.getElementById('makkah-time-text');
        if (timeElem) {
            timeElem.innerText = `🕋 توقيت مكة: ${timeStr}`;
        }
    }
    updateClock();
    setInterval(updateClock, 1000);
}

// 3. جلب مواقيت الصلاة والتاريخ الهجري الدقيق من السيرفر
async function fetchPrayerTimes(lat, lng) {
    try {
        const response = await fetch(`https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lng}&method=4&school=0`);
        const data = await response.json();
        const timings = data.data.timings;
        const dateData = data.data.date;

        // تحديث التاريخ الهجري الدقيق 100% من السيرفر (تقويم أم القرى)
        if (dateData && dateData.hijri) {
            const h = dateData.hijri;
            const hijriElem = document.getElementById('hijri-date-text');
            if (hijriElem) {
                hijriElem.innerText = `📅 ${h.weekday.ar}، ${h.day} ${h.month.ar} ${h.year} هـ`;
            }
        }

        // رسم المواقيت وجدولتها
        renderPrayerTimesUI(timings);
        scheduleAllNotifications(timings);
    } catch (err) {
        console.error("خطأ في جلب مواقيت الصلاة:", err);
        const loadingElem = document.getElementById('prayer-loading');
        if (loadingElem) loadingElem.innerText = "تعذر جلب مواقيت الصلاة حالياً";
    }
}

// 4. تقويم هجري احتياطي محلي أثناء انتظار التحميل
function displayHijriDateFallback() {
    try {
        const today = new Date();
        const formatter = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        const hijriFormatted = formatter.format(today);
        const elem = document.getElementById('hijri-date-text');
        if (elem && elem.innerText.includes('جاري')) {
            elem.innerText = `📅 ${hijriFormatted} هـ`;
        }
    } catch (e) {
        console.log("استخدام التوقيت الهجري من السيرفر فقط");
    }
}

// 5. رسم مواقيت الصلاة بصرياً على الشاشة
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

// تحويل صيغة الوقت إلى 12 ساعة (ص / م)
function formatTime12(time24) {
    let [hours, minutes] = time24.split(':').map(Number);
    let period = hours >= 12 ? 'م' : 'ص';
    hours = hours % 12 || 12;
    return `${hours}:${minutes < 10 ? '0' : ''}${minutes} ${period}`;
}

// 6. جدولة التنبيهات في تطبيق Capacitor
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

window.addEventListener('DOMContentLoaded', initNotifications);