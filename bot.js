/* ==========================================================================
   🌙 زاد المؤمن - السكربت الموحد للمساعد الرقمي (bot.js)
   تطوير وتصميم: عمر
   ========================================================================== */

// 1. رابط خادم Cloudflare Worker
const WORKER_URL = "https://zad-bot-proxy.almohanadgamer.workers.dev";

// 2. فحص كافة الصفحات المتاحة في التطبيق
const pathname = window.location.pathname;
const isIndexPage = pathname.endsWith('index.html') || pathname.endsWith('/');
const isDuaaPage = pathname.includes('duaa.html');
const isAzkarPage = pathname.includes('azkar.html');
const isEncyclopediaPage = pathname.includes('encyclopedia.html');
const isNamesPage = pathname.includes('names.html');
const isSunnahPage = pathname.includes('sunnah.html');
const isStoriesPage = pathname.includes('stories.html');
const isBooksPage = pathname.includes('books.html');

// 3. تعليمات النظام الصارمة المأخوذة من الملفات القديمة
let SYSTEM_INSTRUCTION = "أنت باحث شرعي ومفتي رقمي مساعد في موقع 'زاد المؤمن'، المطوّر والمصمّم من قِبَل (عمر). مهمتك الإجابة حصراً على الأسئلة الشرعية والدينية والفقهية بكل أدب واحترام. يُلزم عليك دائماً وأبداً دعم جميع الفتاوى والأحكام بذكر الأدلة الشرعية الصريحة والمباشرة من آيات القرآن الكريم والأحاديث النبوية الصحيحة مع ذكر تخريج الحديث (مثل: رواه البخاري، رواه مسلم، صححه الألباني)، والاعتماد على مصادر كبار علماء السنة مثل ابن باز وابن عثيمين وعثمان الخميس وغيرهم مع ذكر المصادر دائماً.\n\nتنبيهات صارمة جداً وضوابط عمل:\n1. مطوّر البوت والموقع: إذا سألك المستخدم من هو مطوّر أو صانع أو مبرمج هذا الموقع/البوت، أجب بوضوح واعتزاز بأن المطوّر والصانع هو (عمر).\n2. التخصص الحصري: إذا كان سؤال المستخدم خارج نطاق العلوم الشرعية والدين الإسلامي (مثل: الألعاب، البرمجة، الرياضة، الطقس، الأسئلة العامة)، يرجى الاعتذار منه بكل أدب ولطف، وإخباره بأنك مساعد مخصص حصراً للإجابات والعلوم الشرعية والدينية في موقع 'زاد المؤمن'.\n3. ضابط السلام الصارم: لا تبدأ إجابتك بالسلام ولا الترحيب (مثل: 'وعليكم السلام' أو 'أهلاً بك') إطلاقاً إلا إذا كتب المستخدم صراحة وبنص العبارة 'السلام عليكم' أو صيغها المباشرة (السلام عليكم / السلام عليكم ورحمة الله / السلام عليكم ورحمة الله وبركاته). أما إذا كتب كلمات مثل 'أهلاً' أو 'مرحباً' أو طرَح سؤاله مباشرة، فلا ترد بالسلام أبداً وابدأ بالإجابة مباشرة.";

