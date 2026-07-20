// 1. رابط خادم الأمان الخاص بك في Cloudflare
const WORKER_URL = "https://zad-bot-proxy.almohanadgamer.workers.dev";

// 2. فحص الصفحة الحالية لتحديد السياق (مثل صفحة خريطة الدعاء)
const isDuaaPage = window.location.pathname.includes('duaa.html');

// 3. بناء تعليمات النظام الديناميكية
let SYSTEM_INSTRUCTION = "أنت باحث شرعي ومفتي رقمي مساعد في موقع 'زاد المؤمن'، المطوّر والمصمّم من قِبَل (عمر). مهمتك الإجابة حصراً على الأسئلة الشرعية والدينية والفقهية بكل أدب واحترام. يُلزم عليك دائماً وأبداً دعم جميع الفتاوى والأحكام بذكر الأدلة الشرعية الصريحة والمباشرة من آيات القرآن الكريم والأحاديث النبوية الصحيحة مع ذكر تخريج الحديث (مثل: رواه البخاري، رواه مسلم، صححه الألباني)، والاعتماد على مصادر كبار علماء السنة مثل ابن باز وابن عثيمين وعثمان الخميس وغيرهم مع ذكر المصادر دائماً.\n\nتنبيهات صارمة جداً وضوابط عمل:\n1. مطوّر البوت والموقع: إذا سألك المستخدم من هو مطوّر أو صانع أو مبرمج هذا الموقع/البوت، أجب بوضوح واعتزاز بأن المطوّر والصانع هو (عمر).\n2. التخصص الحصري: إذا كان سؤال المستخدم خارج نطاق العلوم الشرعية والدين الإسلامي (مثل: الألعاب، البرمجة، الرياضة، الطقس، الأسئلة العامة)، يرجى الاعتذار منه بكل أدب ولطف، وإخباره بأنك مساعد مخصص حصراً للإجابات والعلوم الشرعية والدينية في موقع 'زاد المؤمن'.\n3. عدم تكرار السلام: لا تبدأ إجابتك بالسلام أو الترحيب (مثل: 'وعليكم السلام' أو 'أهلاً بك') إلا إذا ألقى عليك المستخدم السلام أولاً في رسالته، وابدأ في الإجابة عن السؤال مباشرة.";

// إضافة سياق خريطة الدعاء تلقائياً إذا كان المستخدم في صفحة duaa.html
if (isDuaaPage) {
    SYSTEM_INSTRUCTION += "\n4. سياق خاص بصفحة 'خريطة الدعاء': المستخدم يتصفح حالياً قسم خريطة الدعاء في الموقع. يُرجى تقديم إجابات متخصصة ومفصلة تدعم مفاهيم هذا القسم (تعريف الدعاء، علاقته بالقدر المبرم والمعلق، أسباب وشروط الاستجابة، موانع الاستجابة، وآداب الدعاء، والرد على الشبهات المعاصرة حول الدعاء) والإجابة عن أي استفسار يخص هذه المفاهيم بدقة.";
}

// 4. إدارة الجلسات والأرشيف
let currentChatHistory = [];
let archivedChats = JSON.parse(localStorage.getItem('zad_archived_chats')) || [];

