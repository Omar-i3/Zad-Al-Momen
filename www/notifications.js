/* ==========================================================================
   🌙 زاد المؤمن - نظام الإشعارات الشامل والتنبيهات المباشرة (notifications.js)
   تطوير وتصميم: عمر
   الإصدار: 3.1 المطور والموسع
   ========================================================================== */

const DEFAULT_ADHAN_SETTINGS = {
  fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true,
  sabahAzkar: true, masaaAzkar: true, duhaRemind: true, sleepAzkar: true,
  qiyamRemind: true, quranReadRemind: true, salawatRemind: true, kahfRemind: true
};

let adhanSettings = JSON.parse(localStorage.getItem('zad_adhan_settings')) || DEFAULT_ADHAN_SETTINGS;
let prayerTimings = null;
let playedAdhansToday = JSON.parse(localStorage.getItem('zad_played_adhans') || '{}');
let scheduledAzkarToday = JSON.parse(localStorage.getItem('zad_scheduled_azkar') || '{}');

const isCapacitorAvailable = typeof window.Capacitor !== 'undefined';

// 1. طلب الصلاحيات
async function requestNotificationPermissions() {
  if (isCapacitorAvailable && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications) {
    try {
      await window.Capacitor.Plugins.LocalNotifications.requestPermissions();
    } catch (err) {
      console.error('خطأ صلاحيات Capacitor:', err);
    }
  }

  if ('Notification' in window && Notification.permission === 'default') {
    try {
      await Notification.requestPermission();
    } catch (err) {
      console.error('خطأ صلاحيات المتصفح:', err);
    }
  }
}

// 2. معالجة زر العودة المادي للأندرويد (Hardware Back Button)
function setupAndroidBackButton() {
  if (isCapacitorAvailable && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
    window.Capacitor.Plugins.App.addListener('backButton', ({ canGoBack }) => {
      // إغلاق أي مودال أو نافذة منبثقة إن كانت مفتوحة
      const openModal = document.querySelector('.overlay.open, .pdf-modal-overlay.open, .adhan-modal-overlay.open, #app-info-modal[style*="flex"]');
      if (openModal) {
        if (openModal.id === 'app-info-modal') {
          openModal.style.display = 'none';
        } else {
          openModal.classList.remove('open');
        }
        document.body.style.overflow = '';
        return;
      }

      // إغلاق الشات إن كان مفتوحاً
      const chatWin = document.getElementById('chat-window');
      if (chatWin && chatWin.style.display === 'flex') {
        chatWin.style.display = 'none';
        return;
      }

      if (canGoBack) {
        window.history.back();
      } else {
        window.Capacitor.Plugins.App.exitApp();
      }
    });
  }
}

