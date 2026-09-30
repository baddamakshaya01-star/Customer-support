// ─── Config ────────────────────────────────────────────────────
const API_URL = 'http://localhost:8000';

// ─── DOM Refs ──────────────────────────────────────────────────
const customerSelect    = document.getElementById('customer-select');
const chatHistory       = document.getElementById('chat-history');
const messageInput      = document.getElementById('message-input');
const sendBtn           = document.getElementById('send-btn');
const charCount         = document.getElementById('char-count');
const escalationBanner  = document.getElementById('escalation-banner');
const escalationModal   = document.getElementById('escalation-modal');
const escalationSummary = document.getElementById('escalation-summary');
const closeModal        = document.getElementById('close-modal');
const closeModalBtn     = document.getElementById('close-modal-btn');
const sidebarToggle     = document.getElementById('sidebar-toggle');
const sidebar           = document.getElementById('sidebar');
const welcomeState      = document.getElementById('welcome-state');
const headerCustomerName = document.getElementById('header-customer-name');

// Sidebar elements
const profileAvatar      = document.getElementById('profile-avatar');
const profileName        = document.getElementById('profile-name');
const profilePlan        = document.getElementById('profile-plan');
const profileCard        = document.getElementById('profile-card');
const envSection         = document.getElementById('env-section');
const envGrid            = document.getElementById('env-grid');
const frustrationSection = document.getElementById('frustration-section');
const meterFill          = document.getElementById('meter-fill');
const frustrationValue   = document.getElementById('frustration-value');
const factsSection       = document.getElementById('facts-section');
const factsList          = document.getElementById('facts-list');
const factsCount         = document.getElementById('facts-count');
const ticketsSection     = document.getElementById('tickets-section');
const ticketsList        = document.getElementById('tickets-list');
const sidebarLoading     = document.getElementById('sidebar-loading');

// ─── State ─────────────────────────────────────────────────────
let currentCustomerId = customerSelect.value;
let previousFactCount = 0;

// ─── Sidebar Toggle ────────────────────────────────────────────
sidebarToggle.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
});

// ─── Customer Select ───────────────────────────────────────────
customerSelect.addEventListener('change', (e) => {
    currentCustomerId = e.target.value;
    previousFactCount = 0;
    clearChat();
    loadCustomerMemory(currentCustomerId);
});

// ─── Char Counter ──────────────────────────────────────────────
messageInput.addEventListener('input', () => {
    const len = messageInput.value.length;
    charCount.textContent = `${len} / 2000`;
    // Auto-resize textarea
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 160) + 'px';
});