document.addEventListener('DOMContentLoaded', () => {
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatMessages = document.getElementById('chat-messages');

    if (!chatForm || !chatInput || !chatMessages) return;

    // --- نقل المحادثة السابقة للأرشيف عند دخول الموقع من جديد ---
    const lastActiveChat = JSON.parse(localStorage.getItem('zad_current_active_chat'));
    if (lastActiveChat && lastActiveChat.length > 0) {
        archiveCurrentChat(lastActiveChat);
        localStorage.removeItem('zad_current_active_chat'); // تصفير الشات الرئيسي
    }

    // --- إعداد واجهة سجل المحادثات ---
    setupHistoryUI(chatMessages);

    // --- معالجة إرسال الرسائل ---
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userText = chatInput.value.trim();
        if (!userText) return;

        chatInput.disabled = true;
        const submitBtn = chatForm.querySelector('button');
        if (submitBtn) submitBtn.disabled = true;

        appendBotMessage(userText, 'user');
        chatInput.value = '';

        const loadingDiv = appendBotMessage('جاري التفكير وتحضير الرد مع الأدلة الشرعية...', 'bot', true);

        currentChatHistory.push({ role: "user", content: userText });
        localStorage.setItem('zad_current_active_chat', JSON.stringify(currentChatHistory));

        const messagesPayload = [
            { role: "system", content: SYSTEM_INSTRUCTION },
            ...currentChatHistory.slice(-10)
        ];

        try {
            const response = await fetch(WORKER_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: "deepseek-chat",
                    messages: messagesPayload,
                    stream: false
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            let botResponse = data.choices[0].message.content;

            // فلترة السلام برمجياً إذا لم يسلم المستخدم
            const userDidGreet = /سلام|مرحبا|أهلا|اهلا|مسي/i.test(userText);
            if (!userDidGreet) {
                botResponse = botResponse.replace(/^(وعليكم السلام ورحمة الله وبركاته|وعليكم السلام ورحمة الله|وعليكم السلام|السلام عليكم ورحمة الله وبركاته|السلام عليكم|أهلاً وسهلاً بك|أهلاً بك|مرحباً بك|مرحباً|أهلاً)[!،.\n\s]*/gi, '').trim();
            }

            if (loadingDiv) loadingDiv.remove();
            appendBotMessage(botResponse, 'bot');

            currentChatHistory.push({ role: "assistant", content: botResponse });
            localStorage.setItem('zad_current_active_chat', JSON.stringify(currentChatHistory));

        } catch (error) {
            console.error('تفاصيل الخطأ:', error);
            if (loadingDiv) loadingDiv.remove();
            appendBotMessage('عذراً، حدث خطأ: ' + error.message, 'bot');
        } finally {
            chatInput.disabled = false;
            if (submitBtn) submitBtn.disabled = false;
            chatInput.focus();
        }
    });

    function appendBotMessage(text, sender, isLoading = false) {
        const msgDiv = document.createElement('div');
        
        if (sender === 'user') {
            msgDiv.style.cssText = "background: #d6a85c; color: #1a1200; padding: 10px 14px; border-radius: 14px 14px 0 14px; align-self: flex-end; max-width: 85%; font-weight: bold; font-size: 0.9rem; line-height: 1.6; margin-bottom: 8px;";
        } else {
            msgDiv.style.cssText = "background: rgba(255,255,255,0.06); color: #f3efe3; padding: 10px 14px; border-radius: 14px 14px 14px 0; align-self: flex-start; max-width: 85%; font-size: 0.9rem; line-height: 1.6; margin-bottom: 8px;";
        }

        msgDiv.innerHTML = text.replace(/\n/g, '<br>');
        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return msgDiv;
    }

    function archiveCurrentChat(messages) {
        if (!messages || messages.length === 0) return;
        const timeString = new Date().toLocaleString('ar-SA', { dateStyle: 'short', timeStyle: 'short' });
        archivedChats.unshift({
            id: Date.now(),
            date: timeString,
            messages: messages
        });
        localStorage.setItem('zad_archived_chats', JSON.stringify(archivedChats));
    }

    // --- واجهة سجل المحادثات واستكمال الجلسات ---
    function setupHistoryUI(container) {
        const headerBar = document.createElement('div');
        headerBar.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 6px 12px; margin-bottom: 10px; background: rgba(0,0,0,0.2); border-radius: 8px;";
        
        headerBar.innerHTML = `
            <span style="font-size: 0.85rem; color: #d6a85c; font-weight: bold;">💬 المحادثة الحالية</span>
            <button id="open-history-btn" style="background: rgba(214, 168, 92, 0.15); border: 1px solid #d6a85c; color: #d6a85c; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 0.8rem;">📜 سجل المحادثات</button>
        `;

        container.parentNode.insertBefore(headerBar, container);

        const modal = document.createElement('div');
        modal.id = 'history-modal';
        modal.style.cssText = "display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 9999; justify-content: center; align-items: center; padding: 20px;";
        
        modal.innerHTML = `
            <div style="background: #181512; border: 1px solid #d6a85c; width: 100%; max-width: 500px; max-height: 80vh; border-radius: 12px; display: flex; flex-direction: column; overflow: hidden; color: #f3efe3;">
                <div style="padding: 12px 16px; background: rgba(214,168,92,0.1); border-bottom: 1px solid rgba(214,168,92,0.2); display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0; font-size: 1rem; color: #d6a85c;">📜 أرشيف المحادثات السابقة</h3>
                    <button id="close-history-btn" style="background: none; border: none; color: #aaa; font-size: 1.2rem; cursor: pointer;">✕</button>
                </div>
                <div id="history-list" style="padding: 16px; overflow-y: auto; flex: 1;"></div>
            </div>
        `;
        document.body.appendChild(modal);

        document.getElementById('open-history-btn').addEventListener('click', () => {
            renderHistoryList();
            modal.style.display = 'flex';
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
                        <button class="resume-btn" data-id="${session.id}" style="background: #d6a85c; color: #1a1200; border: none; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 0.75rem; cursor: pointer;">🔄 استكمال هذه المحادثة</button>
                    </div>
                    <div style="font-size: 0.85rem; color: #eee; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${firstMsg}</div>
                    <details style="margin-top: 8px; font-size: 0.8rem; color: #ccc;">
                        <summary style="cursor: pointer; color: #d6a85c;">عرض المحادثة كاملة</summary>
                        <div style="margin-top: 8px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 8px;">
                            ${session.messages.map(m => `
                                <div style="margin-bottom: 6px;">
                                    <strong style="color: ${m.role === 'user' ? '#d6a85c' : '#7aa2f7'}">${m.role === 'user' ? 'المستخدم:' : 'تبصرة:'}</strong>
                                    <div>${m.content.replace(/\n/g, '<br>')}</div>
                                </div>
                            `).join('')}
                        </div>
                    </details>
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