// إضافة سياق خاص بكل صفحة للموديل
if (isDuaaPage) {
    SYSTEM_INSTRUCTION += "\n4. سياق خاص بصفحة 'خريطة الدعاء': المستخدم يتصفح حالياً قسم خريطة الدعاء. يُرجى تقديم إجابات متخصصة تدعم مفاهيم هذا القسم (تعريف الدعاء، علاقته بالقدر المبرم والمعلق، أسباب وشروط الاستجابة، موانع الاستجابة، وآداب الدعاء، والرد على الشبهات).";
} else if (isAzkarPage) {
    SYSTEM_INSTRUCTION += "\n4. سياق خاص بصفحة 'الأذكار اليومية': المستخدم يتصفح حالياً قسم الأذكار. يُرجى تقديم إجابات متخصصة تدعم فضائل الأذكار (أذكار الصباح والمساء، أذكار الاستيقاظ والنوم، أذكار بعد الصلاة) وأحكام المداومة عليها وأوقاتها الشرعية الصحيحة.";
} else if (isEncyclopediaPage) {
    SYSTEM_INSTRUCTION += "\n4. سياق خاص بصفحة 'الموسوعة الإسلامية': المستخدم يتصفح حالياً قسم الموسوعة. يُرجى تقديم إجابات متخصصة حول محتويات الموسوعة وأقسامها المختلفة، والإرشاد إلى الأقسام المناسبة.";
} else if (isNamesPage) {
    SYSTEM_INSTRUCTION += "\n4. سياق خاص بصفحة 'أسماء الله الحسنى': المستخدم يتصفح حالياً قسم الأسماء. يُرجى تقديم إجابات متخصصة حول معاني أسماء الله الحسنى، وكيفية التوسل بها في الدعاء، والآيات والأحاديث المتعلقة بها.";
} else if (isSunnahPage) {
    SYSTEM_INSTRUCTION += "\n4. سياق خاص بصفحة 'السنن النبوية اليومية': المستخدم يتصفح قسم السنن. يُرجى تقديم إجابات حول السنن الرواتب، وهدي النبي ﷺ في الحياة اليومية والآداب الشرعية.";
} else if (isStoriesPage) {
    SYSTEM_INSTRUCTION += "\n4. سياق خاص بصفحة 'قصص وإقتباسات إيمانية': المستخدم يتصفح قسم القصص. يُرجى تقديم إجابات حول قصص الأنبياء والصحابة والدروس والعبر المستفادة منها لتقوية اليقين.";
} else if (isBooksPage) {
    SYSTEM_INSTRUCTION += "\n4. سياق خاص بصفحة 'المكتبة والكتب الإسلامية': المستخدم يتصفح قسم المكتبة. يُرجى تقديم إجابات حول أمهات الكتب والمؤلفين وإرشاد القارئ للمراجع النافعة.";
}

// 4. تحديد الرسائل الترحيبية الخاصة بكل صفحة
function getPageWelcomeMessage() {
    if (isDuaaPage) {
        return "أهلاً بك في قسم خريطة الدعاء! 🤲 يمكنك سؤالي هنا عن أي شيء يتعلق بأحكام الدعاء، آدابه، أسباب وموانع الاستجابة، وسأجيبك فوراً مع الأدلة الشرعية بإذن الله.";
    } else if (isAzkarPage) {
        return "أهلاً بك في ركن الأذكار! 📿 يمكنك سؤالي عن فضائل الأذكار، أوقاتها الشرعية، أو أحكام المداومة عليها وسأجيبك فوراً بالأدلة الشرعية الموثقة بإذن الله.";
    } else if (isEncyclopediaPage) {
        return "أهلاً بك في الموسوعة الإسلامية! 📚 يمكنك سؤالي عن أي قسم من أقسام الموسوعة، وسأرشدك إلى ما ينفعك ويجيب على تساؤلاتك بإذن الله.";
    } else if (isNamesPage) {
        return "أهلاً بك في قسم أسماء الله الحسنى! ✨ يمكنك سؤالي عن معاني الأسماء جل جلاله، وكيفية التوسل بها في الدعاء، وأثرها في تزكية النفس بإذن الله.";
    } else if (isSunnahPage) {
        return "أهلاً بك في قسم السنن النبوية اليومية! 🌿 يمكنك سؤالي عن السنن المؤكدة، والرواتب اليومية، وفضائل اتباع هدي النبي ﷺ بإذن الله.";
    } else if (isStoriesPage) {
        return "أهلاً بك في قسم القصص والإقتباسات الإيمانية! 📜 يمكنك سؤالي عن قصص الأنبياء والصحابة والدروس والعبر المستفادة منها بإذن الله.";
    } else if (isBooksPage) {
        return "أهلاً بك في المكتبة والكتب الإسلامية! 📖 يمكنك سؤالي عن أمهات الكتب والمؤلفين وأفضل المراجع الشرعية والتفسير والحديث بإذن الله.";
    } else {
        return "السلام عليكم ورحمة الله وبركاته. أنا **مساعد تبصرة الرقمي**، مرشدك الفقهي والحديثي في موقع 'زاد المؤمن'. يمكنك سؤالي عن الفتاوى والأحكام، وسأجيبك بأدلة موثقة من القرآن والسنة الصحيحة بإذن الله.";
    }
}