// 3. توقيت مكة والتاريخ الهجري
function updateMakkahTimeAndHijri() {
  const now = new Date();
  try {
    const timeFormatter = new Intl.DateTimeFormat('ar-SA', {
      timeZone: 'Asia/Riyadh', hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    const timeElem = document.getElementById('makkah-time-text');
    if (timeElem) timeElem.textContent = `🕋 مكة: ${timeFormatter.format(now)}`;
  } catch (e) {}

  try {
    const hijriFormatter = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
    const hijriElem = document.getElementById('hijri-date-text');
    if (hijriElem) hijriElem.textContent = `📅 ${hijriFormatter.format(now)} هـ`;
  } catch (e) {}
}

// 4. جلب مواقيت الصلاة والعد التنازلي المباشر
let prayerCountdownInterval = null;

async function fetchPrayerTimes() {
  const prayerLoading = document.getElementById('prayer-loading');
  const prayerGrid = document.getElementById('prayer-grid');

  // استرجاع الكاش الفوري إن وجد لمنع أي تأخير في العرض
  try {
    const cached = localStorage.getItem('cached_prayer_timings');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && parsed.Fajr) {
        prayerTimings = parsed;
        renderPrayerGrid(prayerTimings);
        initPrayerCountdown(prayerTimings);
        if (prayerLoading) prayerLoading.style.display = 'none';
        if (prayerGrid) prayerGrid.style.display = 'grid';
      }
    }
  } catch (e) {}

  try {
    let lat = 21.4225, lng = 39.8262; // مكة المكرمة كافتراضي

    if (navigator.geolocation) {
      try {
        const position = await new Promise((res, rej) => {
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 6000 });
        });
        lat = position.coords.latitude;
        lng = position.coords.longitude;
      } catch (e) {
        console.log('استخدام إحداثيات مكة الافتراضية.');
      }
    }

    const dateObj = new Date();
    const res = await fetch(`https://api.aladhan.com/v1/timings/${Math.floor(dateObj.getTime() / 1000)}?latitude=${lat}&longitude=${lng}&method=4`);
    const data = await res.json();

    if (data && data.data && data.data.timings) {
      prayerTimings = data.data.timings;
      try {
        localStorage.setItem('cached_prayer_timings', JSON.stringify(prayerTimings));
      } catch (e) {}

      renderPrayerGrid(prayerTimings);
      initPrayerCountdown(prayerTimings);

      if (prayerLoading) prayerLoading.style.display = 'none';
      if (prayerGrid) prayerGrid.style.display = 'grid';

      scheduleAllDailyNotifications(prayerTimings);
    }
  } catch (err) {
    console.error('خطأ في جلب المواقيت:', err);
  }
}

