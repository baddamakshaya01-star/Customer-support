// ─── RecallDesk AI — Console App ───────────────────────────────
const API_URL = 'http://localhost:8000';

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

    if (page === 'analytics') loadAnalytics();
}

// ─── Theme Toggle ───────────────────────────────────────────────
document.getElementById('csb-theme-toggle')?.addEventListener('click', () => {
    document.body.classList.toggle('light-mode');
    // In console we stay dark by default; this is a stub for future light mode
});

// ─── Customer Selection ─────────────────────────────────────────
customerItems.forEach(item => {
    item.addEventListener('click', () => selectCustomer(item.dataset.id));
});

lookupBtn.addEventListener('click', () => {
    const val = lookupInput.value.trim();
    if (!val) return;
    // Try to match by id or email fragment
    let matched = null;
    document.querySelectorAll('.customer-item').forEach(item => {
        const id = item.dataset.id;
        const email = item.querySelector('.ci-email')?.textContent || '';
        const name = item.querySelector('.ci-name')?.textContent || '';
        if (id === val || email.includes(val) || name.toLowerCase().includes(val.toLowerCase())) {
            matched = id;
        }
    });
    if (matched) {
        selectCustomer(matched);
    } else {
        showSystemMsg(`No customer found for "${val}"`);
    }
});

lookupInput.addEventListener('keydown', (e) => {
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

async function appendAgentMsg(text, memoryCount) {
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
        await appendAgentMsg(data.response, memCount);

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

// ─── Analytics ──────────────────────────────────────────────────
async function loadAnalytics() {
    const customers = ['cust-101','cust-102','cust-103','cust-104','cust-105'];
    let totalTickets = 0, totalFrustration = 0, escalations = 0, memories = 0;
    const allFrustrations = [];
    const issueCategories = {};

    document.getElementById('stat-num-tickets').textContent = '…';
    document.getElementById('stat-num-frustration').textContent = '…';
    document.getElementById('stat-num-esc').textContent = '…';
    document.getElementById('stat-num-memories').textContent = '…';

    const results = await Promise.allSettled(
        customers.map(id => fetch(`${API_URL}/customers/${id}/memory`).then(r => r.json()))
    );

    results.forEach((result, i) => {
        if (result.status !== 'fulfilled') return;
        const data = result.value;
        if (!data.customer) return;

        memories++;
        const score = data.customer.frustration_score || 0;
        totalFrustration += score;
        allFrustrations.push({ id: customers[i], score });

        const ticks = data.tickets || [];
        totalTickets += ticks.length;
        ticks.forEach(t => {
            const cat = categorizeIssue(t.issue);
            issueCategories[cat] = (issueCategories[cat] || 0) + 1;
        });

        const facts = data.memory_facts || [];
        const hasEsc = facts.some(f => f.type?.toLowerCase().includes('escalat'));
        if (hasEsc) escalations++;
    });

    const validCount = results.filter(r => r.status === 'fulfilled' && r.value?.customer).length || 1;
    const avgFrustration = totalFrustration / validCount;
    const escRate = validCount > 0 ? Math.round((escalations / validCount) * 100) : 0;

    document.getElementById('stat-num-tickets').textContent    = totalTickets || '0';
    document.getElementById('stat-num-frustration').textContent = avgFrustration.toFixed(1);
    document.getElementById('stat-num-esc').textContent         = `${escRate}%`;
    document.getElementById('stat-num-memories').textContent    = memories;

    renderFrustrationChart(allFrustrations);
    renderCategoryChart(issueCategories);
}

function categorizeIssue(issue) {
    if (!issue) return 'Other';
    const lower = issue.toLowerCase();
    if (lower.includes('freeze') || lower.includes('crash')) return 'Crashes / Freezes';
    if (lower.includes('login') || lower.includes('auth'))  return 'Login / Auth';
    if (lower.includes('slow') || lower.includes('performance')) return 'Performance';
    if (lower.includes('install') || lower.includes('setup'))    return 'Installation';
    if (lower.includes('billing') || lower.includes('payment'))  return 'Billing';
    return 'Other';
}

function renderFrustrationChart(data) {
    const frustLine = document.getElementById('frust-line');
    const frustFill = document.getElementById('frust-fill');
    const frustEmpty = document.getElementById('frust-empty');

    if (!data || data.length === 0) {
        frustEmpty.style.display = 'flex';
        return;
    }
    frustEmpty.style.display = 'none';

    const W = 400, H = 120, pad = 10;
    const points = data.map((d, i) => {
        const x = pad + (i / Math.max(data.length - 1, 1)) * (W - pad * 2);
        const y = H - pad - ((d.score / 5) * (H - pad * 2));
        return [x, y];
    });

    const ptStr = points.map(p => p.join(',')).join(' ');
    frustLine.setAttribute('points', ptStr);

    // Area fill path
    const first = points[0], last = points[points.length - 1];
    const fillPath = `M${first[0]},${H - pad} L${ptStr.split(' ').map(p => p).join(' L')} L${last[0]},${H - pad} Z`;
    frustFill.setAttribute('d', fillPath);
}

function renderCategoryChart(categories) {
    const catList = document.getElementById('category-list');
    const catEmpty = document.getElementById('cat-empty');

    const entries = Object.entries(categories);
    if (entries.length === 0) {
        catEmpty.style.display = 'flex';
        return;
    }
    catEmpty.style.display = 'none';

    const max = Math.max(...entries.map(([, v]) => v));
    const colors = ['#4F46E5','#06b6d4','#22c55e','#f59e0b','#ef4444','#8b5cf6'];

    catList.innerHTML = entries.sort((a, b) => b[1] - a[1]).map(([cat, count], i) => `
        <div class="cat-item">
            <div class="cat-item-header">
                <span>${escapeHTML(cat)}</span>
                <span>${count} ticket${count !== 1 ? 's' : ''}</span>
            </div>
            <div class="cat-item-bar-wrap">
                <div class="cat-item-bar" style="width:${(count / max) * 100}%;background:${colors[i % colors.length]}"></div>
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

// ─── Keyframes not in CSS (spin for loading) ────────────────────
const spinStyle = document.createElement('style');
spinStyle.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
document.head.appendChild(spinStyle);

// ─── Init ───────────────────────────────────────────────────────
// Show livechat page by default (already active via HTML)
