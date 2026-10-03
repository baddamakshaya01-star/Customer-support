const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:8000'
    : 'https://customer-support-pxyn.onrender.com';

// ─── State ─────────────────────────────────────────────────────
let currentCustomerId  = null;
let previousFactCount  = 0;
let escalationCount    = 0;
let frustrationHistory = [];
let currentPage        = 'livechat';

// ─── DOM Refs ───────────────────────────────────────────────────
const consoleSidebar    = document.getElementById('console-sidebar');
const sidebarToggleBtn  = document.getElementById('sidebar-toggle-btn');
const breadcrumbCurrent = document.getElementById('breadcrumb-current');

const messageInput      = document.getElementById('message-input');
const sendBtn           = document.getElementById('send-btn');
const charCount         = document.getElementById('char-count');
const chatMessagesArea  = document.getElementById('chat-messages-area');
const chatWelcome       = document.getElementById('chat-welcome');
const escalationBanner  = document.getElementById('escalation-banner');
const bannerViewBtn     = document.getElementById('banner-view-btn');
const escalationModal   = document.getElementById('escalation-modal');
const escalationSummary = document.getElementById('escalation-summary');
const closeModal        = document.getElementById('close-modal');
const closeModalBtn     = document.getElementById('close-modal-btn');
const ackModalBtn       = document.getElementById('ack-modal-btn');
const chatCustomerTag   = document.getElementById('chat-customer-tag');
const chatEscPill       = document.getElementById('chat-escalation-pill');
const chatColTitle      = document.getElementById('chat-col-title');
const escCountBadge     = document.getElementById('esc-count-badge');
const notifDot          = document.getElementById('notif-dot');

// Memory card
const memoryEmpty       = document.getElementById('memory-empty');
const mcProfile         = document.getElementById('mc-profile');
const mcAvatar          = document.getElementById('mc-avatar');
const mcName            = document.getElementById('mc-name');
const mcEmail           = document.getElementById('mc-email');
const mcEnv             = document.getElementById('mc-env');
const mcEnvBar          = document.getElementById('mc-env-bar');
const mcTicketsSec      = document.getElementById('mc-tickets-sec');
const mcTicketsList     = document.getElementById('mc-tickets-list');
const mcFactsSec        = document.getElementById('mc-facts-sec');
const mcFactsList       = document.getElementById('mc-facts-list');
const mcFactsCount      = document.getElementById('mc-facts-count');
const mcFrustrationSec  = document.getElementById('mc-frustration-sec');
const mcFrustrationScore= document.getElementById('mc-frustration-score');
const mcFrustrationBar  = document.getElementById('mc-frustration-bar');
const mcChartLine       = document.getElementById('mc-chart-line');

// Customer list items
const customerItems     = document.querySelectorAll('.customer-item');
const lookupInput       = document.getElementById('lookup-input');
const lookupBtn         = document.getElementById('lookup-btn');

// ─── Sidebar Toggle ─────────────────────────────────────────────
sidebarToggleBtn.addEventListener('click', () => {
    consoleSidebar.classList.toggle('collapsed');
});

// ─── Navigation ─────────────────────────────────────────────────
document.querySelectorAll('.csb-nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const page = item.dataset.page;
        if (page) switchPage(page);
    });
});

document.getElementById('home-goto-chat')?.addEventListener('click', (e) => {
    e.preventDefault();
    switchPage('livechat');
});

document.getElementById('btn-new-chat')?.addEventListener('click', () => {
    switchPage('livechat');
    clearChat();
    currentCustomerId = null;
    deselectAllCustomers();
});

function switchPage(page) {
    if (page === 'chat') page = 'livechat';
    currentPage = page;

    // Hide all pages
    document.querySelectorAll('.page-content').forEach(p => p.classList.add('hidden'));
    // Show target
    const target = document.getElementById(`page-${page}`);
    if (target) target.classList.remove('hidden');

    // Update sidebar active state
    document.querySelectorAll('.csb-nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.page === page);
    });

    // Update breadcrumb
    const labels = {
        home: 'Home', livechat: 'Live Chat', customers: 'Customers',
        tickets: 'Tickets', escalations: 'Escalations',
        analytics: 'Analytics', knowledge: 'Knowledge Base', settings: 'Settings'
    };
    breadcrumbCurrent.textContent = labels[page] || page;

    // Update URL hash cleanly
    if (window.location.hash !== `#${page}`) {
        history.replaceState(null, '', `#${page}`);
    }

    if (page === 'home') loadHomePage();
    if (page === 'analytics') loadAnalytics();
    if (page === 'customers') loadCustomersPage();
    if (page === 'tickets') loadTicketsPage();
    if (page === 'escalations') loadEscalationsPage();
    if (page === 'livechat') loadCustomerPicker();
    if (page === 'settings') loadSettingsPage();
    if (page === 'knowledge') loadKnowledgePage();
}


// ─── Theme Toggle ───────────────────────────────────────────────
document.getElementById('csb-theme-toggle')?.addEventListener('click', () => {
    const isLight = document.body.classList.contains('light-mode');
    setTheme(isLight ? 'dark' : 'light');
});

// ─── Dynamic Customer Picker in Live Chat ────────────────────────
let allPickerCustomers = [];

async function loadCustomerPicker() {
    try {
        const res = await fetch(`${API_URL}/customers`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        allPickerCustomers = await res.json();
        renderCustomerPicker(allPickerCustomers);
    } catch(err) {
        console.error('Error loading customer picker:', err);
    }
}

function renderCustomerPicker(customers) {
    const listEl = document.getElementById('customer-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    customers.forEach(c => {
        const initials = (c.name || 'C').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
        const planClass = (c.plan || 'basic').toLowerCase();
        const item = document.createElement('div');
        item.className = `customer-item${currentCustomerId === c.id ? ' active' : ''}`;
        item.id = `ci-${c.id}`;
        item.dataset.id = c.id;
        item.innerHTML = `
            <div class="ci-avatar">${initials}</div>
            <div class="ci-info">
                <div class="ci-name">${escapeHTML(c.name)}</div>
                <div class="ci-email">${escapeHTML(c.email || c.id)}</div>
            </div>
            <div class="ci-plan ${planClass}">${escapeHTML(c.plan || 'Plan')}</div>
        `;
        item.addEventListener('click', () => selectCustomer(c.id));
        listEl.appendChild(item);
    });
}

function filterCustomerPicker() {
    const val = (lookupInput?.value || '').trim().toLowerCase();
    if (!val) {
        renderCustomerPicker(allPickerCustomers);
        return;
    }
    const filtered = allPickerCustomers.filter(c => 
        (c.id && c.id.toLowerCase().includes(val)) ||
        (c.email && c.email.toLowerCase().includes(val)) ||
        (c.name && c.name.toLowerCase().includes(val))
    );
    renderCustomerPicker(filtered);
    return filtered;
}

lookupInput?.addEventListener('input', filterCustomerPicker);

lookupBtn?.addEventListener('click', () => {
    const filtered = filterCustomerPicker();
    if (filtered && filtered.length > 0) {
        selectCustomer(filtered[0].id);
    } else {
        const val = lookupInput.value.trim();
        if (val) showSystemMsg(`No customer found for "${val}"`);
    }
});

lookupInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') lookupBtn.click();
});

function deselectAllCustomers() {
    document.querySelectorAll('.customer-item').forEach(item => item.classList.remove('active'));
}

function selectCustomer(customerId) {
    if (currentCustomerId === customerId) return;
    currentCustomerId = customerId;
    previousFactCount = 0;
    frustrationHistory = [];

    deselectAllCustomers();
    const el = document.getElementById(`ci-${customerId}`);
    if (el) el.classList.add('active');

    // Enable input
    messageInput.disabled = false;
    sendBtn.disabled = false;

    clearChat();
    showMemoryLoading();
    loadCustomerMemory(customerId);
}

// ─── Memory Loading ─────────────────────────────────────────────
function showMemoryLoading() {
    memoryEmpty.innerHTML = `<div style="width:24px;height:24px;border:2px solid var(--indigo-dim);border-top-color:var(--indigo);border-radius:50%;animation:spin 1s linear infinite"></div><p>Loading memory…</p>`;
    memoryEmpty.style.display = 'flex';
    mcProfile.style.display = 'none';
    mcEnv.style.display = 'none';
    mcTicketsSec.style.display = 'none';
    mcFactsSec.style.display = 'none';
    mcFrustrationSec.style.display = 'none';
}