function renderPrayerGrid(timings) {
  const prayerGrid = document.getElementById('prayer-grid');
  if (!prayerGrid || !timings) return;

  const prayers = [
    { key: 'Fajr', name: 'الفجر', icon: '🌅' },
    { key: 'Sunrise', name: 'الشروق', icon: '☀️' },
    { key: 'Dhuhr', name: 'الظهر', icon: '🌕' },
    { key: 'Asr', name: 'العصر', icon: '🌤️' },
    { key: 'Maghrib', name: 'المغرب', icon: '🌆' },
    { key: 'Isha', name: 'العشاء', icon: '🌙' }
  ];

  prayerGrid.innerHTML = prayers.map(p => `
    <div class="prayer-card" data-prayer-key="${p.key}" style="background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border-glass); border-radius: 14px; padding: 12px 6px; text-align: center; transition: all 0.3s ease;">
      <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 4px;">${p.icon} ${p.name}</div>
      <div style="font-family: 'Tajawal', sans-serif; font-size: 1.08rem; font-weight: 700; color: var(--gold-soft);">${formatTime12(timings[p.key])}</div>
    </div>
  `).join('');
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

// ==========================================
// ودجت العد التنازلي المباشر للصلاة القادمة
// ==========================================
function initPrayerCountdown(timings) {
  if (!timings) return;
  updatePrayerCountdown(timings);
  if (prayerCountdownInterval) clearInterval(prayerCountdownInterval);
  prayerCountdownInterval = setInterval(() => {
    updatePrayerCountdown(timings);
  }, 1000);
}
window.initPrayerCountdown = initPrayerCountdown;

function updatePrayerCountdown(timings) {
  const npHero = document.getElementById('next-prayer-hero');
  if (!npHero || !timings) return;

  const now = new Date();
  const prayerList = [
    { key: 'Fajr', name: 'صلاة الفجر', icon: '🌅' },
    { key: 'Sunrise', name: 'شروق الشمس', icon: '☀️' },
    { key: 'Dhuhr', name: 'صلاة الظهر', icon: '🌕' },
    { key: 'Asr', name: 'صلاة العصر', icon: '🌤️' },
    { key: 'Maghrib', name: 'صلاة المغرب', icon: '🌆' },
    { key: 'Isha', name: 'صلاة العشاء', icon: '🌙' }
  ];

  function parseTime(timeStr, dayOffset = 0) {
    if (!timeStr) return new Date();
    const [h, m] = timeStr.split(':').map(Number);
    const d = new Date(now);
    d.setDate(d.getDate() + dayOffset);
    d.setHours(h, m, 0, 0);
    return d;
  }

  const schedule = prayerList.map(p => ({
    ...p,
    timeDate: parseTime(timings[p.key], 0),
    timeStr: timings[p.key]
  }));

  let nextPrayer = null;
  let prevPrayer = null;

  for (let i = 0; i < schedule.length; i++) {
    if (now < schedule[i].timeDate) {
      nextPrayer = schedule[i];
      prevPrayer = i === 0
        ? { ...schedule[schedule.length - 1], timeDate: parseTime(timings.Isha, -1) }
        : schedule[i - 1];
      break;
    }
  }

  // بعد صلاة العشاء ننتقل لفجر الغد
  if (!nextPrayer) {
    nextPrayer = {
      ...schedule[0],
      timeDate: parseTime(timings.Fajr, 1)
    };
    prevPrayer = schedule[schedule.length - 1];
  }

  const diffMs = Math.max(0, nextPrayer.timeDate - now);
  const totalMs = Math.max(1, nextPrayer.timeDate - prevPrayer.timeDate);
  const elapsedMs = Math.max(0, now - prevPrayer.timeDate);
  const percent = Math.min(100, Math.max(0, Math.round((elapsedMs / totalMs) * 100)));

  const hours = Math.floor(diffMs / 3600000);
  const minutes = Math.floor((diffMs % 3600000) / 60000);
  const seconds = Math.floor((diffMs % 60000) / 1000);

  // هل وقت الصلاة قائم الآن؟ (أول 20 دقيقة من وقت الصلاة السابقة)
  const isAdhanNow = (now - prevPrayer.timeDate) >= 0 && (now - prevPrayer.timeDate) < (20 * 60 * 1000) && prevPrayer.key !== 'Sunrise';

  const badgeText = document.getElementById('np-badge-text');
  const npIcon = document.getElementById('np-icon');
  const npName = document.getElementById('np-name');
  const npHours = document.getElementById('np-hours');
  const npMinutes = document.getElementById('np-minutes');
  const npSeconds = document.getElementById('np-seconds');
  const npExactTime = document.getElementById('np-exact-time');
  const npPrevLabel = document.getElementById('np-prev-label');
  const npPercentLabel = document.getElementById('np-percent-label');
  const npNextLabel = document.getElementById('np-next-label');
  const npProgressBar = document.getElementById('np-progress-bar');

  if (isAdhanNow) {
    if (badgeText) badgeText.textContent = '🕌 حان الآن وقت';
    if (npName) npName.textContent = prevPrayer.name;
    if (npIcon) npIcon.textContent = prevPrayer.icon;
  } else {
    if (badgeText) badgeText.textContent = 'الصلاة القادمة';
    if (npName) npName.textContent = nextPrayer.name;
    if (npIcon) npIcon.textContent = nextPrayer.icon;
  }

  if (npHours) npHours.textContent = String(hours).padStart(2, '0');
  if (npMinutes) npMinutes.textContent = String(minutes).padStart(2, '0');
  if (npSeconds) npSeconds.textContent = String(seconds).padStart(2, '0');

  if (npExactTime) npExactTime.textContent = formatTime12(nextPrayer.timeStr);
  if (npPrevLabel) npPrevLabel.textContent = prevPrayer.name.replace('صلاة ', '');
  if (npNextLabel) npNextLabel.textContent = nextPrayer.name.replace('صلاة ', '');
  if (npPercentLabel) npPercentLabel.textContent = `${percent}%`;
  if (npProgressBar) npProgressBar.style.width = `${percent}%`;

  // تمييز الكارد القادم في جدول الصلوات
  document.querySelectorAll('.prayer-card').forEach(card => {
    card.classList.remove('is-next-prayer');
  });
  const targetCard = document.querySelector(`.prayer-card[data-prayer-key="${nextPrayer.key}"]`);
  if (targetCard) {
    targetCard.classList.add('is-next-prayer');
  }

  // تحديث حاسبة قيام الليل والثلث الأخير
  updateQiyamCalculator(timings);
}
window.updatePrayerCountdown = updatePrayerCountdown;

// ==========================================
// حاسبة قيام الليل والثلث الأخير الفلكية الشرعية
// ==========================================
function updateQiyamCalculator(timings) {
  const card = document.getElementById('qiyam-night-card');
  if (!card || !timings || !timings.Maghrib || !timings.Fajr) return;

  const now = new Date();

  function parseTime(timeStr, dayOffset = 0) {
    const [h, m] = timeStr.split(':').map(Number);
    const d = new Date(now);
    d.setDate(d.getDate() + dayOffset);
    d.setHours(h, m, 0, 0);
    return d;
  }

  let maghribDate = parseTime(timings.Maghrib, 0);
  let fajrDate = parseTime(timings.Fajr, 0);

  if (now < fajrDate) {
    maghribDate = parseTime(timings.Maghrib, -1);
    fajrDate = parseTime(timings.Fajr, 0);
  } else if (now >= maghribDate) {
    maghribDate = parseTime(timings.Maghrib, 0);
    fajrDate = parseTime(timings.Fajr, 1);
  } else {
    maghribDate = parseTime(timings.Maghrib, 0);
    fajrDate = parseTime(timings.Fajr, 1);
  }

  const totalNightMs = fajrDate - maghribDate;
  const midnightDate = new Date(maghribDate.getTime() + totalNightMs / 2);
  const lastThirdDate = new Date(maghribDate.getTime() + (totalNightMs * 2) / 3);

  const midnightElem = document.getElementById('qiyam-midnight-time');
  const lastThirdElem = document.getElementById('qiyam-last-third-time');
  const fajrElem = document.getElementById('qiyam-fajr-time');
  const banner = document.getElementById('qiyam-live-status-banner');
  const statusText = document.getElementById('qiyam-status-text');

  function fmtDate(d) {
    let h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, '0');
    const ampm = h >= 12 ? 'م' : 'ص';
    h = h % 12 || 12;
    return `${h}:${m} ${ampm}`;
  }

  if (midnightElem) midnightElem.textContent = fmtDate(midnightDate);
  if (lastThirdElem) lastThirdElem.textContent = fmtDate(lastThirdDate);
  if (fajrElem) fajrElem.textContent = fmtDate(fajrDate);

  const isCurrentlyInLastThird = (now >= lastThirdDate && now < fajrDate);

  if (isCurrentlyInLastThird) {
    const diffMs = fajrDate - now;
    const remMin = Math.floor(diffMs / 60000);
    if (banner) {
      banner.style.background = 'linear-gradient(135deg, rgba(214, 168, 92, 0.28), rgba(255, 215, 0, 0.18))';
      banner.style.borderColor = '#ffd700';
      banner.style.boxShadow = '0 0 22px rgba(214, 168, 92, 0.4)';
      banner.style.color = '#fff5db';
    }
    if (statusText) {
      statusText.innerHTML = `✨ <strong>الثلث الأخير من الليل قائم الآن!</strong> وقت النزول الإلهي واستجابة الدعوات (متبقي على الفجر: ${remMin} دقيقة).`;
    }
  } else {
    let nextTarget = lastThirdDate;
    if (now >= fajrDate && now < maghribDate) {
      // نهار اليوم
      nextTarget = lastThirdDate;
    }
    const diffMs = Math.max(0, nextTarget - now);
    const h = Math.floor(diffMs / 3600000);
    const m = Math.floor((diffMs % 3600000) / 60000);
    if (banner) {
      banner.style.background = 'rgba(255, 255, 255, 0.04)';
      banner.style.borderColor = 'rgba(214, 168, 92, 0.2)';
      banner.style.boxShadow = 'none';
      banner.style.color = '#cbd5e1';
    }
    if (statusText) {
      statusText.innerHTML = `⏳ متبقي على بداية الثلث الأخير الليلة: <strong>${h} ساعة و ${m} دقيقة</strong>`;
    }
  }
}
window.updateQiyamCalculator = updateQiyamCalculator;


