document.addEventListener('DOMContentLoaded', () => {
    initSlider();
    initMobileNavClose();
    initInstagramSticky();
});

// ─── DYNAMIC SLIDER ──────────────────────────────────────────────────────────

async function initSlider() {
    const container = document.getElementById('slider-bg');
    if (!container) return;

    let config = { slides: [], interval: 5000 };
    try {
        const res = await fetch('content/slider.json');
        if (!res.ok) throw new Error('fetch failed');
        config = await res.json();
    } catch {
        // Keep whatever fallback HTML was already in the container
        return;
    }

    const { slides = [], interval = 5000 } = config;
    if (slides.length === 0) return;

    container.innerHTML = slides
        .map((s, i) =>
            `<div class="slide${i === 0 ? ' active' : ''}"
                  style="background-image:linear-gradient(rgba(0,0,0,0.5),rgba(0,0,0,0.5)),url('${s.src}')"
                  aria-label="${s.alt || ''}"></div>`
        )
        .join('');

    if (slides.length <= 1) return;

    let current = 0;
    setInterval(() => {
        const els = container.querySelectorAll('.slide');
        els[current].classList.remove('active');
        current = (current + 1) % els.length;
        els[current].classList.add('active');
    }, interval);
}

// ─── INSTAGRAM STICKY: click-toggle for touch devices ────────────────────────

function initInstagramSticky() {
    const trigger = document.getElementById('ig-trigger');
    const sticky  = document.getElementById('ig-sticky');
    if (!trigger || !sticky) return;
    trigger.addEventListener('click', function (e) {
        e.stopPropagation();
        sticky.classList.toggle('active');
    });
    document.addEventListener('click', function () {
        sticky.classList.remove('active');
    });
}

// ─── MOBILE NAV: close on link click ─────────────────────────────────────────

function initMobileNavClose() {
    const toggle = document.getElementById('nav-toggle');
    if (!toggle) return;
    document.querySelectorAll('.mobile-menu a').forEach(a =>
        a.addEventListener('click', () => { toggle.checked = false; })
    );
}