async function loadCustomerMemory(customerId) {
    try {
        const res = await fetch(`${API_URL}/customers/${customerId}/memory`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        renderMemoryCard(data);
    } catch (err) {
        memoryEmpty.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><p style="color:var(--red)">Error loading memory</p><span>${escapeHTML(err.message)}</span>`;
        memoryEmpty.style.display = 'flex';
    }
}

function renderMemoryCard(data) {
    const { customer, tickets, memory_facts } = data;
    memoryEmpty.style.display = 'none';

    // Profile
    const initials = customer.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    mcAvatar.textContent = initials;
    mcName.textContent   = customer.name;
    mcEmail.textContent  = customer.email || '—';
    mcProfile.style.display = 'block';

    // Chat header tag
    chatCustomerTag.textContent = `Customer: ${customer.email || customer.id}`;
    chatCustomerTag.style.display = 'block';
    chatColTitle.textContent = `Live Chat`;

    // Environment
    const envParts = [customer.os, customer.product_version, `${customer.plan} plan`, customer.device].filter(Boolean);
    mcEnvBar.textContent = envParts.join(' · ') || '—';
    mcEnv.style.display = 'block';

    // Frustration
    const score = customer.frustration_score || 0;
    frustrationHistory.push(score);
    if (frustrationHistory.length > 10) frustrationHistory.shift();

    let fColor = '#22c55e';
    if (score >= 4) fColor = '#ef4444';
    else if (score >= 3) fColor = '#f59e0b';
    else if (score >= 2) fColor = '#06b6d4';

    mcFrustrationScore.textContent = `${score.toFixed(1)} / 5`;
    mcFrustrationBar.style.width   = `${(score / 5) * 100}%`;
    mcFrustrationBar.style.background = `linear-gradient(90deg, ${fColor}88, ${fColor})`;

    // Mini line chart
    if (frustrationHistory.length > 1) {
        const pts = frustrationHistory.map((v, i) => {
            const x = (i / (frustrationHistory.length - 1)) * 120;
            const y = 36 - (v / 5) * 32;
            return `${x},${y}`;
        }).join(' ');
        mcChartLine.setAttribute('points', pts);
    }
    mcFrustrationSec.style.display = 'block';

    // Show Escalated banner if triggered
    const hasEscTicket = tickets.some(t => t.status === 'Escalated');
    if (score >= 4.0 || hasEscTicket) {
        escalationBanner.classList.remove('hidden');
        document.getElementById('escalation-banner-text').textContent =
            `Escalated to human (${score.toFixed(1)}/5.0). Handoff summary ready.`;
        chatEscPill.classList.remove('hidden');
        escalationSummary.textContent = `Customer ${customer.name} is flagged for human handoff due to high frustration (${score.toFixed(1)}/5.0) or recurring ticket issues.`;
    } else {
        escalationBanner.classList.add('hidden');
        chatEscPill.classList.add('hidden');
    }

    // Tickets
    if (tickets.length > 0) {
        mcTicketsList.innerHTML = tickets.slice(0, 4).map(t => `
            <div class="mc-ticket-item">
                <div class="mc-ticket-issue">${escapeHTML(t.issue)}</div>
                <div class="mc-ticket-status">${escapeHTML(t.status)}</div>
            </div>
        `).join('');
        mcTicketsSec.style.display = 'block';
    }

    // Memory facts
    if (memory_facts.length > 0) {
        mcFactsList.innerHTML = '';
        memory_facts.forEach((f, idx) => {
            const isNew = idx >= previousFactCount && previousFactCount > 0;
            const typeKey = (f.type || 'fact').toLowerCase().replace(/\s+/g, '_');
            const card = document.createElement('div');
            card.className = `mc-fact-item${isNew ? ' new' : ''}`;
            card.innerHTML = `
                <span class="mc-fact-badge ${typeKey}">${(f.type || 'FACT').replace(/_/g, ' ').toUpperCase()}</span><br>
                ${escapeHTML(f.description)}
            `;
            mcFactsList.appendChild(card);
        });
        mcFactsCount.textContent = memory_facts.length;
        mcFactsSec.style.display = 'block';
    }
    previousFactCount = memory_facts.length;
}

// ─── Chat ───────────────────────────────────────────────────────
function clearChat() {
    chatMessagesArea.innerHTML = '';
    const welcome = document.createElement('div');
    welcome.className = 'chat-welcome';
    welcome.id = 'chat-welcome-inner';
    welcome.innerHTML = `
        <div class="chat-welcome-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/>
                <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/>
            </svg>
        </div>
        <h3>Memory loaded</h3>
        <p>Start the conversation below.</p>
    `;
    chatMessagesArea.appendChild(welcome);
    escalationBanner.classList.add('hidden');
    chatEscPill.classList.add('hidden');
}

function removeWelcome() {
    const w = document.getElementById('chat-welcome-inner') || document.getElementById('chat-welcome');
    if (w) w.remove();
}

function appendMsg(text, role) {
    removeWelcome();
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (role === 'system') {
        const div = document.createElement('div');
        div.className = 'chat-msg system';
        div.innerHTML = `<div class="msg-bubble">${escapeHTML(text)}</div>`;
        chatMessagesArea.appendChild(div);
        scrollBottom();
        return;
    }

    const wrap = document.createElement('div');
    wrap.className = `chat-msg ${role}`;

    const avatarText = role === 'agent' ? 'AI' : 'U';
    wrap.innerHTML = `
        <div class="msg-avatar">${avatarText}</div>
        <div class="msg-body">
            <div class="msg-bubble"></div>
            <div class="msg-time">${time}</div>
        </div>
    `;
    const bubble = wrap.querySelector('.msg-bubble');
    bubble.innerHTML = escapeHTML(text).replace(/\n/g, '<br>');
    chatMessagesArea.appendChild(wrap);
    scrollBottom();
    return { wrap, bubble };
}

async function appendAgentMsg(text, memoryCount, suggestedArticle = null) {
    removeWelcome();
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const wrap = document.createElement('div');
    wrap.className = 'chat-msg agent';

    const bodyEl = document.createElement('div');
    bodyEl.className = 'msg-body';

    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble';

    const timeEl = document.createElement('div');
    timeEl.className = 'msg-time';
    timeEl.textContent = time;

    bodyEl.appendChild(bubble);

    // Memory chip
    if (memoryCount > 0) {
        const chip = document.createElement('div');
        chip.className = 'memory-used-chip';
        chip.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/></svg>
        Memory used: ${memoryCount} ticket${memoryCount !== 1 ? 's' : ''}`;
        bodyEl.appendChild(chip);
    }

    // Suggested Article Card
    if (suggestedArticle) {
        const card = document.createElement('div');
        card.className = 'suggested-article-card';
        const catClass = (suggestedArticle.category || 'performance').toLowerCase();
        card.innerHTML = `
            <div class="suggested-card-left">
                <div class="suggested-card-icon">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                </div>
                <div class="suggested-card-info">
                    <div class="suggested-badge-row">
                        <span class="suggested-label-tag">Suggested Article</span>
                        <span class="kb-cat-pill ${catClass}">${escapeHTML(suggestedArticle.category)}</span>
                    </div>
                    <div class="suggested-card-title">${escapeHTML(suggestedArticle.title)}</div>
                    <div class="suggested-card-summary">${escapeHTML(suggestedArticle.summary || '')}</div>
                </div>
            </div>
            <button type="button" class="btn-view-suggested-art">
                View Guide
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
        `;
        card.querySelector('.btn-view-suggested-art')?.addEventListener('click', (e) => {
            e.stopPropagation();
            openKbArticle(suggestedArticle.id);
        });
        card.addEventListener('click', () => {
            openKbArticle(suggestedArticle.id);
        });
        bodyEl.appendChild(card);
    }

    bodyEl.appendChild(timeEl);
    wrap.innerHTML = `<div class="msg-avatar">AI</div>`;
    wrap.appendChild(bodyEl);
    chatMessagesArea.appendChild(wrap);
    scrollBottom();

    // Typewriter
    let displayed = '';
    for (let i = 0; i < text.length; i++) {
        displayed += text[i];
        bubble.innerHTML = escapeHTML(displayed).replace(/\n/g, '<br>');
        scrollBottom();
        await sleep(11);
    }
}


function showSystemMsg(text) { appendMsg(text, 'system'); }

function showTypingIndicator() {
    removeWelcome();
    const wrap = document.createElement('div');
    wrap.className = 'chat-msg agent';
    wrap.id = 'typing-indicator';
    wrap.innerHTML = `
        <div class="msg-avatar">AI</div>
        <div class="msg-body">
            <div class="msg-bubble">
                <div class="typing-dots"><span></span><span></span><span></span></div>
            </div>
        </div>
    `;
    chatMessagesArea.appendChild(wrap);
    scrollBottom();
}

function removeTypingIndicator() {
    document.getElementById('typing-indicator')?.remove();
}

// ─── Send Message ───────────────────────────────────────────────
async function sendMessage() {
    if (!currentCustomerId) {
        showSystemMsg('Please select a customer first.');
        return;
    }
    const text = messageInput.value.trim();
    if (!text) return;

    messageInput.value = '';
    messageInput.style.height = 'auto';
    charCount.textContent = '0 / 2000';
    messageInput.disabled = true;
    sendBtn.disabled = true;

    appendMsg(text, 'user');
    showTypingIndicator();

    try {
        const res = await fetch(`${API_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customer_id: currentCustomerId, message: text })
        });

        if (!res.ok) throw new Error(`Server error ${res.status}`);
        const data = await res.json();

        removeTypingIndicator();

        // Count memory facts used (approximate from extracted data)
        const memCount = (data.extracted_data?.memory_facts?.length) || previousFactCount;
        await appendAgentMsg(data.response, memCount, data.suggested_article);

        // Escalation
        if (data.escalate) {
            escalationCount++;
            escCountBadge.textContent = escalationCount;
            escCountBadge.style.display = 'inline-block';
            notifDot.style.display = 'block';

            escalationBanner.classList.remove('hidden');
            document.getElementById('escalation-banner-text').textContent =
                'Escalated to human. Handoff summary ready.';
            chatEscPill.classList.remove('hidden');

            escalationSummary.textContent = data.handoff_summary || 'Escalation required.';
        }

        // Refresh memory silently
        loadCustomerMemory(currentCustomerId);

    } catch (err) {
        removeTypingIndicator();
        await appendAgentMsg(`⚠️ Error: ${err.message}. Is the backend running?`, 0);
    } finally {
        messageInput.disabled = false;
        sendBtn.disabled = false;
        messageInput.focus();
    }
}

// ─── Input Events ───────────────────────────────────────────────
sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});
messageInput.addEventListener('input', () => {
    const len = messageInput.value.length;
    charCount.textContent = `${len} / 2000`;
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 140) + 'px';
});

// ─── Modal Events ───────────────────────────────────────────────
bannerViewBtn.addEventListener('click', () => escalationModal.classList.remove('hidden'));
closeModal.addEventListener('click',    () => escalationModal.classList.add('hidden'));
closeModalBtn.addEventListener('click', () => escalationModal.classList.add('hidden'));
ackModalBtn.addEventListener('click',   () => escalationModal.classList.add('hidden'));
escalationModal.addEventListener('click', (e) => {
    if (e.target === escalationModal) escalationModal.classList.add('hidden');
});

// ─── Search shortcut "/" ────────────────────────────────────────
document.addEventListener('keydown', (e) => {
    const searchInput = document.getElementById('search-input');
    if (e.key === '/' && document.activeElement !== searchInput &&
        document.activeElement !== messageInput) {
        e.preventDefault();
        searchInput?.focus();
    }
    if (e.key === 'Escape' && document.activeElement === searchInput) {
        searchInput.blur();
    }
});

// ─── Customers Page ─────────────────────────────────────────────
let cachedCustomers = [];

async function loadCustomersPage() {
    const tbody = document.getElementById('customers-tbody');
    const empty = document.getElementById('customers-empty');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:28px;color:var(--text-3)">Loading customers...</td></tr>`;
    if (empty) empty.classList.add('hidden');

    try {
        const res = await fetch(`${API_URL}/customers`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        cachedCustomers = await res.json();
        renderCustomersTable(cachedCustomers);
    } catch(err) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:28px;color:var(--red)">Failed to load customers: ${escapeHTML(err.message)}</td></tr>`;
    }
}

function renderCustomersTable(customers) {
    const tbody = document.getElementById('customers-tbody');
    const empty = document.getElementById('customers-empty');
    if (!tbody) return;
    tbody.innerHTML = '';

    const query = (document.getElementById('customers-search')?.value || '').trim().toLowerCase();
    const filtered = customers.filter(c => {
        if (!query) return true;
        const str = `${c.id} ${c.name} ${c.email || ''} ${c.plan || ''}`.toLowerCase();
        return str.includes(query);
    });

    if (filtered.length === 0) {
        if (empty) empty.classList.remove('hidden');
        return;
    }
    if (empty) empty.classList.add('hidden');

    filtered.forEach(c => {
        const initials = (c.name || 'C').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
        const score = c.frustration_score || 1.0;
        let pillClass = 'green';
        let pillText = `${score.toFixed(1)} Low`;
        if (score >= 4.0) {
            pillClass = 'red';
            pillText = `${score.toFixed(1)} Critical`;
        } else if (score >= 3.0) {
            pillClass = 'amber';
            pillText = `${score.toFixed(1)} Elevated`;
        }

        const planClass = (c.plan || 'basic').toLowerCase();
        const tr = document.createElement('tr');
        tr.className = 'clickable-row';
        tr.innerHTML = `
            <td>
                <div class="table-customer-cell">
                    <div class="table-avatar">${initials}</div>
                    <div>
                        <div class="table-cust-name">${escapeHTML(c.name)}</div>
                        <div class="table-cust-email">${escapeHTML(c.email || c.id)}</div>
                    </div>
                </div>
            </td>
            <td><span class="plan-pill ${planClass}">${escapeHTML(c.plan || 'Basic')}</span></td>
            <td><strong style="color:var(--text)">${c.ticket_count || 0}</strong> tickets</td>
            <td>
                <span class="frustration-pill ${pillClass}">
                    <span class="pill-dot"></span>
                    ${pillText}
                </span>
            </td>
            <td><span style="font-size:0.8rem;color:var(--text-3)">${c.last_contact || 'Never'}</span></td>
            <td>
                <button class="btn-table-action" data-id="${c.id}" title="Open conversation in Live Chat">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    Chat
                </button>
            </td>
        `;

        tr.addEventListener('click', () => {
            switchPage('livechat');
            selectCustomer(c.id);
        });

        tbody.appendChild(tr);
    });
}

document.getElementById('customers-search')?.addEventListener('input', () => {
    renderCustomersTable(cachedCustomers);
});

document.getElementById('customers-refresh-btn')?.addEventListener('click', loadCustomersPage);

// ─── Tickets Page ───────────────────────────────────────────────
let cachedTickets = [];
let ticketFilter = 'all';

async function loadTicketsPage() {
    const tbody = document.getElementById('tickets-tbody');
    const empty = document.getElementById('tickets-empty');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:28px;color:var(--text-3)">Loading tickets...</td></tr>`;
    if (empty) empty.classList.add('hidden');

    try {
        const res = await fetch(`${API_URL}/tickets`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        cachedTickets = await res.json();
        updateTicketCounts(cachedTickets);
        renderTicketsTable();
    } catch(err) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:28px;color:var(--red)">Failed to load tickets: ${escapeHTML(err.message)}</td></tr>`;
    }
}

function updateTicketCounts(tickets) {
    const countAll = tickets.length;
    const countOpen = tickets.filter(t => t.status === 'Open').length;
    const countResolved = tickets.filter(t => t.status === 'Resolved').length;
    const countEscalated = tickets.filter(t => t.status === 'Escalated').length;

    const elAll = document.getElementById('count-all');
    const elOpen = document.getElementById('count-open');
    const elRes = document.getElementById('count-resolved');
    const elEsc = document.getElementById('count-escalated');

    if (elAll) elAll.textContent = countAll;
    if (elOpen) elOpen.textContent = countOpen;
    if (elRes) elRes.textContent = countResolved;
    if (elEsc) elEsc.textContent = countEscalated;
}

function renderTicketsTable() {
    const tbody = document.getElementById('tickets-tbody');
    const empty = document.getElementById('tickets-empty');
    const searchInput = document.getElementById('tickets-search');
    if (!tbody) return;
    tbody.innerHTML = '';

    const query = (searchInput?.value || '').trim().toLowerCase();
    let filtered = cachedTickets.filter(t => {
        if (ticketFilter !== 'all' && t.status !== ticketFilter) return false;
        if (query) {
            const str = `${t.id} ${t.customer_name} ${t.issue} ${t.resolution || ''}`.toLowerCase();
            return str.includes(query);
        }
        return true;
    });

    if (filtered.length === 0) {
        if (empty) empty.classList.remove('hidden');
        return;
    }
    if (empty) empty.classList.add('hidden');

    filtered.forEach(t => {
        const statusClass = (t.status || 'open').toLowerCase();
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><span class="ticket-id-badge">#${escapeHTML(t.id)}</span></td>
            <td>
                <span class="table-cust-name" style="cursor:pointer;color:var(--indigo-light)" data-custid="${t.customer_id}">
                    ${escapeHTML(t.customer_name)}
                </span>
            </td>
            <td>
                <div class="ticket-issue-block">
                    <span class="ticket-issue-title">${escapeHTML(t.issue)}</span>
                    ${t.resolution ? `<span class="ticket-resolution-text">✓ ${escapeHTML(t.resolution)}</span>` : ''}
                </div>
            </td>
            <td><span class="status-pill ${statusClass}"><span class="pill-dot"></span>${escapeHTML(t.status)}</span></td>
            <td><span style="font-size:0.8rem;color:var(--text-3)">${t.date || '—'}</span></td>
            <td>
                <button class="btn-table-action" data-custid="${t.customer_id}" title="Open customer in Chat">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    Chat
                </button>
            </td>
        `;

        tr.querySelectorAll('[data-custid]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                switchPage('livechat');
                selectCustomer(t.customer_id);
            });
        });

        tbody.appendChild(tr);
    });
}

document.querySelectorAll('#ticket-filter-chips .filter-chip').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('#ticket-filter-chips .filter-chip').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        ticketFilter = btn.dataset.filter || 'all';
        renderTicketsTable();
    });
});

document.getElementById('tickets-search')?.addEventListener('input', renderTicketsTable);
document.getElementById('tickets-refresh-btn')?.addEventListener('click', loadTicketsPage);

// ─── Escalations Page ───────────────────────────────────────────
let cachedEscalations = [];

async function loadEscalationsPage() {
    const grid = document.getElementById('escalations-grid');
    const empty = document.getElementById('escalations-empty');
    if (!grid) return;
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:36px;color:var(--text-3)">Loading escalation queue...</div>`;
    if (empty) empty.classList.add('hidden');

    try {
        const res = await fetch(`${API_URL}/escalations`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        cachedEscalations = await res.json();

        // Update badge counts
        const count = cachedEscalations.length;
        if (escCountBadge) {
            escCountBadge.textContent = count;
            escCountBadge.style.display = count > 0 ? 'inline-block' : 'none';
        }
        const escPageBadge = document.getElementById('esc-page-badge');
        if (escPageBadge) escPageBadge.textContent = `${count} active`;
        if (notifDot) notifDot.style.display = count > 0 ? 'block' : 'none';

        renderEscalationsGrid(cachedEscalations);
    } catch(err) {
        grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:36px;color:var(--red)">Failed to load escalations: ${escapeHTML(err.message)}</div>`;
    }
}

function renderEscalationsGrid(escalations) {
    const grid = document.getElementById('escalations-grid');
    const empty = document.getElementById('escalations-empty');
    if (!grid) return;
    grid.innerHTML = '';

    if (!escalations || escalations.length === 0) {
        if (empty) empty.classList.remove('hidden');
        return;
    }
    if (empty) empty.classList.add('hidden');

    escalations.forEach(esc => {
        const initials = (esc.customer_name || 'C').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
        const score = esc.frustration_score || 1.0;
        const pillClass = score >= 4.0 ? 'red' : 'amber';
        const planClass = (esc.plan || 'basic').toLowerCase();

        const card = document.createElement('div');
        card.className = `esc-card${esc.status === 'resolved' ? ' resolved-card' : ''}`;
        card.id = `esc-card-${esc.customer_id}`;
        card.innerHTML = `
            <div class="esc-card-header">
                <div class="esc-cust-info">
                    <div class="table-avatar" style="width:40px;height:40px;font-size:0.9rem">${initials}</div>
                    <div>
                        <div class="esc-cust-name">${escapeHTML(esc.customer_name)}</div>
                        <div class="esc-cust-meta">${escapeHTML(esc.customer_email)} · <span class="plan-pill ${planClass}">${escapeHTML(esc.plan)}</span></div>
                    </div>
                </div>
                <div>
                    <span class="frustration-pill ${pillClass}">
                        <span class="pill-dot"></span>
                        ${score.toFixed(1)} Frustration
                    </span>
                </div>
            </div>

            <div class="esc-reasons">
                <div class="esc-reasons-title">Escalation Trigger Reasons</div>
                ${(esc.reasons || []).map(r => `
                    <div class="esc-reason-pill">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                        ${escapeHTML(r)}
                    </div>
                `).join('')}
            </div>

            <div>
                <div class="esc-reasons-title" style="margin-bottom:6px">Generated Handoff Summary</div>
                <div class="esc-summary-box">${escapeHTML(esc.handoff_summary || 'Handoff summary unavailable')}</div>
            </div>

            <div class="esc-card-footer">
                <button class="btn-open-chat" data-id="${esc.customer_id}">
                    Open in Chat
                </button>
                <button class="btn-assign" data-id="${esc.customer_id}">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
                    Assign to Human
                </button>
                <button class="btn-resolve" data-id="${esc.customer_id}">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    Mark Resolved
                </button>
            </div>
        `;

        card.querySelector('.btn-open-chat').addEventListener('click', () => {
            switchPage('livechat');
            selectCustomer(esc.customer_id);
        });

        card.querySelector('.btn-assign').addEventListener('click', async (e) => {
            const btn = e.currentTarget;
            btn.disabled = true;
            btn.textContent = 'Assigning...';
            try {
                const res = await fetch(`${API_URL}/escalations/${esc.customer_id}/assign`, { method: 'PATCH' });
                if (!res.ok) throw new Error('Assign failed');
                btn.textContent = '✓ Assigned to Human';
                setTimeout(() => loadEscalationsPage(), 600);
            } catch(err) {
                alert('Error assigning escalation: ' + err.message);
                btn.disabled = false;
                btn.textContent = 'Assign to Human';
            }
        });

        card.querySelector('.btn-resolve').addEventListener('click', async (e) => {
            const btn = e.currentTarget;
            btn.disabled = true;
            btn.textContent = 'Resolving...';
            try {
                const res = await fetch(`${API_URL}/escalations/${esc.customer_id}/resolve`, { method: 'PATCH' });
                if (!res.ok) throw new Error('Resolve failed');
                btn.textContent = '✓ Resolved';
                setTimeout(() => {
                    loadEscalationsPage();
                    if (currentPage === 'analytics') loadAnalytics();
                }, 600);
            } catch(err) {
                alert('Error resolving escalation: ' + err.message);
                btn.disabled = false;
                btn.textContent = 'Mark Resolved';
            }
        });

        grid.appendChild(card);
    });
}

document.getElementById('escalations-refresh-btn')?.addEventListener('click', loadEscalationsPage);

// ─── Analytics Page ─────────────────────────────────────────────
async function loadAnalytics() {
    document.getElementById('stat-num-tickets').textContent = '…';
    document.getElementById('stat-num-frustration').textContent = '…';
    document.getElementById('stat-num-esc').textContent = '…';
    document.getElementById('stat-num-memories').textContent = '…';

    try {
        const res = await fetch(`${API_URL}/analytics`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        document.getElementById('stat-num-tickets').textContent    = data.total_tickets || '0';
        document.getElementById('stat-num-frustration').textContent = (data.avg_frustration || 0).toFixed(1);
        document.getElementById('stat-num-esc').textContent         = `${data.escalation_rate || 0}%`;
        document.getElementById('stat-num-memories').textContent    = data.total_customers || '0';

        renderFrustrationChart(data.frustration_trend || []);
        renderCategoryChartFromData(data.issue_categories || []);
    } catch(err) {
        console.error('Failed to load analytics:', err);
    }
}

function renderFrustrationChart(trend) {
    const frustLine = document.getElementById('frust-line');
    const frustFill = document.getElementById('frust-fill');
    const frustEmpty = document.getElementById('frust-empty');

    if (!trend || trend.length === 0) {
        if (frustEmpty) frustEmpty.style.display = 'flex';
        return;
    }
    if (frustEmpty) frustEmpty.style.display = 'none';

    const W = 400, H = 120, pad = 12;
    const points = trend.map((d, i) => {
        const x = pad + (i / Math.max(trend.length - 1, 1)) * (W - pad * 2);
        const y = H - pad - ((d.score / 5) * (H - pad * 2));
        return [x, y];
    });

    const ptStr = points.map(p => p.join(',')).join(' ');
    frustLine?.setAttribute('points', ptStr);

    const first = points[0], last = points[points.length - 1];
    const fillPath = `M${first[0]},${H - pad} L${ptStr.split(' ').join(' L')} L${last[0]},${H - pad} Z`;
    frustFill?.setAttribute('d', fillPath);
}

function renderCategoryChartFromData(categories) {
    const catList = document.getElementById('category-list');
    const catEmpty = document.getElementById('cat-empty');
    if (!catList) return;

    if (!categories || categories.length === 0) {
        if (catEmpty) catEmpty.style.display = 'flex';
        return;
    }
    if (catEmpty) catEmpty.style.display = 'none';

    const max = Math.max(...categories.map(c => c.count), 1);
    const colors = ['#4F46E5','#06b6d4','#22c55e','#f59e0b','#ef4444','#8b5cf6'];

    catList.innerHTML = categories.map((c, i) => `
        <div class="cat-item">
            <div class="cat-item-header">
                <span>${escapeHTML(c.category)}</span>
                <span>${c.count} ticket${c.count !== 1 ? 's' : ''}</span>
            </div>
            <div class="cat-item-bar-wrap">
                <div class="cat-item-bar" style="width:${(c.count / max) * 100}%;background:${colors[i % colors.length]}"></div>
            </div>
        </div>
    `).join('');
}

// ─── Helpers ────────────────────────────────────────────────────
function scrollBottom() { chatMessagesArea.scrollTop = chatMessagesArea.scrollHeight; }

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function escapeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

async function checkEscalationsBadge() {
    try {
        const res = await fetch(`${API_URL}/escalations`);
        if (!res.ok) return;
        const esc = await res.json();
        const count = esc.length;
        if (escCountBadge) {
            escCountBadge.textContent = count;
            escCountBadge.style.display = count > 0 ? 'inline-block' : 'none';
        }
        if (notifDot) notifDot.style.display = count > 0 ? 'block' : 'none';
    } catch(e) {}
}

// ─── Keyframes not in CSS (spin for loading) ────────────────────
const spinStyle = document.createElement('style');
spinStyle.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
document.head.appendChild(spinStyle);

// ─── Home Overview Page ─────────────────────────────────────────
let homeRefreshTimer = null;

async function loadHomePage(isBackground = false) {
    const statChats = document.getElementById('h-stat-chats');
    const statEsc = document.getElementById('h-stat-escalations');
    const statFrust = document.getElementById('h-stat-frustration');
    const statMem = document.getElementById('h-stat-memories');
    const convsList = document.getElementById('recent-convs-list');
    const convsEmpty = document.getElementById('recent-convs-empty');
    const escList = document.getElementById('home-esc-list');
    const escEmpty = document.getElementById('home-esc-empty');
    const escCountPill = document.getElementById('home-esc-count');

    // Show skeletons on first/manual load
    if (!isBackground) {
        if (statChats) statChats.innerHTML = `<div class="skeleton-bar" style="width:48px;height:30px"></div>`;
        if (statEsc) statEsc.innerHTML = `<div class="skeleton-bar" style="width:40px;height:30px"></div>`;
        if (statFrust) statFrust.innerHTML = `<div class="skeleton-bar" style="width:68px;height:30px"></div>`;
        if (statMem) statMem.innerHTML = `<div class="skeleton-bar" style="width:45px;height:30px"></div>`;
        if (convsList) {
            convsList.innerHTML = `
                <div class="skeleton-conv-row"><div class="skeleton-avatar"></div><div class="skeleton-content"><div class="skeleton-bar" style="width:40%"></div><div class="skeleton-bar" style="width:70%"></div></div><div class="skeleton-bar" style="width:50px"></div></div>
                <div class="skeleton-conv-row"><div class="skeleton-avatar"></div><div class="skeleton-content"><div class="skeleton-bar" style="width:50%"></div><div class="skeleton-bar" style="width:60%"></div></div><div class="skeleton-bar" style="width:50px"></div></div>
                <div class="skeleton-conv-row"><div class="skeleton-avatar"></div><div class="skeleton-content"><div class="skeleton-bar" style="width:35%"></div><div class="skeleton-bar" style="width:80%"></div></div><div class="skeleton-bar" style="width:50px"></div></div>
            `;
        }
        if (escList) {
            escList.innerHTML = `
                <div class="skeleton-esc-card"><div class="skeleton-bar" style="width:45%"></div><div class="skeleton-bar" style="width:90%"></div></div>
                <div class="skeleton-esc-card"><div class="skeleton-bar" style="width:40%"></div><div class="skeleton-bar" style="width:85%"></div></div>
            `;
        }
    }

    try {
        const [analyticsRes, customersRes, ticketsRes, escalationsRes] = await Promise.all([
            fetch(`${API_URL}/analytics`),
            fetch(`${API_URL}/customers`),
            fetch(`${API_URL}/tickets`),
            fetch(`${API_URL}/escalations`)
        ]);

        const analytics = analyticsRes.ok ? await analyticsRes.json() : {};
        const customers = customersRes.ok ? await customersRes.json() : [];
        const tickets = ticketsRes.ok ? await ticketsRes.json() : [];
        const escalations = escalationsRes.ok ? await escalationsRes.json() : [];

        // 1. Render 4 Stat cards
        const activeChats = analytics.active_chats !== undefined ? analytics.active_chats : customers.length;
        const pendingEsc = analytics.pending_escalations !== undefined ? analytics.pending_escalations : escalations.length;
        const avgFrust = analytics.avg_frustration !== undefined ? analytics.avg_frustration : 1.0;
        const memStored = analytics.memories_stored !== undefined ? analytics.memories_stored : ((customers.length * 4) + tickets.length);

        if (statChats) statChats.textContent = activeChats;
        if (statEsc) statEsc.textContent = pendingEsc;
        if (statFrust) statFrust.textContent = `${Number(avgFrust).toFixed(1)} / 5`;
        if (statMem) statMem.textContent = memStored;

        // Update badge counters across console
        if (escCountBadge) {
            escCountBadge.textContent = pendingEsc;
            escCountBadge.style.display = pendingEsc > 0 ? 'inline-block' : 'none';
        }
        if (escCountPill) escCountPill.textContent = pendingEsc;
        if (notifDot) notifDot.style.display = pendingEsc > 0 ? 'block' : 'none';

        // 2. Render Recent Conversations (last 5)
        if (convsList) {
            convsList.innerHTML = '';
            // Map customers to their latest ticket info
            const customerTicketMap = {};
            tickets.forEach(t => {
                if (!customerTicketMap[t.customer_id]) {
                    customerTicketMap[t.customer_id] = t;
                }
            });

            const recentList = customers.slice(0, 5);
            if (recentList.length === 0) {
                if (convsEmpty) convsEmpty.classList.remove('hidden');
            } else {
                if (convsEmpty) convsEmpty.classList.add('hidden');
                recentList.forEach(c => {
                    const latestT = customerTicketMap[c.id];
                    const issueTitle = latestT ? latestT.issue : 'General support inquiry';
                    const initials = (c.name || 'C').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                    const score = c.frustration_score || 1.0;

                    let pillClass = 'green';
                    let pillText = `${score.toFixed(1)} Low`;
                    if (score >= 4.0) {
                        pillClass = 'red';
                        pillText = `${score.toFixed(1)} Critical`;
                    } else if (score >= 3.0) {
                        pillClass = 'amber';
                        pillText = `${score.toFixed(1)} Elevated`;
                    }

                    const item = document.createElement('div');
                    item.className = 'recent-conv-item';
                    item.title = `Click to chat with ${escapeHTML(c.name)}`;
                    item.innerHTML = `
                        <div class="recent-conv-left">
                            <div class="recent-conv-avatar">${initials}</div>
                            <div class="recent-conv-info">
                                <div class="recent-conv-name">${escapeHTML(c.name)}</div>
                                <div class="recent-conv-issue">${escapeHTML(issueTitle)}</div>
                            </div>
                        </div>
                        <div class="recent-conv-right">
                            <span class="frustration-pill ${pillClass}">
                                <span class="pill-dot"></span>
                                ${pillText}
                            </span>
                        </div>
                    `;

                    item.addEventListener('click', () => {
                        switchPage('livechat');
                        selectCustomer(c.id);
                    });

                    convsList.appendChild(item);
                });
            }
        }

        // 3. Render Escalation Queue panel
        if (escList) {
            escList.innerHTML = '';
            if (escalations.length === 0) {
                if (escEmpty) escEmpty.classList.remove('hidden');
            } else {
                if (escEmpty) escEmpty.classList.add('hidden');
                escalations.forEach(esc => {
                    const score = esc.frustration_score || 1.0;
                    const pillClass = score >= 4.0 ? 'red' : 'amber';

                    let oneLineSummary = 'Requires human operator attention.';
                    if (esc.reasons && esc.reasons.length > 0) {
                        oneLineSummary = esc.reasons.join(' · ');
                    } else if (esc.handoff_summary) {
                        const lines = esc.handoff_summary.split('\n').filter(l => l.trim().length > 0);
                        oneLineSummary = lines[0] || 'Escalation triggered';
                    }

                    const card = document.createElement('div');
                    card.className = 'home-esc-card';
                    card.title = 'Click to open Escalation Queue';
                    card.innerHTML = `
                        <div class="home-esc-card-top">
                            <span class="home-esc-name">${escapeHTML(esc.customer_name)}</span>
                            <span class="frustration-pill ${pillClass}">
                                <span class="pill-dot"></span>
                                ${score.toFixed(1)} Frustration
                            </span>
                        </div>
                        <div class="home-esc-summary">${escapeHTML(oneLineSummary)}</div>
                        <div class="home-esc-hint">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                            Open in Escalation Queue →
                        </div>
                    `;

                    card.addEventListener('click', () => {
                        switchPage('escalations');
                    });

                    escList.appendChild(card);
                });
            }
        }
    } catch(err) {
        console.error('Error loading home overview:', err);
    }
}

// ─── 10-Second Auto Refresh Timer ───────────────────────────────
if (homeRefreshTimer) clearInterval(homeRefreshTimer);
homeRefreshTimer = setInterval(() => {
    if (currentPage === 'home') {
        loadHomePage(true);
    }
}, 10000);

// ─── Settings Page Logic ─────────────────────────────────────────
let currentSettings = {
    escalation_frustration_threshold: 4,
    escalation_repeat_issue_threshold: 3,
    auto_handoff_summary: true,
    adapt_tone: true,
    reference_past_tickets: true,
    reply_style: 'Auto',
    theme: 'dark'
};

// Frustration level descriptions
const FRUSTRATION_LEVEL_MAP = {
    1: 'Level 1 / 5 (Calm)',
    2: 'Level 2 / 5 (Neutral)',
    3: 'Level 3 / 5 (Moderate)',
    4: 'Level 4 / 5 (High)',
    5: 'Level 5 / 5 (Critical)'
};

function updateFrustrationBadge(val) {
    const badge = document.getElementById('frustration-level-indicator');
    if (!badge) return;
    const rounded = Math.min(5, Math.max(1, Math.round(val)));
    badge.textContent = FRUSTRATION_LEVEL_MAP[rounded] || `Level ${rounded} / 5`;
    if (rounded >= 4) {
        badge.className = 'stepper-badge';
    } else {
        badge.className = 'stepper-badge neutral';
    }
}

function updateRepeatBadge(val) {
    const badge = document.getElementById('repeat-level-indicator');
    if (!badge) return;
    const count = Math.max(1, parseInt(val, 10) || 1);
    badge.textContent = `${count} Occurrence${count === 1 ? '' : 's'}`;
}

// Toast helper
function showToast(message, type = 'success', duration = 3500) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let iconSvg = '';
    if (type === 'success') {
        iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`;
    } else if (type === 'danger') {
        iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
    } else {
        iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
    }

    toast.innerHTML = `
        <span class="toast-icon">${iconSvg}</span>
        <span class="toast-text">${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('toast-hiding');
        setTimeout(() => toast.remove(), 250);
    }, duration);
}

// Confirmation Dialog Modal Helper
let activeConfirmAction = null;
function showConfirmDialog({ title, message, subTitle = 'Please confirm to proceed', isDanger = false, confirmText = 'Confirm', onConfirm }) {
    const modal = document.getElementById('confirm-action-modal');
    if (!modal) {
        if (confirm(`${title}\n\n${message}`)) {
            if (typeof onConfirm === 'function') onConfirm();
        }
        return;
    }

    document.getElementById('confirm-modal-title').textContent = title;
    document.getElementById('confirm-modal-message').textContent = message;
    document.getElementById('confirm-modal-sub').textContent = subTitle;
    
    const iconEl = document.getElementById('confirm-modal-icon');
    if (iconEl) {
        iconEl.className = `modal-icon ${isDanger ? 'danger' : 'warning'}`;
    }

    const execBtn = document.getElementById('btn-execute-confirm');
    if (execBtn) {
        execBtn.textContent = confirmText;
        execBtn.className = isDanger ? 'btn-primary btn-danger' : 'btn-primary';
    }

    activeConfirmAction = onConfirm;
    modal.classList.remove('hidden');
}

function closeConfirmDialog() {
    const modal = document.getElementById('confirm-action-modal');
    if (modal) modal.classList.add('hidden');
    activeConfirmAction = null;
}

document.getElementById('btn-cancel-confirm')?.addEventListener('click', closeConfirmDialog);
document.getElementById('close-confirm-modal')?.addEventListener('click', closeConfirmDialog);
document.getElementById('btn-execute-confirm')?.addEventListener('click', async () => {
    if (typeof activeConfirmAction === 'function') {
        const action = activeConfirmAction;
        closeConfirmDialog();
        await action();
    } else {
        closeConfirmDialog();
    }
});

// Theme Management
function setTheme(theme) {
    const isLight = theme === 'light';
    document.body.classList.toggle('light-mode', isLight);
    
    // Update theme segments in Settings
    const darkBtn = document.getElementById('btn-theme-dark');
    const lightBtn = document.getElementById('btn-theme-light');
    if (darkBtn && lightBtn) {
        darkBtn.classList.toggle('active', !isLight);
        lightBtn.classList.toggle('active', isLight);
    }

    // Update sidebar theme label
    const themeLabel = document.querySelector('.csb-theme-label');
    if (themeLabel) {
        themeLabel.textContent = isLight ? 'Light Mode' : 'Dark Mode';
    }

    currentSettings.theme = isLight ? 'light' : 'dark';
}

document.getElementById('btn-theme-dark')?.addEventListener('click', () => setTheme('dark'));
document.getElementById('btn-theme-light')?.addEventListener('click', () => setTheme('light'));

// Steppers Event Listeners
const frustInput = document.getElementById('setting-frustration-thresh');
const btnFrustMinus = document.getElementById('btn-frustration-minus');
const btnFrustPlus = document.getElementById('btn-frustration-plus');

if (btnFrustMinus && frustInput) {
    btnFrustMinus.addEventListener('click', () => {
        let val = parseInt(frustInput.value, 10) || 4;
        if (val > 1) {
            frustInput.value = val - 1;
            updateFrustrationBadge(val - 1);
        }
    });
}
if (btnFrustPlus && frustInput) {
    btnFrustPlus.addEventListener('click', () => {
        let val = parseInt(frustInput.value, 10) || 4;
        if (val < 5) {
            frustInput.value = val + 1;
            updateFrustrationBadge(val + 1);
        }
    });
}
if (frustInput) {
    frustInput.addEventListener('change', () => {
        let val = Math.min(5, Math.max(1, parseInt(frustInput.value, 10) || 4));
        frustInput.value = val;
        updateFrustrationBadge(val);
    });
}

const repeatInput = document.getElementById('setting-repeat-thresh');
const btnRepeatMinus = document.getElementById('btn-repeat-minus');
const btnRepeatPlus = document.getElementById('btn-repeat-plus');

if (btnRepeatMinus && repeatInput) {
    btnRepeatMinus.addEventListener('click', () => {
        let val = parseInt(repeatInput.value, 10) || 3;
        if (val > 1) {
            repeatInput.value = val - 1;
            updateRepeatBadge(val - 1);
        }
    });
}
if (btnRepeatPlus && repeatInput) {
    btnRepeatPlus.addEventListener('click', () => {
        let val = parseInt(repeatInput.value, 10) || 3;
        if (val < 10) {
            repeatInput.value = val + 1;
            updateRepeatBadge(val + 1);
        }
    });
}
if (repeatInput) {
    repeatInput.addEventListener('change', () => {
        let val = Math.min(10, Math.max(1, parseInt(repeatInput.value, 10) || 3));
        repeatInput.value = val;
        updateRepeatBadge(val);
    });
}

// Load Settings from API
async function loadSettingsPage() {
    try {
        const res = await fetch(`${API_URL}/settings`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        currentSettings = { ...currentSettings, ...data };

        // 1. Escalation rules
        const frustVal = data.escalation_frustration_threshold ?? 4;
        if (frustInput) frustInput.value = frustVal;
        updateFrustrationBadge(frustVal);

        const repeatVal = data.escalation_repeat_issue_threshold ?? 3;
        if (repeatInput) repeatInput.value = repeatVal;
        updateRepeatBadge(repeatVal);

        const autoSummaryEl = document.getElementById('setting-auto-summary');
        if (autoSummaryEl) autoSummaryEl.checked = data.auto_handoff_summary !== false;

        // 2. Agent behavior
        const adaptToneEl = document.getElementById('setting-adapt-tone');
        if (adaptToneEl) adaptToneEl.checked = data.adapt_tone !== false;

        const refPastEl = document.getElementById('setting-ref-past-tickets');
        if (refPastEl) refPastEl.checked = data.reference_past_tickets !== false;

        const replyStyleEl = document.getElementById('setting-reply-style');
        if (replyStyleEl && data.reply_style) replyStyleEl.value = data.reply_style;

        // 3. Memory counters
        if (data.memory_stats) {
            renderMemoryCounters(data.memory_stats);
        }

        // 4. AI model status
        if (data.ai_model) {
            renderAiModelStatus(data.ai_model);
        }

        // 5. Appearance
        if (data.theme) {
            setTheme(data.theme);
        }

        const statusEl = document.getElementById('settings-save-status');
        if (statusEl) {
            statusEl.innerHTML = `<span class="sync-dot"></span><span>Settings loaded from server</span>`;
        }
    } catch (err) {
        console.error('Failed to load settings:', err);
        showToast('Failed to load settings from server', 'danger');
    }
}

function renderMemoryCounters(stats) {
    const custEl = document.getElementById('settings-count-customers');
    const tixEl = document.getElementById('settings-count-tickets');
    const memEl = document.getElementById('settings-count-memories');

    if (custEl) custEl.textContent = stats.customers ?? 0;
    if (tixEl) tixEl.textContent = stats.tickets ?? 0;
    if (memEl) memEl.textContent = stats.memories_stored ?? 0;
}

function renderAiModelStatus(ai) {
    const provEl = document.getElementById('ai-model-provider');
    const depEl = document.getElementById('ai-deployment-name');
    const badgeEl = document.getElementById('ai-status-badge');
    const textEl = document.getElementById('ai-status-text');

    if (provEl) provEl.textContent = ai.provider || 'Azure OpenAI';
    if (depEl) depEl.textContent = ai.deployment_name || 'Not configured';

    if (badgeEl && textEl) {
        const isConnected = !!ai.connected;
        badgeEl.className = `badge-status-pill ${isConnected ? 'connected' : 'not-configured'}`;
        textEl.textContent = ai.status || (isConnected ? 'Connected' : 'Not configured');
    }
}

// Save Settings
async function saveSettings() {
    const saveBtn = document.getElementById('btn-save-settings');
    const btnText = document.getElementById('save-btn-text');
    const statusEl = document.getElementById('settings-save-status');

    const frustVal = parseFloat(frustInput ? frustInput.value : 4) || 4;
    const repeatVal = parseInt(repeatInput ? repeatInput.value : 3, 10) || 3;
    const autoSummaryVal = document.getElementById('setting-auto-summary')?.checked ?? true;
    const adaptToneVal = document.getElementById('setting-adapt-tone')?.checked ?? true;
    const refPastVal = document.getElementById('setting-ref-past-tickets')?.checked ?? true;
    const replyStyleVal = document.getElementById('setting-reply-style')?.value || 'Auto';
    const themeVal = document.body.classList.contains('light-mode') ? 'light' : 'dark';

    const payload = {
        escalation_frustration_threshold: frustVal,
        escalation_repeat_issue_threshold: repeatVal,
        auto_handoff_summary: autoSummaryVal,
        adapt_tone: adaptToneVal,
        reference_past_tickets: refPastVal,
        reply_style: replyStyleVal,
        theme: themeVal
    };

    try {
        if (saveBtn) {
            saveBtn.disabled = true;
            if (btnText) btnText.textContent = 'Saving...';
        }
        if (statusEl) {
            statusEl.innerHTML = `<span class="sync-dot" style="background:var(--amber)"></span><span>Saving configuration...</span>`;
        }

        const res = await fetch(`${API_URL}/settings`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        currentSettings = { ...currentSettings, ...data };

        showToast('Settings saved', 'success');

        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        if (statusEl) {
            statusEl.innerHTML = `<span class="sync-dot"></span><span>Settings saved at ${timeStr}</span>`;
        }

        // Re-check escalation badge since thresholds may have changed
        checkEscalationsBadge();
    } catch (err) {
        console.error('Error saving settings:', err);
        showToast('Error saving settings: ' + err.message, 'danger');
        if (statusEl) {
            statusEl.innerHTML = `<span class="sync-dot" style="background:var(--red)"></span><span>Error saving settings</span>`;
        }
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            if (btnText) btnText.textContent = 'Save changes';
        }
    }
}

document.getElementById('btn-save-settings')?.addEventListener('click', saveSettings);

// Reload demo data button
document.getElementById('btn-reload-demo')?.addEventListener('click', () => {
    showConfirmDialog({
        title: 'Reload Demo Data',
        subTitle: 'Reset customer database to initial state',
        message: 'Are you sure you want to reload demo data? This will re-run the seed script and restore the default demo customers and tickets.',
        confirmText: 'Reload Data',
        isDanger: false,
        onConfirm: async () => {
            try {
                showToast('Reloading demo data...', 'info', 2000);
                const res = await fetch(`${API_URL}/admin/reseed`, { method: 'POST' });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                if (data.memory_stats) {
                    renderMemoryCounters(data.memory_stats);
                }
                loadCustomerPicker();
                checkEscalationsBadge();
                showToast('Demo data reloaded successfully', 'success');
            } catch (err) {
                console.error('Error reseeding demo data:', err);
                showToast('Failed to reload demo data: ' + err.message, 'danger');
            }
        }
    });
});

// Clear all memory button
document.getElementById('btn-clear-memory')?.addEventListener('click', () => {
    showConfirmDialog({
        title: 'Clear All Memory',
        subTitle: 'Permanent deletion of local database records',
        message: 'Are you sure you want to clear all memory? All customer records, tickets, and associated conversation history will be permanently deleted.',
        confirmText: 'Clear Memory',
        isDanger: true,
        onConfirm: async () => {
            try {
                showToast('Clearing all memory...', 'info', 2000);
                const res = await fetch(`${API_URL}/admin/clear-memory`, { method: 'POST' });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                if (data.memory_stats) {
                    renderMemoryCounters(data.memory_stats);
                }
                clearChat();
                currentCustomerId = null;
                deselectAllCustomers();
                loadCustomerPicker();
                checkEscalationsBadge();
                showToast('All memory cleared', 'danger');
            } catch (err) {
                console.error('Error clearing memory:', err);
                showToast('Failed to clear memory: ' + err.message, 'danger');
            }
        }
    });
});

// ─── Knowledge Base Page Logic ───────────────────────────────────
let allKbArticles = [];
let currentKbCategory = 'All';
let kbSearchDebounceTimer = null;

async function loadKnowledgePage() {
    try {
        const queryParams = new URLSearchParams();
        const searchInput = document.getElementById('kb-search-input');
        const q = searchInput ? searchInput.value.trim() : '';

        if (q) queryParams.set('q', q);
        if (currentKbCategory && currentKbCategory !== 'All') {
            queryParams.set('category', currentKbCategory);
        }

        const url = `${API_URL}/kb${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        allKbArticles = await res.json();

        // Update counts
        updateKbCategoryCounts();
        renderKbGrid(allKbArticles);

        // Check if URL has ?id= to open specific article
        const urlParams = new URLSearchParams(window.location.search);
        const articleId = urlParams.get('id');
        if (articleId) {
            openKbArticle(articleId);
        }
    } catch (err) {
        console.error('Error loading knowledge base:', err);
    }
}

async function updateKbCategoryCounts() {
    try {
        const searchInput = document.getElementById('kb-search-input');
        const q = searchInput ? searchInput.value.trim() : '';
        const url = `${API_URL}/kb${q ? '?q=' + encodeURIComponent(q) : ''}`;
        const res = await fetch(url);
        if (!res.ok) return;
        const fullList = await res.json();

        const totalEl = document.getElementById('kb-total-badge');
        if (totalEl) totalEl.textContent = `${fullList.length} article${fullList.length === 1 ? '' : 's'}`;

        const counts = { All: fullList.length, Performance: 0, Billing: 0, Sync: 0, Account: 0 };
        fullList.forEach(a => {
            const cat = a.category;
            if (counts[cat] !== undefined) counts[cat]++;
        });

        document.getElementById('kb-count-all') && (document.getElementById('kb-count-all').textContent = counts.All);
        document.getElementById('kb-count-performance') && (document.getElementById('kb-count-performance').textContent = counts.Performance);
        document.getElementById('kb-count-billing') && (document.getElementById('kb-count-billing').textContent = counts.Billing);
        document.getElementById('kb-count-sync') && (document.getElementById('kb-count-sync').textContent = counts.Sync);
        document.getElementById('kb-count-account') && (document.getElementById('kb-count-account').textContent = counts.Account);
    } catch(err) {
        console.error('Error updating KB counts:', err);
    }
}

function renderKbGrid(articles) {
    const grid = document.getElementById('kb-articles-grid');
    const emptyState = document.getElementById('kb-empty-state');
    if (!grid) return;

    grid.innerHTML = '';

    if (!articles || articles.length === 0) {
        if (emptyState) emptyState.classList.remove('hidden');
        return;
    }

    if (emptyState) emptyState.classList.add('hidden');

    articles.forEach(art => {
        const card = document.createElement('div');
        card.className = 'kb-card';
        card.dataset.id = art.id;

        const catClass = (art.category || 'performance').toLowerCase();

        card.innerHTML = `
            <div class="kb-card-top">
                <span class="kb-cat-pill ${catClass}">${escapeHTML(art.category)}</span>
                <span class="kb-card-arrow">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                </span>
            </div>
            <h3 class="kb-card-title">${escapeHTML(art.title)}</h3>
            <p class="kb-card-summary">${escapeHTML(art.summary)}</p>
            <div class="kb-card-footer">
                <span class="kb-used-counter">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    Used in ${art.used_count || 0} chats
                </span>
                <span class="kb-updated-date">${art.updated_at ? art.updated_at : 'Recently'}</span>
            </div>
        `;

        card.addEventListener('click', () => {
            openKbArticle(art.id);
        });

        grid.appendChild(card);
    });
}

function formatArticleBody(text) {
    if (!text) return '';
    let html = escapeHTML(text);

    // Headers
    html = html.replace(/### (.*?)(?:<br>|\n|$)/g, '<h3>$1</h3>');
    html = html.replace(/## (.*?)(?:<br>|\n|$)/g, '<h2>$1</h2>');

    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // List items
    html = html.replace(/(?:^|\n)- (.*?)(?=\n|$)/g, '<li>$1</li>');
    html = html.replace(/(?:^|\n)\d+\. (.*?)(?=\n|$)/g, '<li>$1</li>');

    // Paragraph breaks
    html = html.replace(/\n\n/g, '<br><br>');

    return html;
}

async function openKbArticle(articleId) {
    const overlay = document.getElementById('kb-side-panel-overlay');
    if (!overlay) return;

    try {
        const res = await fetch(`${API_URL}/kb/${articleId}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const art = await res.json();

        const catEl = document.getElementById('kb-panel-category');
        const updatedEl = document.getElementById('kb-panel-updated');
        const titleEl = document.getElementById('kb-panel-title');
        const summaryEl = document.getElementById('kb-panel-summary');
        const contentEl = document.getElementById('kb-panel-content');
        const usedEl = document.getElementById('kb-panel-used-text');

        if (catEl) {
            catEl.textContent = art.category;
            catEl.className = `kb-cat-pill ${(art.category || 'performance').toLowerCase()}`;
        }
        if (updatedEl) updatedEl.textContent = `Last updated: ${art.updated_at || 'Recent'}`;
        if (titleEl) titleEl.textContent = art.title;
        if (summaryEl) summaryEl.textContent = art.summary;
        if (contentEl) contentEl.innerHTML = formatArticleBody(art.body);
        if (usedEl) usedEl.textContent = `Used in ${art.used_count || 0} chats`;

        // Configure copy button
        const copyBtn = document.getElementById('kb-panel-copy-link-btn');
        if (copyBtn) {
            copyBtn.onclick = () => {
                const link = `${window.location.origin}/console/knowledge?id=${art.id}`;
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(link).then(() => {
                        showToast('Article link copied to clipboard', 'success');
                    }).catch(() => {
                        showToast('Link copied: ' + link, 'info');
                    });
                } else {
                    showToast('Link: ' + link, 'info');
                }
            };
        }

        overlay.classList.remove('hidden');
    } catch(err) {
        console.error('Failed to load article:', err);
        showToast('Error loading article', 'danger');
    }
}

function closeKbArticle() {
    const overlay = document.getElementById('kb-side-panel-overlay');
    if (overlay) overlay.classList.add('hidden');
}

// Side panel close triggers
document.getElementById('kb-panel-close-btn')?.addEventListener('click', closeKbArticle);
document.getElementById('kb-side-panel-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'kb-side-panel-overlay') {
        closeKbArticle();
    }
});
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeKbArticle();
    }
});

// Category Chips click
document.querySelectorAll('#kb-category-chips .filter-chip').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('#kb-category-chips .filter-chip').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentKbCategory = btn.dataset.category || 'All';
        loadKnowledgePage();
    });
});