// 5. فحص الأذان والإشعارات الموسعة الحية
function checkPrayerAdhan() {
  if (!prayerTimings) return;

  const now = new Date();
  const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const todayKey = now.toISOString().split('T')[0];
  const dayOfWeek = now.getDay(); // 5 تعني يوم الجمعة

  if (playedAdhansToday.date !== todayKey) playedAdhansToday = { date: todayKey };
  if (scheduledAzkarToday.date !== todayKey) scheduledAzkarToday = { date: todayKey };

  const prayers = [
    { key: 'Fajr', name: 'أذان الفجر', setting: 'fajr' },
    { key: 'Dhuhr', name: 'أذان الظهر', setting: 'dhuhr' },
    { key: 'Asr', name: 'أذان العصر', setting: 'asr' },
    { key: 'Maghrib', name: 'أذان المغرب', setting: 'maghrib' },
    { key: 'Isha', name: 'أذان العشاء', setting: 'isha' }
  ];

  prayers.forEach(p => {
    if (prayerTimings[p.key] && prayerTimings[p.key].substring(0, 5) === currentHHMM) {
      if (!playedAdhansToday[p.key] && adhanSettings[p.setting]) {
        playedAdhansToday[p.key] = true;
        localStorage.setItem('zad_played_adhans', JSON.stringify(playedAdhansToday));
        triggerAdhanNotification(p.name);
      }
    }
  });

  // --- جدول الإشعارات والتنبيهات المضافة ---

  // 1. أذكار الصباح (بعد الفجر بـ 20 دقيقة)
  if (prayerTimings.Fajr && adhanSettings.sabahAzkar && !scheduledAzkarToday['sabah']) {
    if (addMinutesToTime(prayerTimings.Fajr, 20) === currentHHMM) {
      scheduledAzkarToday['sabah'] = true;
      sendCustomReminder('📿 أذكار الصباح', 'أصبحنا وأصبح الملك لله.. حان وقت قراءة أذكار الصباح لحفظك وحصنك اليومي.');
    }
  }

  // 2. صلاة الضحى (بعد الشروق بـ 20 دقيقة)
  if (prayerTimings.Sunrise && adhanSettings.duhaRemind && !scheduledAzkarToday['duha']) {
    if (addMinutesToTime(prayerTimings.Sunrise, 20) === currentHHMM) {
      scheduledAzkarToday['duha'] = true;
      sendCustomReminder('☀️ صلاة الأوابين (الضحى)', 'ركعتا الضحى تجزئ عن 360 صدقة عن كل مفصل في جسدك.');
    }
  }

  // 3. أذكار المساء (بعد العصر بـ 20 دقيقة)
  if (prayerTimings.Asr && adhanSettings.masaaAzkar && !scheduledAzkarToday['masaa']) {
    if (addMinutesToTime(prayerTimings.Asr, 20) === currentHHMM) {
      scheduledAzkarToday['masaa'] = true;
      sendCustomReminder('🌆 أذكار المساء', 'أمسينا وأمسى الملك لله.. أقبل على أذكار المساء لتحفظ نفسك وأهلك.');
    }
  }

  // 4. ورد قراءة القرآن اليومي (الساعة 6:00 مساءً)
  if (adhanSettings.quranReadRemind && !scheduledAzkarToday['quran_read'] && currentHHMM === '18:00') {
    scheduledAzkarToday['quran_read'] = true;
    sendCustomReminder('📖 ورد القرآن الكريم', 'لا تجعل يومك يمر دون قراءة صفحة أو جزء من كتاب الله.');
  }

  // 5. التذكير بالصلاة على النبي والتسبيح (الساعة 8:30 مساءً)
  if (adhanSettings.salawatRemind && !scheduledAzkarToday['salawat'] && currentHHMM === '20:30') {
    scheduledAzkarToday['salawat'] = true;
    sendCustomReminder('✨ الصلاة على النبي والتسبيح', 'إن الله وملائكته يصلون على النبي.. صلّ على حبيبك ورطب لسانك بالذكر.');
  }

  // 6. أذكار النوم وسورة الملك (الساعة 10:30 مساءً)
  if (adhanSettings.sleepAzkar && !scheduledAzkarToday['sleep'] && currentHHMM === '22:30') {
    scheduledAzkarToday['sleep'] = true;
    sendCustomReminder('🌙 سورة الملك وأذكار النوم', 'لا تنم حتى تقرأ سورة الملك وتتوضأ وتذكر ربك.');
  }

  // 7. صلاة قيام الليل والاستغفار في السحر (الساعة 2:00 صباحاً)
  if (adhanSettings.qiyamRemind && !scheduledAzkarToday['qiyam'] && currentHHMM === '02:00') {
    scheduledAzkarToday['qiyam'] = true;
    sendCustomReminder('🌌 قيام الليل والاستغفار', 'ينزل ربنا إلى السماء الدنيا فيقول: هل من داعٍ فأستجيب له؟ هل من مستغفر فأغفر له؟');
  }

  // 8. التذكير بسورة الكهف والصلاة على النبي يوم الجمعة (الساعة 10:00 صباحاً)
  if (dayOfWeek === 5 && adhanSettings.kahfRemind && !scheduledAzkarToday['kahf'] && currentHHMM === '10:00') {
    scheduledAzkarToday['kahf'] = true;
    sendCustomReminder('🕌 نور ما بين الجمعتين', 'جمعة مباركة! لا تنسَ قراءة سورة الكهف والصلاة والسلام على رسول الله.');
  }

  localStorage.setItem('zad_scheduled_azkar', JSON.stringify(scheduledAzkarToday));
}

