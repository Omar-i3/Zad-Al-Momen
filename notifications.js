/* ==========================================================================
   🌙 زاد المؤمن - نظام الإشعارات الشامل ومواقيت الصلاة وشريط الملاحة (notifications.js)
   تطوير وتصميم: عمر
   الإصدار: 3.0 المكتمل بالكامل
   ========================================================================== */

/* --------------------------------------------------------------------------
   1. الإعدادات العامة والتخزين المحلي (Settings & LocalStorage Keys)
   -------------------------------------------------------------------------- */
const DEFAULT_ADHAN_SETTINGS = {
  fajr: true,
  dhuhr: true,
  asr: true,
  maghrib: true,
  isha: true,
  sabahAzkar: true,
  masaaAzkar: true,
  duhaRemind: true,
  sleepAzkar: true,
  qiyamRemind: true
};

let adhanSettings = JSON.parse(localStorage.getItem('zad_adhan_settings')) || DEFAULT_ADHAN_SETTINGS;
let prayerTimings = null;
let playedAdhansToday = JSON.parse(localStorage.getItem('zad_played_adhans') || '{}');
let scheduledAzkarToday = JSON.parse(localStorage.getItem('zad_scheduled_azkar') || '{}');

/* --------------------------------------------------------------------------
   2. فحص ودعم نظام Capacitor للتطبيق المباشر على الأندرويد (Android APK)
   -------------------------------------------------------------------------- */
const isCapacitorAvailable = typeof window.Capacitor !== 'undefined';

async function requestNotificationPermissions() {
  // أ) طلب الإذن عبر Capacitor للأندرويد إن وجد
  if (isCapacitorAvailable && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications) {
    try {
      const perm = await window.Capacitor.Plugins.LocalNotifications.requestPermissions();
      console.log('صلاحيات إشعارات Capacitor:', perm);
    } catch (err) {
      console.error('خطأ في طلب صلاحيات Capacitor:', err);
    }
  }

  // ب) طلب الإذن عبر المتصفح العادي (Web API)
  if ('Notification' in window && Notification.permission === 'default') {
    try {
      await Notification.requestPermission();
    } catch (err) {
      console.error('خطأ في طلب صلاحيات إشعارات المتصفح:', err);
    }
  }
}

/* --------------------------------------------------------------------------
   3. تحديث توقيت مكة المكرمة والتاريخ الهجري العربي الصريح
   -------------------------------------------------------------------------- */
/* ===== توقيت مكة والتاريخ الهجري حسب أم القرى بدقة ===== */
function updateMakkahTimeAndHijri() {
  const now = new Date();
  
  // 1. توقيت مكة المكرمة
  try {
    const timeFormatter = new Intl.DateTimeFormat('ar-SA', {
      timeZone: 'Asia/Riyadh',
      hour12: true,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    const timeElem = document.getElementById('makkah-time-text');
    if (timeElem) timeElem.textContent = `🕋 مكة: ${timeFormatter.format(now)}`;
  } catch (e) {}

  // 2. التاريخ الهجري حسب تقويم أم القرى الرسمي
  try {
    const hijriFormatter = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    const hijriElem = document.getElementById('hijri-date-text');
    if (hijriElem) hijriElem.textContent = `📅 ${hijriFormatter.format(now)} هـ`;
  } catch (e) {}
}

updateMakkahTimeAndHijri();
setInterval(updateMakkahTimeAndHijri, 1000);

/* --------------------------------------------------------------------------
   4. محرك مواقيت الصلاة والجغرافيا (Prayer Times Engine)
   -------------------------------------------------------------------------- */
async function fetchPrayerTimes() {
  const prayerLoading = document.getElementById('prayer-loading');
  const prayerGrid = document.getElementById('prayer-grid');

  try {
    let latitude = 21.4225; // مكة المكرمة كخط عرض افتراضي
    let longitude = 39.8262; // مكة المكرمة كخط طول افتراضي

    // تحديد الموقع الجغرافي الدقيق للمستخدم
    if (navigator.geolocation) {
      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 6000 });
        });
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
      } catch (geoErr) {
        console.log('استخدام إحداثيات مكة المكرمة الافتراضية.');
      }
    }

    const dateObj = new Date();
    const response = await fetch(`https://api.aladhan.com/v1/timings/${Math.floor(dateObj.getTime() / 1000)}?latitude=${latitude}&longitude=${longitude}&method=4`);
    const data = await response.json();

    if (data && data.data && data.data.timings) {
      prayerTimings = data.data.timings;
      renderPrayerGrid(prayerTimings);
      if (prayerLoading) prayerLoading.style.display = 'none';
      if (prayerGrid) prayerGrid.style.display = 'grid';

      // جدولة إشعارات الأذان اليومية
      scheduleAllDailyNotifications(prayerTimings);
    } else {
      throw new Error('بيانات المواقيت غير مكتملة من المزود.');
    }
  } catch (err) {
    console.error('خطأ في جلب مواقيت الصلاة:', err);
    if (prayerLoading) {
      prayerLoading.textContent = 'تعذّر جلب مواقيت الصلاة تلقائياً. تأكد من اتصالك بالإنترنت.';
    }
  }
}

