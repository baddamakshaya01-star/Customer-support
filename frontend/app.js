const API_URL = 'http://localhost:8000';

const customerSelect = document.getElementById('customer-select');
const memoryContent = document.getElementById('memory-content');
const chatHistory = document.getElementById('chat-history');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const escalationBanner = document.getElementById('escalation-banner');
const escalationModal = document.getElementById('escalation-modal');
const escalationSummary = document.getElementById('escalation-summary');
const closeModalBtn = document.getElementById('close-modal');

let currentCustomerId = customerSelect.value;
let previousFactCount = 0; // Tracks facts to animate new ones

// Load customer memory on selection change
customerSelect.addEventListener('change', (e) => {
    currentCustomerId = e.target.value;
    previousFactCount = 0; // reset for new customer
    loadCustomerMemory(currentCustomerId);
    clearChat();
});

// Load memory initially
loadCustomerMemory(currentCustomerId);

async function loadCustomerMemory(customerId) {
    try {
        if (previousFactCount === 0) {
            memoryContent.innerHTML = '<div class="loading-state">Loading memory...</div>';
        }
        const response = await fetch(`${API_URL}/customers/${customerId}/memory`);
        if (!response.ok) throw new Error('Failed to load memory');
        const data = await response.json();
        renderMemory(data);
    } catch (err) {
        memoryContent.innerHTML = `<div class="loading-state" style="color:var(--danger)">Error loading memory: ${err.message}</div>`;
    }
}

function renderMemory(data) {
    const { customer, tickets, memory_facts } = data;
    
    // Frustration Badge Color
    let frClass = '';
    if (customer.frustration_score >= 4) frClass = 'danger';
    else if (customer.frustration_score >= 3) frClass = 'warning';
    
    let html = `
        <div class="info-section">
            <h3>Profile & Environment</h3>
            <div class="data-card">
                <strong>${customer.name}</strong> (${customer.plan} Plan)<br>
                <div style="margin-top:8px; font-size:0.85rem; color:var(--text-muted)">
                    OS: ${customer.os}<br>
                    Version: ${customer.product_version}<br>
                    Device: ${customer.device}
                </div>
            </div>
        </div>
        
        <div class="info-section">
            <h3>Sentiment</h3>
            <div class="data-card">
                Frustration Score: <span class="badge ${frClass}">${customer.frustration_score.toFixed(1)} / 5.0</span>
            </div>
        </div>
    `;

    if (memory_facts.length > 0) {
        html += `<div class="info-section"><h3>Known Facts</h3>`;
        memory_facts.forEach((f, idx) => {
            const highlightClass = (idx >= previousFactCount && previousFactCount > 0) ? 'highlight' : '';
            html += `<div class="data-card ${highlightClass}" style="margin-bottom:8px">
                <span class="badge" style="margin-bottom:4px; font-size:0.7rem">${f.type.replace('_', ' ').toUpperCase()}</span><br>
                ${f.description}
            </div>`;
        });
        html += `</div>`;
    }

    if (tickets.length > 0) {
        html += `<div class="info-section"><h3>Recent Tickets</h3>`;
        tickets.slice(0,3).forEach(t => {
            html += `<div class="data-card" style="margin-bottom:8px">
                <strong>${t.issue}</strong><br>
                <span style="color:var(--text-muted); font-size:0.8rem">Status: ${t.status}</span>
            </div>`;
        });
        html += `</div>`;
    }

    memoryContent.innerHTML = html;
    previousFactCount = memory_facts.length; // update count for next reload
}

function clearChat() {
    chatHistory.innerHTML = `
        <div class="message system">
            <p>Agent connected. Ready to assist.</p>
        </div>
    `;
    escalationBanner.classList.add('hidden');
}

async function addMessage(text, role, animate=false) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${role}`;
    chatHistory.appendChild(msgDiv);

    if (animate && role === 'agent') {
        const p = document.createElement('p');
        msgDiv.appendChild(p);
        
        // Typewriter effect
        for (let i = 0; i < text.length; i++) {
            p.innerHTML = text.substring(0, i + 1).replace(/\n/g, '<br>');
            chatHistory.scrollTop = chatHistory.scrollHeight;
            await new Promise(r => setTimeout(r, 15)); // 15ms per character
        }
    } else {
        msgDiv.innerHTML = `<p>${text.replace(/\n/g, '<br>')}</p>`;
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }
}

async function sendMessage() {
    const text = messageInput.value.trim();
    if (!text) return;

    // UI Updates
    addMessage(text, 'user');
    messageInput.value = '';
    messageInput.disabled = true;
    sendBtn.disabled = true;
    
    // Show typing indicator
    const typingDiv = document.createElement('div');
    typingDiv.className = `message agent`;
    typingDiv.id = 'typing-indicator';
    typingDiv.innerHTML = `<div class="typing-dots"><span></span><span></span><span></span></div>`;
    chatHistory.appendChild(typingDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;

    try {
        const response = await fetch(`${API_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                customer_id: currentCustomerId,
                message: text
            })
        });
        
        if (!response.ok) throw new Error('API Error');
        const data = await response.json();
        
        // Remove typing indicator
        const indicator = document.getElementById('typing-indicator');
        if (indicator) indicator.remove();
        
        // Add agent response with typing animation
        await addMessage(data.response, 'agent', true);
        
        // Handle Escalation
        if (data.escalate) {
            escalationBanner.classList.remove('hidden');
            escalationSummary.textContent = data.handoff_summary;
            escalationModal.classList.remove('hidden');
        }
        
        // Reload memory silently to show updated facts/frustration
        loadCustomerMemory(currentCustomerId);
        
    } catch (err) {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) indicator.remove();
        addMessage("Sorry, I encountered an error. Please try again.", 'agent');
    } finally {
        messageInput.disabled = false;
        sendBtn.disabled = false;
        messageInput.focus();
    }
}

sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

closeModalBtn.addEventListener('click', () => {
    escalationModal.classList.add('hidden');
});