// Search input handling
const kbSearchInput = document.getElementById('kb-search-input');
const kbSearchClear = document.getElementById('kb-search-clear');

if (kbSearchInput) {
    kbSearchInput.addEventListener('input', () => {
        const val = kbSearchInput.value;
        if (kbSearchClear) {
            kbSearchClear.classList.toggle('hidden', val.length === 0);
        }
        clearTimeout(kbSearchDebounceTimer);
        kbSearchDebounceTimer = setTimeout(() => {
            loadKnowledgePage();
        }, 220);
    });
}

if (kbSearchClear) {
    kbSearchClear.addEventListener('click', () => {
        if (kbSearchInput) {
            kbSearchInput.value = '';
            kbSearchClear.classList.add('hidden');
            loadKnowledgePage();
            kbSearchInput.focus();
        }
    });
}

// Reset filters button in empty state
document.getElementById('kb-empty-reset-btn')?.addEventListener('click', () => {
    if (kbSearchInput) kbSearchInput.value = '';
    if (kbSearchClear) kbSearchClear.classList.add('hidden');
    currentKbCategory = 'All';
    document.querySelectorAll('#kb-category-chips .filter-chip').forEach(b => {
        b.classList.toggle('active', b.dataset.category === 'All');
    });
    loadKnowledgePage();
});