function renderPrayerGrid(timings) {
  const prayerGrid = document.getElementById('prayer-grid');
  if (!prayerGrid) return;

  const prayers = [
    { key: 'Fajr', name: 'الفجر', icon: '🌅' },
    { key: 'Sunrise', name: 'الشروق', icon: '☀️' },
    { key: 'Dhuhr', name: 'الظهر', icon: '🌕' },
    { key: 'Asr', name: 'العصر', icon: '🌤️' },
    { key: 'Maghrib', name: 'المغرب', icon: '🌆' },
    { key: 'Isha', name: 'العشاء', icon: '🌙' }
  ];

  prayerGrid.innerHTML = prayers.map(p => {
    const rawTime = timings[p.key];
    const formattedTime = formatTime12(rawTime);
    return `
      <div class="prayer-card" style="background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border-glass); border-radius: 14px; padding: 10px 6px; text-align: center;">
        <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 4px;">${p.icon} ${p.name}</div>
        <div style="font-family: 'Tajawal', sans-serif; font-size: 1.05rem; font-weight: 700; color: var(--gold-soft);">${formattedTime}</div>
      </div>
    `;
  }).join('');
}

function formatTime12(time24) {
  if (!time24) return '--:--';
  const [hours, minutes] = time24.split(':');
  let h = parseInt(hours, 10);
  const m = minutes.substring(0, 2);
  const ampm = h >= 12 ? 'م' : 'ص';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

/* --------------------------------------------------------------------------
   5. فحص وتشغيل أذان الصلوات الحية والتنبيهات
   -------------------------------------------------------------------------- */
function checkPrayerAdhan() {
  if (!prayerTimings) return;

  const now = new Date();
  const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const todayKey = now.toISOString().split('T')[0];

  if (playedAdhansToday.date !== todayKey) {
    playedAdhansToday = { date: todayKey };
  }

  const prayersToCheck = [
    { key: 'Fajr', name: 'أذان الفجر', settingKey: 'fajr' },
    { key: 'Dhuhr', name: 'أذان الظهر', settingKey: 'dhuhr' },
    { key: 'Asr', name: 'أذان العصر', settingKey: 'asr' },
    { key: 'Maghrib', name: 'أذان المغرب', settingKey: 'maghrib' },
    { key: 'Isha', name: 'أذان العشاء', settingKey: 'isha' }
  ];

  prayersToCheck.forEach(p => {
    const prayerTime = prayerTimings[p.key];
    if (prayerTime && prayerTime.substring(0, 5) === currentHHMM) {
      if (!playedAdhansToday[p.key] && adhanSettings[p.settingKey]) {
        playedAdhansToday[p.key] = true;
        localStorage.setItem('zad_played_adhans', JSON.stringify(playedAdhansToday));
        triggerAdhanNotification(p.name);
      }
    }
  });

  // فحص أذكار الصباح والمساء والسنن
  checkAzkarAndSunnahReminders(currentHHMM, todayKey);
}

function triggerAdhanNotification(prayerName) {
  // أ) إظهار التوست العلوي
  if (typeof window.showToast === 'function') {
    window.showToast(`🕌 حان الآن وقت ${prayerName}`);
  }

  // ب) الاهتزاز عند التفاعل اللمسي
  if (navigator.vibrate) {
    navigator.vibrate([100, 50, 100, 50, 200]);
  }

  // ج) تشغيل صوت الأذان في المتصفح
  try {
    const adhanAudio = new Audio('https://cdn.islamicfinder.org/audio/makkah.mp3');
    adhanAudio.play().catch(e => console.log('يتطلب تشغيل صوت الأذان ضغطة تفاعلية سابقة من المستخدم.'));
  } catch (e) {
    console.error('خطأ في تشغيل صوت الأذان:', e);
  }

  // د) إرسال إشعار المتصفح
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('زاد المؤمن — مواقيت الصلاة', {
      body: `حان الآن وقت ${prayerName} حسب توقيتك المحلي.`,
      icon: 'icon-192.png'
    });
  }

  // هـ) إرسال إشعار الأندرويد المباشر عبر Capacitor
  if (isCapacitorAvailable && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications) {
    window.Capacitor.Plugins.LocalNotifications.schedule({
      notifications: [{
        title: 'زاد المؤمن — مواقيت الصلاة',
        body: `حان الآن وقت ${prayerName} حسب توقيتك المحلي.`,
        id: Math.floor(Math.random() * 100000),
        schedule: { at: new Date(Date.now() + 100) },
        sound: 'makkah.mp3',
        smallIcon: 'ic_stat_icon'
      }]
    });
  }
}

