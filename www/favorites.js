/* ==========================================================================
   🌙 زاد المؤمن - نظام المفضلة والمحفوظات الإيمانية الشامل (favorites.js)
   المؤلف: عمر
   الوظيفة: حفظ وإدارة المفضلة الشخصية لجميع الأقسام أوفلاين 100%
   ========================================================================== */

(function(window, document) {
  'use strict';

  const STORAGE_KEY = 'zad_favorites_v1';

  const ZadFavorites = {
    getAll: function() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
      } catch (e) {
        return [];
      }
    },

    isFavorited: function(id) {
      if (!id) return false;
      const list = this.getAll();
      return list.some(item => String(item.id) === String(id));
    },

    toggle: function(item) {
      if (!item || !item.id) return false;
      let list = this.getAll();
      const existingIndex = list.findIndex(i => String(i.id) === String(item.id));
      let isAdded = false;

      if (existingIndex !== -1) {
        list.splice(existingIndex, 1);
        isAdded = false;
        this.showToast('🗑️ تم إزالة العنصر من المفضلة');
      } else {
        const itemType = item.type || item.category || 'general';
        const newItem = {
          id: String(item.id),
          title: item.title || item.name || 'محتوى إيماني',
          type: itemType,
          categoryLabel: item.categoryLabel || this.getCategoryLabel(itemType),
          icon: item.icon || '⭐',
          snippet: item.snippet || item.preview || item.desc || item.meaning || item.evidence || item.text || '',
          link: item.link || '#',
          savedAt: Date.now()
        };
        list.unshift(newItem);
        isAdded = true;
        this.showToast('✨ تمت الإضافة إلى مفضلتي بنجاح!');
      }

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      } catch (e) {
        console.warn('Storage error:', e);
      }

      this.updateBadge();
      this.notifyListeners(item.id, isAdded);

      const modal = document.getElementById('zadFavoritesModal');
      if (modal && modal.classList.contains('open')) {
        this.renderList();
      }

      return isAdded;
    },

    remove: function(id) {
      if (!id) return;
      let list = this.getAll();
      list = list.filter(i => String(i.id) !== String(id));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      this.updateBadge();
      this.showToast('🗑️ تم إزالة العنصر من المفضلة');
      this.notifyListeners(id, false);
      this.renderList();
    },

    clearAll: function() {
      if (confirm('هل أنت متأكد من رغبتك في حذف جميع المحفوظات من المفضلة؟')) {
        localStorage.removeItem(STORAGE_KEY);
        this.updateBadge();
        this.renderList();
        this.showToast('✨ تم مسح قائمة المفضلة بالكامل');
      }
    },

    getCategoryLabel: function(type) {
      switch (type) {
        case 'yaqeen': return '💎 اليقين بالله';
        case 'duaa': return '🤲 خريطة الدعاء';
        case 'qa': return '❓ بنك الأسئلة';
        case 'names': return '✨ أسماء الله';
        case 'sunnah': return '🌱 السنن النبوية';
        case 'stories': return '📜 القصص والعبر';
        case 'azkar': return '📿 الأذكار';
        case 'books': return '📚 المكتبة';
        case 'daily': return '📖 آية وحديث';
        default: return '⭐ محفوظ';
      }
    },

    updateBadge: function() {
      const list = this.getAll();
      const count = list.length;
      const badges = document.querySelectorAll('.fav-badge');
      badges.forEach(b => {
        b.textContent = count > 99 ? '99+' : count;
        b.style.display = count > 0 ? 'inline-flex' : 'none';
      });
    },

    listeners: [],
    addListener: function(fn) {
      if (typeof fn === 'function') this.listeners.push(fn);
    },
    notifyListeners: function(id, isFavorited) {
      this.listeners.forEach(fn => {
        try { fn(id, isFavorited); } catch (e) {}
      });
    },

    showToast: function(msg) {
      if (typeof window.showToast === 'function') {
        window.showToast(msg);
        return;
      }
      let toast = document.getElementById('fav-toast');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'fav-toast';
        toast.style.cssText = `
          position: fixed;
          bottom: 85px;
          left: 50%;
          transform: translateX(-50%) translateY(20px);
          background: rgba(15, 23, 48, 0.98);
          border: 1.5px solid #d6a85c;
          color: #ffffff;
          padding: 12px 26px;
          border-radius: 30px;
          z-index: 9999999;
          font-family: 'Tajawal', sans-serif;
          font-size: 0.95rem;
          font-weight: bold;
          box-shadow: 0 10px 35px rgba(0,0,0,0.7);
          backdrop-filter: blur(14px);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          opacity: 0;
          pointer-events: none;
        `;
        document.body.appendChild(toast);
      }
      toast.textContent = msg;
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(-50%) translateY(0)';
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(20px)';
      }, 2200);
    },

    buildModalDOM: function() {
      if (document.getElementById('zadFavoritesModal')) return;

      const modalHtml = `
      <div class="fav-modal-overlay" id="zadFavoritesModal" onclick="ZadFavorites.closeModal(event)">
        <div class="fav-modal-card" onclick="event.stopPropagation()">
          <div class="fav-modal-header">
            <div class="fav-modal-title">
              <span class="fav-title-star">⭐</span>
              <div>
                <h3>مفضلتي ومحفوظاتي الإيمانية</h3>
                <p>مرجعك الشامل لمواضيعك وأدعيتك وسننك وأذكارك المحفوظة</p>
              </div>
            </div>
            <button type="button" class="fav-modal-close" onclick="ZadFavorites.closeModal()" title="إغلاق">✕</button>
          </div>

          <!-- شريط الفلاتر والتصنيفات الموسع ليشمل كافة الأقسام -->
          <div class="fav-filter-tabs">
            <button type="button" class="fav-tab-btn active" data-filter="all" onclick="ZadFavorites.setFilter('all', this)">الكل</button>
            <button type="button" class="fav-tab-btn" data-filter="yaqeen" onclick="ZadFavorites.setFilter('yaqeen', this)">💎 اليقين</button>
            <button type="button" class="fav-tab-btn" data-filter="duaa" onclick="ZadFavorites.setFilter('duaa', this)">🤲 الدعاء</button>
            <button type="button" class="fav-tab-btn" data-filter="qa" onclick="ZadFavorites.setFilter('qa', this)">❓ الأسئلة</button>
            <button type="button" class="fav-tab-btn" data-filter="names" onclick="ZadFavorites.setFilter('names', this)">✨ أسماء الله</button>
            <button type="button" class="fav-tab-btn" data-filter="sunnah" onclick="ZadFavorites.setFilter('sunnah', this)">🌱 السنن</button>
            <button type="button" class="fav-tab-btn" data-filter="azkar" onclick="ZadFavorites.setFilter('azkar', this)">📿 الأذكار</button>
            <button type="button" class="fav-tab-btn" data-filter="stories" onclick="ZadFavorites.setFilter('stories', this)">📜 القصص</button>
            <button type="button" class="fav-tab-btn" data-filter="books" onclick="ZadFavorites.setFilter('books', this)">📚 المكتبة</button>
            <button type="button" class="fav-tab-btn" data-filter="daily" onclick="ZadFavorites.setFilter('daily', this)">📖 آية وحديث</button>
          </div>

          <!-- قائمة العناصر المحفوظة -->
          <div class="fav-list-container" id="favListContainer"></div>

          <!-- التذييل وإجراءات القائمة -->
          <div class="fav-modal-footer">
            <button type="button" class="fav-btn-clear" onclick="ZadFavorites.clearAll()">
              <span>🗑️ مسح الكل</span>
            </button>
            <button type="button" class="fav-btn-done" onclick="ZadFavorites.closeModal()">
              <span>تم وإغلاق</span>
            </button>
          </div>
        </div>
      </div>
      `;

      const div = document.createElement('div');
      div.innerHTML = modalHtml;
      document.body.appendChild(div.firstElementChild);
    },

    currentFilter: 'all',

    setFilter: function(filter, btn) {
      this.currentFilter = filter;
      document.querySelectorAll('.fav-tab-btn').forEach(b => b.classList.remove('active'));
      if (btn) btn.classList.add('active');
      this.renderList();
    },

    openModal: function() {
      this.buildModalDOM();
      const modal = document.getElementById('zadFavoritesModal');
      if (modal) {
        modal.classList.add('open');
        document.body.style.overflow = 'hidden';
        this.renderList();
      }
    },

    closeModal: function(e) {
      if (e && e.target !== e.currentTarget && !e.target.classList.contains('fav-modal-close')) return;
      const modal = document.getElementById('zadFavoritesModal');
      if (modal) {
        modal.classList.remove('open');
        document.body.style.overflow = '';
      }
    },

    renderList: function() {
      const container = document.getElementById('favListContainer');
      if (!container) return;

      const list = this.getAll();
      const filter = this.currentFilter;
      const filteredList = (filter === 'all') ? list : list.filter(i => i.type === filter);

      if (filteredList.length === 0) {
        container.innerHTML = `
          <div class="fav-empty-state">
            <div class="fav-empty-icon">⭐</div>
            <h4>لا توجد عناصر محفوظة في هذا القسم</h4>
            <p>اضغط على رمز النجمة ⭐ داخل أي قسم (المواضيع، الأسئلة، أسماء الله، السنن، الأذكار) لحفظ ما تحب هنا.</p>
          </div>
        `;
        return;
      }

      let html = '';
      filteredList.forEach(item => {
        const snippetHtml = item.snippet ? `<p class="fav-item-snippet">${item.snippet}</p>` : '';
        const actionClick = item.link ? `onclick="window.location.href='${item.link}'"` : '';

        html += `
          <div class="fav-card-item">
            <div class="fav-item-main" ${actionClick}>
              <div class="fav-item-badge">
                <span>${item.icon || '⭐'}</span>
                <span>${item.categoryLabel || 'محفوظ'}</span>
              </div>
              <h4 class="fav-item-title">${item.title}</h4>
              ${snippetHtml}
            </div>
            <div class="fav-item-actions">
              ${item.link ? `<a href="${item.link}" class="fav-action-link" title="فتح المحتوى مباشرة">عرض ←</a>` : ''}
              <button type="button" class="fav-action-delete" onclick="ZadFavorites.remove('${item.id}')" title="حذف من المفضلة">🗑️</button>
            </div>
          </div>
        `;
      });

      container.innerHTML = html;
    },

    init: function() {
      this.buildModalDOM();

      // فحص وجود شريط الأدوات العائم (#readerFloatingBar)
      const readerBar = document.getElementById('readerFloatingBar');
      if (readerBar) {
        // إدراج زر النجمة داخل شريط الأدوات مباشرة بجانب زر الثيم لمنع أي تداخل
        if (!document.getElementById('favBarBtn')) {
          const favToolBtn = document.createElement('button');
          favToolBtn.type = 'button';
          favToolBtn.id = 'favBarBtn';
          favToolBtn.className = 'reader-tool-btn fav-tool-btn';
          favToolBtn.setAttribute('title', 'مفضلتي ومحفوظاتي الإيمانية');
          favToolBtn.style.position = 'relative';
          favToolBtn.innerHTML = `⭐<span class="fav-badge" style="display:none;">0</span>`;
          favToolBtn.onclick = () => this.openModal();

          const themeBtn = document.getElementById('themeBtn');
          if (themeBtn && themeBtn.nextSibling) {
            readerBar.insertBefore(favToolBtn, themeBtn.nextSibling);
          } else {
            readerBar.appendChild(favToolBtn);
          }
        }
      } else {
        // في الصفحات التي لا تحتوي على شريط الأدوات (مثل الرئيسية والموسوعة): نضعه في أعلى اليمين بمكان مخصص وواضح
        if (!document.getElementById('favQuickBtn')) {
          const favBtn = document.createElement('button');
          favBtn.id = 'favQuickBtn';
          favBtn.className = 'fav-quick-btn';
          favBtn.setAttribute('aria-label', 'المفضلة والمحفوظات');
          favBtn.setAttribute('title', 'مفضلتي ومحفوظاتي الإيمانية');
          favBtn.innerHTML = `⭐<span class="fav-badge" style="display:none;">0</span>`;
          favBtn.onclick = () => this.openModal();
          document.body.appendChild(favBtn);
        }
      }

      this.updateBadge();
    }
  };

  window.ZadFavorites = ZadFavorites;
  window.openFavoritesModal = function() {
    ZadFavorites.openModal();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ZadFavorites.init());
  } else {
    ZadFavorites.init();
  }

})(window, document);
