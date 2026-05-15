document.addEventListener('DOMContentLoaded', () => {
    initSlider();
    initMobileNavClose();
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

    container.innerHTML = slides.map((s, i) => {
        const active = i === 0 ? ' active' : '';
        if (s.type === 'video') {
            return `<div class="slide${active}">
                <video autoplay muted loop playsinline>
                    <source src="${s.src}" type="video/mp4">
                </video>
            </div>`;
        }
        return `<div class="slide${active}"
                     style="background-image:linear-gradient(rgba(0,0,0,0.5),rgba(0,0,0,0.5)),url('${s.src}')"
                     aria-label="${s.alt || ''}"></div>`;
    }).join('');

    if (slides.length <= 1) return;

    let current = 0;
    setInterval(() => {
        const els = container.querySelectorAll('.slide');
        els[current].classList.remove('active');
        current = (current + 1) % els.length;
        els[current].classList.add('active');
    }, interval);
}

// ─── MOBILE NAV: close on link click ─────────────────────────────────────────

function initMobileNavClose() {
    const toggle = document.getElementById('nav-toggle');
    if (!toggle) return;
    document.querySelectorAll('.mobile-menu a').forEach(a =>
        a.addEventListener('click', () => { toggle.checked = false; })
    );
}