/* --------------------------------------------------------------------------
   6. جدولة إشعارات الأذكار والسنن اليومية
   -------------------------------------------------------------------------- */
function checkAzkarAndSunnahReminders(currentHHMM, todayKey) {
  if (scheduledAzkarToday.date !== todayKey) {
    scheduledAzkarToday = { date: todayKey };
  }

  // أذكار الصباح (بعد أذان الفجر بـ 20 دقيقة)
  if (prayerTimings.Fajr && adhanSettings.sabahAzkar && !scheduledAzkarToday['sabah']) {
    const sababTime = addMinutesToTime(prayerTimings.Fajr, 20);
    if (sababTime === currentHHMM) {
      scheduledAzkarToday['sabah'] = true;
      localStorage.setItem('zad_scheduled_azkar', JSON.stringify(scheduledAzkarToday));
      sendCustomReminder('📿 أذكار الصباح', 'أصبحنا وأصبح الملك لله.. حان وقت قراءة أذكار الصباح لحفظك وحصنك اليومي.');
    }
  }

  // صلاة الضحى (بعد الشروق بـ 20 دقيقة)
  if (prayerTimings.Sunrise && adhanSettings.duhaRemind && !scheduledAzkarToday['duha']) {
    const duhaTime = addMinutesToTime(prayerTimings.Sunrise, 20);
    if (duhaTime === currentHHMM) {
      scheduledAzkarToday['duha'] = true;
      localStorage.setItem('zad_scheduled_azkar', JSON.stringify(scheduledAzkarToday));
      sendCustomReminder('☀️ صلاة الأوابين (الضحى)', 'ركعتا الضحى تجزئ عن 360 صدقة عن كل مفصل في جسدك.');
    }
  }

  // أذكار المساء (بعد أذان العصر بـ 20 دقيقة)
  if (prayerTimings.Asr && adhanSettings.masaaAzkar && !scheduledAzkarToday['masaa']) {
    const masaaTime = addMinutesToTime(prayerTimings.Asr, 20);
    if (masaaTime === currentHHMM) {
      scheduledAzkarToday['masaa'] = true;
      localStorage.setItem('zad_scheduled_azkar', JSON.stringify(scheduledAzkarToday));
      sendCustomReminder('🌆 أذكار المساء', 'أمسينا وأمسى الملك لله.. أقبل على أذكار المساء لتحفظ نفسك وأهلك.');
    }
  }

  // أذكار النوم وسورة الملك (الساعة 10:30 مساءً)
  if (adhanSettings.sleepAzkar && !scheduledAzkarToday['sleep'] && currentHHMM === '22:30') {
    scheduledAzkarToday['sleep'] = true;
    localStorage.setItem('zad_scheduled_azkar', JSON.stringify(scheduledAzkarToday));
    sendCustomReminder('📖 سورة الملك وأذكار النوم', 'لا تنم حتى تقرأ سورة الملك وتتوضأ وتذكر ربك.');
  }
}