function triggerAdhanNotification(prayerName) {
  if (typeof window.showToast === 'function') window.showToast(`🕌 حان الآن وقت ${prayerName}`);
  if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200]);

  try {
    const adhanAudio = new Audio('https://cdn.islamicfinder.org/audio/makkah.mp3');
    adhanAudio.play().catch(e => console.log('يحتاج تفاعل سابق لتشغيل الصوت'));
  } catch (e) {}

  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('زاد المؤمن — مواقيت الصلاة', {
      body: `حان الآن وقت ${prayerName} حسب توقيتك المحلي.`, icon: 'icon-192.png'
    });
  }

  if (isCapacitorAvailable && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications) {
    window.Capacitor.Plugins.LocalNotifications.schedule({
      notifications: [{
        title: 'زاد المؤمن — مواقيت الصلاة',
        body: `حان الآن وقت ${prayerName} حسب توقيتك المحلي.`,
        id: Math.floor(Math.random() * 100000),
        schedule: { at: new Date(Date.now() + 100) }, sound: 'makkah.mp3'
      }]
    });
  }
}

function sendCustomReminder(title, message) {
  if (typeof window.showToast === 'function') window.showToast(`${title}: ${message}`);
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body: message, icon: 'icon-192.png' });
  }

  if (isCapacitorAvailable && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications) {
    window.Capacitor.Plugins.LocalNotifications.schedule({
      notifications: [{
        title: title, body: message,
        id: Math.floor(Math.random() * 100000),
        schedule: { at: new Date(Date.now() + 100) }
      }]
    });
  }
}

