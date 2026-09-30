// ─── RecallDesk AI — Landing Page ──────────────────────────────

// ─── Theme Toggle ───────────────────────────────────────────────
const themeToggle = document.getElementById('theme-toggle');
const body = document.body;

// Load saved preference
const savedTheme = localStorage.getItem('recalldesk-theme') || 'light';
body.className = savedTheme === 'dark' ? 'dark-theme' : 'light-theme';

themeToggle?.addEventListener('click', () => {
    const isDark = body.classList.toggle('dark-theme');
    body.classList.toggle('light-theme', !isDark);
    localStorage.setItem('recalldesk-theme', isDark ? 'dark' : 'light');
});

// ─── Smooth Scroll for nav links ────────────────────────────────
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        if (href && href.startsWith('#')) {
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});

// ─── Navbar shadow on scroll ────────────────────────────────────
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
    if (window.scrollY > 10) {
        navbar.style.boxShadow = '0 4px 24px rgba(0,0,0,0.08)';
    } else {
        navbar.style.boxShadow = 'none';
    }
}, { passive: true });

// ─── Intersection Observer for fade-in animations ───────────────
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, { threshold: 0.1 });

// Animate feature cards and steps on scroll
document.querySelectorAll('.feature-card, .step, .memory-chip-big').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    observer.observe(el);
});