// 5. إدارة سجل المحادثات والأرشيف
let currentChatHistory = [];
let archivedChats = JSON.parse(localStorage.getItem('zad_archived_chats')) || [];

document.addEventListener('DOMContentLoaded', () => {
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatMessages = document.getElementById('chat-messages');

    if (!chatForm || !chatInput || !chatMessages) return;

    // نقل المحادثة السابقة للأرشيف عند إعادة فتح الموقع
    const lastActiveChat = JSON.parse(localStorage.getItem('zad_current_active_chat'));
    if (lastActiveChat && lastActiveChat.length > 0) {
        archiveCurrentChat(lastActiveChat);
        localStorage.removeItem('zad_current_active_chat');
    }

    setupHistoryUI(chatMessages);

    // عرض الترحيب التلقائي الخاص بالصفحة المفتوحة فوراً
    const pageWelcomeMsg = getPageWelcomeMessage();
    if (chatMessages.children.length === 0) {
        appendBotMessage(pageWelcomeMsg, 'bot');
        currentChatHistory.push({ role: "assistant", content: pageWelcomeMsg });
        localStorage.setItem('zad_current_active_chat', JSON.stringify(currentChatHistory));
    }

    // معالجة نموذج إرسال الرسائل
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userText = chatInput.value.trim();
        if (!userText) return;

        chatInput.disabled = true;
        const submitBtn = chatForm.querySelector('button');
        if (submitBtn) submitBtn.disabled = true;

        appendBotMessage(userText, 'user');
        chatInput.value = '';

        const loadingDiv = appendBotMessage('⏳ جاري التفكير وتحضير الرد مع الأدلة الشرعية...', 'bot', true);

        currentChatHistory.push({ role: "user", content: userText });
        localStorage.setItem('zad_current_active_chat', JSON.stringify(currentChatHistory));

        const messagesPayload = [
            { role: "system", content: SYSTEM_INSTRUCTION },
            ...currentChatHistory.slice(-10)
        ];

        try {
            const response = await fetch(WORKER_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: "deepseek-chat",
                    messages: messagesPayload,
                    stream: false
                })
            });

            if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

            const data = await response.json();
            let botResponse = data.choices[0].message.content;

            // تطبيق ضابط السلام الصارم
            const userSaidSalam = /السلام\s+عليكم/i.test(userText);
            if (!userSaidSalam) {
                botResponse = botResponse.replace(/^(وعليكم السلام ورحمة الله وبركاته|وعليكم السلام ورحمة الله|وعليكم السلام|السلام عليكم ورحمة الله وبركاته|السلام عليكم)[!،.\n\s]*/gi, '').trim();
            }

            if (loadingDiv) loadingDiv.remove();
            appendBotMessage(botResponse, 'bot');

            currentChatHistory.push({ role: "assistant", content: botResponse });
            localStorage.setItem('zad_current_active_chat', JSON.stringify(currentChatHistory));

        } catch (error) {
            if (loadingDiv) loadingDiv.remove();
            appendBotMessage('عذراً، حدث خطأ في الاتصال بالخادم: ' + error.message, 'bot');
        } finally {
            chatInput.disabled = false;
            if (submitBtn) submitBtn.disabled = false;
            chatInput.focus();
        }
    });

    // دالة عرض الرسائل وإضافة خيارات التفاعل (نسخ ومشاركة)
    function appendBotMessage(text, sender, isLoading = false) {
        const msgDiv = document.createElement('div');
        
        if (sender === 'user') {
            msgDiv.style.cssText = "background: #d6a85c; color: #1a1200; padding: 10px 14px; border-radius: 14px 14px 0 14px; align-self: flex-end; max-width: 85%; font-weight: bold; font-size: 0.9rem; line-height: 1.6; margin-bottom: 8px;";
            msgDiv.innerHTML = text.replace(/\n/g, '<br>');
        } else {
            msgDiv.style.cssText = "background: rgba(255,255,255,0.06); color: #f3efe3; padding: 10px 14px; border-radius: 14px 14px 14px 0; align-self: flex-start; max-width: 88%; font-size: 0.9rem; line-height: 1.7; margin-bottom: 8px;";
            
            const contentDiv = document.createElement('div');
            contentDiv.innerHTML = text.replace(/\n/g, '<br>');
            msgDiv.appendChild(contentDiv);

            if (!isLoading) {
                const actionsDiv = document.createElement('div');
                actionsDiv.style.cssText = "display: flex; gap: 8px; margin-top: 10px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 0.75rem;";
                
                const copyBtn = document.createElement('button');
                copyBtn.innerHTML = "📋 نسخ النص";
                copyBtn.style.cssText = "background: rgba(214, 168, 92, 0.15); border: 1px solid rgba(214, 168, 92, 0.4); color: #d6a85c; padding: 3px 8px; border-radius: 5px; cursor: pointer; font-family: 'Tajawal', sans-serif;";
                copyBtn.onclick = () => {
                    navigator.clipboard.writeText(text);
                    copyBtn.innerHTML = "✅ تم النسخ!";
                    setTimeout(() => copyBtn.innerHTML = "📋 نسخ النص", 2000);
                };

                const waBtn = document.createElement('button');
                waBtn.innerHTML = "🟢 مشاركة بالواتساب";
                waBtn.style.cssText = "background: rgba(37, 211, 102, 0.15); border: 1px solid rgba(37, 211, 102, 0.4); color: #25D366; padding: 3px 8px; border-radius: 5px; cursor: pointer; font-family: 'Tajawal', sans-serif;";
                waBtn.onclick = () => {
                    const shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent("*من موقع زاد المؤمن:*\n\n" + text + "\n\n🔗 " + window.location.href)}`;
                    window.open(shareUrl, '_blank');
                };

                actionsDiv.appendChild(copyBtn);
                actionsDiv.appendChild(waBtn);
                msgDiv.appendChild(actionsDiv);
            }
        }

        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return msgDiv;
    }

    function archiveCurrentChat(messages) {
        if (!messages || messages.length === 0) return;
        const timeString = new Date().toLocaleString('ar-SA', { dateStyle: 'short', timeStyle: 'short' });
        archivedChats.unshift({ id: Date.now(), date: timeString, messages: messages });
        if (archivedChats.length > 20) archivedChats.pop();
        localStorage.setItem('zad_archived_chats', JSON.stringify(archivedChats));
    }

    function setupHistoryUI(container) {
        let chatWindow = document.getElementById('chat-window');
        const headerBar = document.createElement('div');
        headerBar.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 6px 12px; margin-bottom: 10px; background: rgba(0,0,0,0.2); border-radius: 8px;";
        headerBar.innerHTML = `
            <span style="font-size: 0.85rem; color: #d6a85c; font-weight: bold;">💬 المحادثة الحالية</span>
            <button id="open-history-btn" style="background: rgba(214, 168, 92, 0.15); border: 1px solid #d6a85c; color: #d6a85c; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 0.8rem; font-family: 'Tajawal', sans-serif;">📜 سجل المحادثات</button>
        `;

        if (chatWindow) {
            chatWindow.insertBefore(headerBar, container);
        } else {
            container.parentNode.insertBefore(headerBar, container);
        }

        const modal = document.createElement('div');
        modal.id = 'history-modal';
        modal.style.cssText = "display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 999999; justify-content: center; align-items: center; padding: 20px;";
        modal.innerHTML = `
            <div style="background: #141d3d; border: 1px solid #d6a85c; width: 100%; max-width: 500px; max-height: 80vh; border-radius: 12px; display: flex; flex-direction: column; overflow: hidden; color: #f3efe3;">
                <div style="padding: 12px 16px; background: rgba(214,168,92,0.1); border-bottom: 1px solid rgba(214,168,92,0.2); display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0; font-size: 1rem; color: #d6a85c;">📜 أرشيف المحادثات السابقة</h3>
                    <button id="close-history-btn" style="background: none; border: none; color: #aaa; font-size: 1.2rem; cursor: pointer;">✕</button>
                </div>
                <div id="history-list" style="padding: 16px; overflow-y: auto; flex: 1;"></div>
            </div>
        `;
        document.body.appendChild(modal);

        document.addEventListener('click', (e) => {
            if (e.target.id === 'open-history-btn' || e.target.closest('#open-history-btn')) {
                renderHistoryList();
                modal.style.display = 'flex';
            }
        });

        document.getElementById('close-history-btn').addEventListener('click', () => {
            modal.style.display = 'none';
        });

        document.getElementById('history-list').addEventListener('click', (e) => {
            if (e.target.classList.contains('resume-btn')) {
                const sessionId = Number(e.target.getAttribute('data-id'));
                resumeArchivedSession(sessionId);
            }
        });
    }

    function renderHistoryList() {
        const listContainer = document.getElementById('history-list');
        const archives = JSON.parse(localStorage.getItem('zad_archived_chats')) || [];

        if (archives.length === 0) {
            listContainer.innerHTML = `<p style="text-align: center; color: #888; font-size: 0.9rem;">لا توجد محادثات محفوظة في الأرشيف بعد.</p>`;
            return;
        }

        listContainer.innerHTML = archives.map((session) => {
            const firstMsg = session.messages.find(m => m.role === 'user')?.content || 'محادثة بدون عنوان';
            return `
                <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(214,168,92,0.15); padding: 12px; border-radius: 8px; margin-bottom: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                        <span style="font-size: 0.75rem; color: #d6a85c;">📅 ${session.date}</span>
                        <button class="resume-btn" data-id="${session.id}" style="background: #d6a85c; color: #1a1200; border: none; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 0.75rem; cursor: pointer; font-family: 'Tajawal', sans-serif;">🔄 استكمال</button>
                    </div>
                    <div style="font-size: 0.85rem; color: #eee; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${firstMsg}</div>
                </div>
            `;
        }).join('');
    }

    function resumeArchivedSession(id) {
        const archives = JSON.parse(localStorage.getItem('zad_archived_chats')) || [];
        const targetIndex = archives.findIndex(s => s.id === id);

        if (targetIndex === -1) return;

        if (currentChatHistory.length > 0) {
            archiveCurrentChat(currentChatHistory);
        }

        const selectedSession = archives.splice(targetIndex, 1)[0];
        currentChatHistory = selectedSession.messages;

        localStorage.setItem('zad_archived_chats', JSON.stringify(archives));
        localStorage.setItem('zad_current_active_chat', JSON.stringify(currentChatHistory));

        chatMessages.innerHTML = '';
        currentChatHistory.forEach(msg => {
            appendBotMessage(msg.content, msg.role === 'user' ? 'user' : 'bot');
        });

        document.getElementById('history-modal').style.display = 'none';
    }
});