function addMinutesToTime(time24, mins) {
  if (!time24) return '00:00';
  const [h, m] = time24.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m + mins, 0);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function scheduleAllDailyNotifications(timings) {
  if (!isCapacitorAvailable || !window.Capacitor.Plugins || !window.Capacitor.Plugins.LocalNotifications) return;

  try {
    window.Capacitor.Plugins.LocalNotifications.cancel({ notifications: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }] });
    const list = [];
    const now = new Date();
    const prayers = [
      { id: 1, key: 'Fajr', title: 'أذان الفجر' }, { id: 2, key: 'Dhuhr', title: 'أذان الظهر' },
      { id: 3, key: 'Asr', title: 'أذان العصر' }, { id: 4, key: 'Maghrib', title: 'أذان المغرب' },
      { id: 5, key: 'Isha', title: 'أذان العشاء' }
    ];

    prayers.forEach(p => {
      const t = timings[p.key];
      if (t) {
        const [h, m] = t.split(':').map(Number);
        const pDate = new Date();
        pDate.setHours(h, m, 0);
        if (pDate > now) {
          list.push({
            id: p.id, title: `زاد المؤمن — ${p.title}`,
            body: `حان الآن وقت ${p.title} حسب توقيتك المحلي.`,
            schedule: { at: pDate }, sound: 'makkah.mp3'
          });
        }
      }
    });

    if (list.length > 0) {
      window.Capacitor.Plugins.LocalNotifications.schedule({ notifications: list });
    }
  } catch (err) {
    console.error('خطأ في جدولة الإشعارات:', err);
  }
}