function sendCustomReminder(title, message) {
  if (typeof window.showToast === 'function') {
    window.showToast(`${title}: ${message}`);
  }

  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body: message, icon: 'icon-192.png' });
  }

  if (isCapacitorAvailable && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications) {
    window.Capacitor.Plugins.LocalNotifications.schedule({
      notifications: [{
        title: title,
        body: message,
        id: Math.floor(Math.random() * 100000),
        schedule: { at: new Date(Date.now() + 100) }
      }]
    });
  }
}

function addMinutesToTime(time24, minutesToAdd) {
  if (!time24) return '00:00';
  const [h, m] = time24.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m + minutesToAdd, 0);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function scheduleAllDailyNotifications(timings) {
  if (!isCapacitorAvailable || !window.Capacitor.Plugins || !window.Capacitor.Plugins.LocalNotifications) return;

  try {
    window.Capacitor.Plugins.LocalNotifications.cancel({ notifications: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }] });

    const notificationsList = [];
    const now = new Date();

    const prayers = [
      { id: 1, key: 'Fajr', title: 'أذان الفجر' },
      { id: 2, key: 'Dhuhr', title: 'أذان الظهر' },
      { id: 3, key: 'Asr', title: 'أذان العصر' },
      { id: 4, key: 'Maghrib', title: 'أذان المغرب' },
      { id: 5, key: 'Isha', title: 'أذان العشاء' }
    ];

    prayers.forEach(p => {
      const t = timings[p.key];
      if (t) {
        const [h, m] = t.split(':').map(Number);
        const pDate = new Date();
        pDate.setHours(h, m, 0);

        if (pDate > now) {
          notificationsList.push({
            id: p.id,
            title: `زاد المؤمن — ${p.title}`,
            body: `حان الآن وقت ${p.title} حسب توقيتك المحلي.`,
            schedule: { at: pDate },
            sound: 'makkah.mp3'
          });
        }
      }
    });

    if (notificationsList.length > 0) {
      window.Capacitor.Plugins.LocalNotifications.schedule({ notifications: notificationsList });
    }
  } catch (err) {
    console.error('خطأ في جدولة إشعارات Capacitor:', err);
  }
}

/* --------------------------------------------------------------------------
   7. التحكم بنافذة تخصيص الأذان والإعدادات
   -------------------------------------------------------------------------- */
window.openAdhanSettings = function() {
  const modal = document.getElementById('adhanModal');
  if (modal) {
    ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'].forEach(k => {
      const toggle = document.getElementById(`toggle-${k}`);
      if (toggle) toggle.checked = !!adhanSettings[k];
    });
    modal.classList.add('open');
  }
};

window.closeAdhanSettings = function() {
  const modal = document.getElementById('adhanModal');
  if (modal) {
    ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'].forEach(k => {
      const toggle = document.getElementById(`toggle-${k}`);
      if (toggle) adhanSettings[k] = toggle.checked;
    });
    localStorage.setItem('zad_adhan_settings', JSON.stringify(adhanSettings));
    modal.classList.remove('open');
    if (typeof window.showToast === 'function') {
      window.showToast('تم حفظ تفضيلات الأذان والإشعارات بنجاح ✨');
    }
  }
};

/* --------------------------------------------------------------------------
   8. إعانة تفعيل فتح وإغلاق الشات المساعد الموحد
   -------------------------------------------------------------------------- */
window.toggleChat = function() {
  const chatWindow = document.getElementById('chat-window');
  if (chatWindow) {
    const isHidden = chatWindow.style.display === 'none' || chatWindow.style.display === '';
    chatWindow.style.display = isHidden ? 'flex' : 'none';
    if (isHidden && document.getElementById('chat-input')) {
      document.getElementById('chat-input').focus();
    }
  }
};

/* --------------------------------------------------------------------------
   9. إعانة إطلاق بنر تثبيت التطبيق الذكي
   -------------------------------------------------------------------------- */
window.openAppInstallBanner = function() {
  const banner = document.getElementById('smart-app-banner');
  if (!banner) return;
  const bannerText = document.getElementById('banner-text');
  const apkBtn = document.getElementById('apk-download-btn');
  const ua = navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(ua);

  if (isIOS) {
    if (bannerText) bannerText.innerHTML = 'للآيفون: اضغط <span style="color:#d6a85c; font-weight:bold;">مشاركة 📤</span> ثم اختر <span style="color:#d6a85c; font-weight:bold;">(إضافة إلى الشاشة الرئيسية)</span>';
    if (apkBtn) apkBtn.style.display = 'none';
  } else {
    if (bannerText) bannerText.innerText = 'ثبّت تطبيق الأندرويد المباشر (APK) لتصفح أسرع وأسهل!';
    if (apkBtn) apkBtn.style.display = 'inline-block';
  }
  banner.style.display = 'block';
};