// ─── Routing & Init ─────────────────────────────────────────────
function handleRouting() {
    const pathname = window.location.pathname.toLowerCase();
    const hash = window.location.hash.replace('#', '').toLowerCase();

    // Check pathname first (e.g. /console/chat, /console/customers, /console/settings, /console/knowledge, etc.)
    if (pathname.includes('/console/chat') || pathname.endsWith('/chat')) return switchPage('livechat');
    if (pathname.includes('/console/customers') || pathname.endsWith('/customers')) return switchPage('customers');
    if (pathname.includes('/console/tickets') || pathname.endsWith('/tickets')) return switchPage('tickets');
    if (pathname.includes('/console/escalations') || pathname.endsWith('/escalations')) return switchPage('escalations');
    if (pathname.includes('/console/analytics') || pathname.endsWith('/analytics')) return switchPage('analytics');
    if (pathname.includes('/console/settings') || pathname.endsWith('/settings')) return switchPage('settings');
    if (pathname.includes('/console/knowledge') || pathname.endsWith('/knowledge')) return switchPage('knowledge');


    // Check hash
    const map = {
        'home': 'home',
        'chat': 'livechat',
        'livechat': 'livechat',
        'customers': 'customers',
        'tickets': 'tickets',
        'escalations': 'escalations',
        'analytics': 'analytics',
        'knowledge': 'knowledge',
        'settings': 'settings'
    };

    // Default to 'home' for /console or empty hash
    const target = map[hash] || 'home';
    switchPage(target);
}

window.addEventListener('hashchange', handleRouting);

// Initial Load
document.addEventListener('DOMContentLoaded', () => {
    loadCustomerPicker();
    checkEscalationsBadge();
    handleRouting();
});

// Also run immediately if script executes after DOM is ready
loadCustomerPicker();
checkEscalationsBadge();
handleRouting();