// 6. التحكم بنافذة التخصيص
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
    if (typeof window.showToast === 'function') window.showToast('تم حفظ التفضيلات والإشعارات بنجاح ✨');
  }
};

// 7. تحديث مظهر الجرم السماوي (الشمس والقمر والشفق) بحسب الوقت الفعلي
function updateCelestialBody() {
  const now = new Date();
  const timeDec = now.getHours() + now.getMinutes() / 60;

  // 1. الفجر إلى الضحى (5:00 ص - 7:00 ص) -> شروق الصباح
  // 2. الضحى إلى الظهر (7:00 ص - 12:30 م) -> شمس قوية وساطعة
  // 3. الظهر إلى العصر (12:30 م - 4:30 م) -> شمس أهدأ وأدفأ
  // 4. العصر إلى المغرب (4:30 م - 6:45 م) -> شفق الغروب الساحر
  // 5. المغرب إلى الفجر (6:45 م - 5:00 ص) -> قمر الليل المنير

  let celestialClass = 'celestial-night';
  let titleText = '🌙 قمر الليل المنير — زاد المؤمن';

  if (timeDec >= 5.0 && timeDec < 7.0) {
    celestialClass = 'celestial-dawn';
    titleText = '🌅 شروق الفجر والصباح — زاد المؤمن';
  } else if (timeDec >= 7.0 && timeDec < 12.5) {
    celestialClass = 'celestial-duha';
    titleText = '☀️ شمس الضحى الساطعة والقوية — زاد المؤمن';
  } else if (timeDec >= 12.5 && timeDec < 16.5) {
    celestialClass = 'celestial-afternoon';
    titleText = '🌤️ شمس الظهيرة والعصر الدافئة — زاد المؤمن';
  } else if (timeDec >= 16.5 && timeDec < 18.75) {
    celestialClass = 'celestial-shafaq';
    titleText = '🌇 شفق الغروب الساحر — زاد المؤمن';
  } else {
    celestialClass = 'celestial-night';
    titleText = '🌙 قمر الليل المنير — زاد المؤمن';
  }

  const elements = document.querySelectorAll('.moon');
  elements.forEach(el => {
    el.classList.remove(
      'celestial-dawn',
      'celestial-duha',
      'celestial-afternoon',
      'celestial-shafaq',
      'celestial-night'
    );
    el.classList.add(celestialClass);
    el.setAttribute('title', titleText);
  });
}
window.updateCelestialBody = updateCelestialBody;

function initZadNotifications() {
  requestNotificationPermissions();
  setupAndroidBackButton();
  updateMakkahTimeAndHijri();
  setInterval(updateMakkahTimeAndHijri, 1000);
  updateCelestialBody();
  setInterval(updateCelestialBody, 15000);
  fetchPrayerTimes();
  setInterval(checkPrayerAdhan, 15000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initZadNotifications);
} else {
  initZadNotifications();
}