// الإحداثيات الافتراضية (مكة المكرمة / جدة) في حال تعذر الحصول على الـ GPS
const DEFAULT_LAT = 21.4225;
const DEFAULT_LNG = 39.8262;

async function initNotifications() {
    // 1. طلب إذن الإشعارات
    if ('Notification' in window) {
        try {
            await Notification.requestPermission();
        } catch (e) {
            console.log('طلب إذن الإشعارات لم يكتمل:', e);
        }
    }

    // 2. طلب موقع المستخدم أو الاعتماد على التوقيت الافتراضي
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                fetchPrayerTimes(position.coords.latitude, position.coords.longitude);
            },
            (error) => {
                console.warn("تعذر تحديد الموقع الجغرافي، جاري استخدام التوقيت الافتراضي");
                fetchPrayerTimes(DEFAULT_LAT, DEFAULT_LNG);
            },
            { timeout: 5000 }
        );
    } else {
        fetchPrayerTimes(DEFAULT_LAT, DEFAULT_LNG);
    }
}

// جلب المواقيت من السيرفر
async function fetchPrayerTimes(lat, lng) {
    try {
        const response = await fetch(`https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lng}&method=4`);
        const data = await response.json();
        const timings = data.data.timings;

        // أ) رسم المواقيت على واجهة الشاشة
        renderPrayerTimesUI(timings);

        // ب) جدولة التنبيهات للأندرويد
        scheduleAllNotifications(timings);
    } catch (err) {
        console.error("خطأ في جلب مواقيت الصلاة:", err);
        const loadingElem = document.getElementById('prayer-loading');
        if (loadingElem) loadingElem.innerText = "تعذر جلب مواقيت الصلاة حالياً";
    }
}

// عرض أوقات الصلاة بصرياً في الكارت
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

// جدولة التنبيهات في تطبيق Capacitor
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