// ⚡ تحديث صامت في الخلفية بدون إظهار أي بنرات أو إزعاج للمستخدم
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').then(registration => {
        registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker == null) return;
            
            installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    // تحديث ملفات الكاش في الخلفية بنعومة
                    if (registration.waiting) {
                        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                    }
                }
            };
        };
    }).catch(err => {
        console.log('SW registration failure:', err);
    });
}
