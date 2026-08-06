const CACHE_NAME = 'zad-momen-v2'; // 👈 غير رقم النسخة هنا عند كل تحديث جديد

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  // مسح جميع الكاشات والنسخ القديمة المخزنة عند الزوار
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // جلب الملفات المحدثة مباشرة من السيرفر
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
