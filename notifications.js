// 1. طلب إذن الإشعارات وتحديد الموقع
async function initNotifications() {
    // طلب إذن الإشعارات للموقع والتطبيق
    if ('Notification' in window) {
        let permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.log('لم يتم إعطاء إذن الإشعارات');
            return;
        }
    }

    // طلب تحديد الموقع لجلب مواقيت الصلاة
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                fetchPrayerTimes(lat, lng);
            },
            (error) => {
                console.error("تعذر تحديد الموقع، جاري استخدام التوقيت الافتراضي", error);
            }
        );
    }
}

// 2. جلب مواقيت الصلاة لمنطقة المستخدم
async function fetchPrayerTimes(lat, lng) {
    try {
        const response = await fetch(`https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lng}&method=4`);
        const data = await response.json();
        const timings = data.data.timings;

        scheduleAllNotifications(timings);
    } catch (err) {
        console.error("خطأ في جلب مواقيت الصلاة:", err);
    }
}

// 3. جدولة الإشعارات (الصلاة + الإقامة + الأذكار)
async function scheduleAllNotifications(timings) {
    // فارق وقت الإقامة بالدقائق (مثال: الفجر 20 دقيقة، الباقي 15 دقيقة)
    const iqamahOffsets = {
        Fajr: 20,
        Dhuhr: 15,
        Asr: 15,
        Maghrib: 10,
        Isha: 15
    };

    const prayerNamesAr = {
        Fajr: "الفجر",
        Dhuhr: "الظهر",
        Asr: "العصر",
        Maghrib: "المغرب",
        Isha: "العشاء"
    };

    console.log("تم جلب مواقيت الصلاة بنجاح:", timings);

    // جدولة أذكار الصباح والمساء
    // أذكار الصباح: بعد الفجر بـ 30 دقيقة
    // أذكار المساء: بعد العصر بـ 30 دقيقة
    
    // إذا كنت تستخدم Capacitor Native Notifications:
    if (window.Capacitor && window.Capacitor.Plugins.LocalNotifications) {
        const { LocalNotifications } = window.Capacitor.Plugins;
        
        await LocalNotifications.requestPermissions();

        let notificationsList = [];
        let id = 1;

        // إضافة إشعارات الصلاة والإقامة
        for (let [prayer, time] of Object.entries(prayerNamesAr)) {
            const [hours, minutes] = timings[prayer].split(':');
            let prayerDate = new Date();
            prayerDate.setHours(parseInt(hours), parseInt(minutes), 0);

            // 📢 أذان الصلاة
            notificationsList.push({
                title: `🕌 حان الآن موعد أذان ${time}`,
                body: `حي على الصلاة، حي على الفلاح - زاد المؤمن`,
                id: id++,
                schedule: { at: prayerDate }
            });

            // 📢 إقامة الصلاة
            let iqamahDate = new Date(prayerDate.getTime() + iqamahOffsets[prayer] * 60000);
            notificationsList.push({
                title: `⏱️ حان الآن وقت إقامة صلاة ${time}`,
                body: `قد قامت الصلاة، استووا وتراحموا`,
                id: id++,
                schedule: { at: iqamahDate }
            });
        }

        // 📢 أذكار الصباح (مثلاً الساعة 7:00 صباحاً)
        let morningDate = new Date();
        morningDate.setHours(7, 0, 0);
        notificationsList.push({
            title: `☀️ أذكار الصباح`,
            body: `اصبحنا واصبح الملك لله.. لا تنس قراءة أذكار الصباح لحفظك ويومك`,
            id: id++,
            schedule: { at: morningDate, repeats: true, every: 'day' }
        });

        // 📢 أذكار المساء (مثلاً الساعة 5:00 مساءً)
        let eveningDate = new Date();
        eveningDate.setHours(17, 0, 0);
        notificationsList.push({
            title: `🌙 أذكار المساء`,
            body: `أمسينا وأمسى الملك لله.. وقت أذكار المساء طمأنينة لقلبك`,
            id: id++,
            schedule: { at: eveningDate, repeats: true, every: 'day' }
        });

        // جدولة كل الإشعارات
        await LocalNotifications.schedule({ notifications: notificationsList });
        alert("تم تفعيل التنبيهات التلقائية لمواقيت الصلاة والأذكار بنجاح! 🔔");
    }
}

// تشغيل النظام عند فتح الصفحة
window.addEventListener('DOMContentLoaded', initNotifications);