window.closeAppInstallBanner = function() {
  const banner = document.getElementById('smart-app-banner');
  if (banner) banner.style.display = 'none';
};

/* --------------------------------------------------------------------------
   10. الأحداث التشغيلية التلقائية عند فتح أي صفحة
   -------------------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  requestNotificationPermissions();

  updateMakkahTimeAndHijri();
  setInterval(updateMakkahTimeAndHijri, 1000);

  fetchPrayerTimes();
  setInterval(checkPrayerAdhan, 15000); // فحص الأذان والسنن كل 15 ثانية
});
/* ==========================================================================
   11. نافذة معلومات وتثبيت التطبيق الذكية (App Install & Info Modal)
   ========================================================================== */
window.openAppModal = function() {
    let modal = document.getElementById('app-info-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'app-info-modal';
        modal.style.cssText = "display: none; position: fixed; inset: 0; z-index: 9999999; background: rgba(3, 5, 14, 0.82); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); align-items: center; justify-content: center; padding: 20px;";
        document.body.appendChild(modal);
    }

    const ua = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua);

    let contentHTML = isIOS ? `
        <div style="font-weight: bold; color: #f0d9a8; font-size: 1.1rem; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
            <span>📱</span> تطبيق "زاد المؤمن"
        </div>
        <div style="font-size: 0.9rem; color: #93a0c2; line-height: 1.8; margin-bottom: 20px;">
            التطبيق متوفر للاندرويد فقط وليس على الايفون بسبب سياساتهم 🧐<br><br>
            <strong>لتثبيته على الآيفون / الآيباد:</strong><br>
            1. افتح الموقع من متصفح <strong>سفاري (Safari)</strong>.<br>
            2. اضغط على زر <strong>المشاركة 📤</strong> بالأسفل.<br>
            3. اختر <strong>(إضافة إلى الشاشة الرئيسية 🏠)</strong> ليعمل معك بالكامل!
        </div>
    ` : `
        <div style="font-weight: bold; color: #f0d9a8; font-size: 1.1rem; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
            <span>📱</span> تطبيق "زاد المؤمن"
        </div>
        <div style="font-size: 0.9rem; color: #93a0c2; line-height: 1.8; margin-bottom: 20px;">
            حمل تطبيق الأندرويد المباشر (APK) لتستمتع بأداء أسرع، مواقيت صلاة دقيقة، وتنبيهات الأذكار تعمل في الخلفية بكفاءة عالية وأوفلاين!
        </div>
        <div style="text-align: center; margin-bottom: 15px;">
            <a href="zad-al-momen.apk" download style="display: inline-block; background: linear-gradient(135deg, #d6a85c, #b9803a); color: #1a1200; font-weight: bold; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-size: 0.95rem; box-shadow: 0 4px 15px rgba(214,168,92,0.3);">تحميل تطبيق APK 📲</a>
        </div>
    `;

    modal.innerHTML = `
        <div style="background: linear-gradient(135deg, #0f1730, #141d3d); border: 1px solid rgba(214, 168, 92, 0.4); border-radius: 22px; padding: 24px; width: 100%; max-width: 400px; color: #f3efe3; font-family: 'Tajawal', sans-serif; box-shadow: 0 15px 40px rgba(0,0,0,0.7); text-align: right;">
            ${contentHTML}
            <button type="button" onclick="closeAppModal()" style="width: 100%; background: rgba(255,255,255,0.06); border: 1px solid rgba(214,168,92,0.3); color: #f3efe3; padding: 10px; border-radius: 12px; font-weight: bold; cursor: pointer; font-family: 'Tajawal', sans-serif;">إغلاق</button>
        </div>
    `;

    modal.style.display = 'flex';
};

window.closeAppModal = function() {
    const modal = document.getElementById('app-info-modal');
    if (modal) modal.style.display = 'none';
};