// ─── Load Memory ───────────────────────────────────────────────
async function loadCustomerMemory(customerId) {
    showSidebarLoading(true);
    try {
        const res = await fetch(`${API_URL}/customers/${customerId}/memory`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        renderSidebar(data);
    } catch (err) {
        showSidebarError(err.message);
    } finally {
        showSidebarLoading(false);
    }
}

function showSidebarLoading(show) {
    sidebarLoading.style.display = show ? 'flex' : 'none';
    if (show) {
        envSection.style.display = 'none';
        frustrationSection.style.display = 'none';
        factsSection.style.display = 'none';
        ticketsSection.style.display = 'none';
    }
}

function showSidebarError(msg) {
    sidebarLoading.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <span style="color:#ef4444">Error: ${msg}</span>`;
    sidebarLoading.style.display = 'flex';
}

function renderSidebar(data) {
    const { customer, tickets, memory_facts } = data;

    // ── Profile Card
    const initials = customer.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    profileAvatar.textContent = initials;
    profileName.textContent = customer.name;
    profilePlan.textContent = `${customer.plan} Plan · ${customer.email || ''}`;
    headerCustomerName.textContent = `Chatting with ${customer.name}`;

    // ── Environment
    envGrid.innerHTML = `
        ${makeEnvChip('OS', customer.os)}
        ${makeEnvChip('Version', customer.product_version)}
        ${makeEnvChip('Device', customer.device)}
        ${makeEnvChip('Plan', customer.plan)}
    `;
    envSection.style.display = 'block';

    // ── Frustration Meter
    const score = customer.frustration_score || 0;
    const pct = (score / 5) * 100;
    let meterColor = '#10b981'; // green
    if (score >= 4) meterColor = '#ef4444';
    else if (score >= 3) meterColor = '#f59e0b';
    else if (score >= 2) meterColor = '#06b6d4';
    meterFill.style.width = `${pct}%`;
    meterFill.style.background = `linear-gradient(90deg, ${meterColor}88, ${meterColor})`;
    frustrationValue.textContent = `${score.toFixed(1)} / 5.0`;
    frustrationSection.style.display = 'block';

    // ── Memory Facts
    if (memory_facts.length > 0) {
        factsList.innerHTML = '';
        memory_facts.forEach((f, idx) => {
            const isNew = idx >= previousFactCount && previousFactCount > 0;
            const typeKey = f.type?.toLowerCase().replace(/\s+/g, '_') || 'fact';
            const card = document.createElement('div');
            card.className = `fact-card${isNew ? ' new-fact' : ''}`;
            card.innerHTML = `
                <span class="fact-type-badge ${typeKey}">${f.type?.replace(/_/g, ' ').toUpperCase() || 'FACT'}</span><br>
                ${escapeHTML(f.description)}
            `;
            factsList.appendChild(card);
        });
        factsCount.textContent = memory_facts.length;
        factsSection.style.display = 'block';
    }
    previousFactCount = memory_facts.length;

    // ── Tickets
    if (tickets.length > 0) {
        ticketsList.innerHTML = tickets.slice(0, 4).map(t => `
            <div class="ticket-card">
                <div class="ticket-issue">${escapeHTML(t.issue)}</div>
                <div class="ticket-status">${escapeHTML(t.status)}</div>
            </div>
        `).join('');
        ticketsSection.style.display = 'block';
    }
}

function makeEnvChip(label, value) {
    return `<div class="env-chip">
        <div class="env-chip-label">${label}</div>
        <div class="env-chip-value" title="${escapeHTML(value || '—')}">${escapeHTML(value || '—')}</div>
    </div>`;
}

// ─── Chat ───────────────────────────────────────────────────────
function clearChat() {
    chatHistory.innerHTML = `
        <div class="welcome-state" id="welcome-state">
            <div class="welcome-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/>
                    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/>
                </svg>
            </div>
            <h2>AURA is ready</h2>
            <p>Memory loaded. Start chatting below.</p>
        </div>
    `;
    escalationBanner.classList.add('hidden');
}

function appendMessage(text, role, animate = false) {
    // Remove welcome state on first real message
    const ws = document.getElementById('welcome-state');
    if (ws) ws.remove();

    const wrapper = document.createElement('div');
    wrapper.className = `message ${role}`;

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (role === 'system') {
        wrapper.innerHTML = `<div class="message-bubble">${escapeHTML(text)}</div>`;
        chatHistory.appendChild(wrapper);
        scrollToBottom();
        return wrapper;
    }

    const avatarText = role === 'agent' ? '🧠' : '👤';
    const avatarEl = `<div class="message-avatar">${avatarText}</div>`;
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';

    const timeEl = `<div class="message-time">${time}</div>`;
    wrapper.innerHTML = avatarEl;
    wrapper.appendChild(bubble);

    if (role === 'user') {
        bubble.innerHTML = escapeHTML(text).replace(/\n/g, '<br>');
        wrapper.insertAdjacentHTML('beforeend', timeEl);
    }

    chatHistory.appendChild(wrapper);
    scrollToBottom();
    return { wrapper, bubble, timeEl };
}

async function addMessage(text, role, animate = false) {
    if (role === 'system' || role === 'user') {
        appendMessage(text, role);
        return;
    }

    // Agent message with optional typewriter
    const ws = document.getElementById('welcome-state');
    if (ws) ws.remove();

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const wrapper = document.createElement('div');
    wrapper.className = 'message agent';

    const avatarEl = document.createElement('div');
    avatarEl.className = 'message-avatar';
    avatarEl.textContent = '🧠';

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';

    const timeDiv = document.createElement('div');
    timeDiv.className = 'message-time';
    timeDiv.textContent = time;

    wrapper.appendChild(avatarEl);
    wrapper.appendChild(bubble);
    chatHistory.appendChild(wrapper);
    chatHistory.appendChild(timeDiv);
    scrollToBottom();

    if (animate) {
        let displayed = '';
        for (let i = 0; i < text.length; i++) {
            displayed += text[i];
            bubble.innerHTML = displayed.replace(/\n/g, '<br>');
            scrollToBottom();
            await sleep(12);
        }
    } else {
        bubble.innerHTML = escapeHTML(text).replace(/\n/g, '<br>');
        scrollToBottom();
    }
}

function showTypingIndicator() {
    const ws = document.getElementById('welcome-state');
    if (ws) ws.remove();

    const wrapper = document.createElement('div');
    wrapper.className = 'message agent';
    wrapper.id = 'typing-indicator';

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = '🧠';

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';

    wrapper.appendChild(avatar);
    wrapper.appendChild(bubble);
    chatHistory.appendChild(wrapper);
    scrollToBottom();
}

function removeTypingIndicator() {
    const el = document.getElementById('typing-indicator');
    if (el) el.remove();
}

// ─── Send Message ──────────────────────────────────────────────
async function sendMessage() {
    const text = messageInput.value.trim();
    if (!text) return;

    // Reset input
    messageInput.value = '';
    messageInput.style.height = 'auto';
    charCount.textContent = '0 / 2000';
    messageInput.disabled = true;
    sendBtn.disabled = true;

    // Render user bubble
    appendMessage(text, 'user');

    // Show typing
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
        await addMessage(data.response, 'agent', true);

        // Escalation
        if (data.escalate) {
            escalationBanner.classList.remove('hidden');
            escalationSummary.textContent = data.handoff_summary || 'Escalation required.';
            escalationModal.classList.remove('hidden');
        }

        // Silently refresh memory panel
        loadCustomerMemory(currentCustomerId);

    } catch (err) {
        removeTypingIndicator();
        addMessage(`⚠️ Error: ${err.message}. Please check the backend is running.`, 'agent');
    } finally {
        messageInput.disabled = false;
        sendBtn.disabled = false;
        messageInput.focus();
    }
}

// ─── Events ─────────────────────────────────────────────────────
sendBtn.addEventListener('click', sendMessage);

messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

closeModal.addEventListener('click', () => escalationModal.classList.add('hidden'));
closeModalBtn.addEventListener('click', () => escalationModal.classList.add('hidden'));

// Close modal on overlay click
escalationModal.addEventListener('click', (e) => {
    if (e.target === escalationModal) escalationModal.classList.add('hidden');
});

// ─── Helpers ───────────────────────────────────────────────────
function scrollToBottom() {
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

function escapeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ─── Init ──────────────────────────────────────────────────────
loadCustomerMemory(currentCustomerId);
